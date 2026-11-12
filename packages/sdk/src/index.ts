import type {
  Policy,
  PayeeReport,
  PaymentArgs,
  PaymentChallenge,
  PaymentRecord,
  PaymentResult,
  ReportedPayee,
  RequestStatus,
  WalletStatus,
} from './types.ts';

export type * from './types.ts';

export type GuardianAgentOptions = {
  /** The guardian contract, e.g. `guardian.gw-emmy.testnet`. */
  contractId: string;
  /** The agent account registered on the contract. */
  agentId: string;
  /**
   * Sends `request_payment` as the agent. Use `accountSigner(account)` with a near-api-js
   * Account holding a function-call key, or bring your own (a TEE, a KMS, a wallet). Keep it server-side.
   */
  signer?: Signer;
  /** Tried in order; the next one is used if one fails or times out. */
  rpcUrls?: string[];
  timeoutMs?: number;
};

export const TESTNET_RPCS = ['https://rpc.testnet.near.org', 'https://test.rpc.fastnear.com'];

export type FunctionCall = {
  contractId: string;
  methodName: string;
  args: Record<string, unknown>;
  gas: bigint;
  deposit: bigint;
};

/** The final execution outcome, as NEAR RPC returns it. */
export type FinalOutcome = {
  transaction?: { hash: string };
  transaction_outcome?: { id: string };
  status?: { SuccessValue?: string; Failure?: unknown } | string;
};

export type Signer = (call: FunctionCall) => Promise<FinalOutcome>;

/** Wraps a near-api-js (v6+) Account. Kept structural so the SDK has no dependencies. */
export function accountSigner(account: { callFunctionRaw(call: FunctionCall): Promise<unknown> }): Signer {
  return async (call) => (await account.callFunctionRaw(call)) as FinalOutcome;
}

const YOCTO = 10n ** 24n;

export function nearToYocto(near: string): bigint {
  const [whole, fraction = ''] = near.trim().split('.');
  return BigInt(whole || '0') * YOCTO + BigInt((fraction + '0'.repeat(24)).slice(0, 24));
}

const randomId = () => `agent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * The agent's side of a Guardian Wallet. It can only ask for payments; the contract decides.
 * Read methods need no key.
 */
export class GuardianAgent {
  readonly contractId: string;
  readonly agentId: string;
  private readonly signer?: Signer;
  private readonly rpcUrls: string[];
  private readonly timeoutMs: number;

  constructor(options: GuardianAgentOptions) {
    this.contractId = options.contractId;
    this.agentId = options.agentId;
    this.signer = options.signer;
    this.rpcUrls = [...new Set(options.rpcUrls?.length ? options.rpcUrls : TESTNET_RPCS)];
    this.timeoutMs = options.timeoutMs ?? 4000;
  }

  get canSign() {
    return Boolean(this.signer);
  }

  async view<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
    const result = await this.rpc<{ result?: number[]; error?: string }>('query', {
      request_type: 'call_function',
      finality: 'final',
      account_id: this.contractId,
      method_name: method,
      args_base64: btoa(JSON.stringify(args)),
    });
    if (result.error || !result.result) throw new Error(`${method}: ${result.error ?? 'no result'}`);
    return JSON.parse(new TextDecoder().decode(new Uint8Array(result.result)));
  }

  getStatus() {
    return this.view<WalletStatus>('get_wallet_status');
  }

  async getPolicy(): Promise<Policy> {
    const s = await this.getStatus();
    return {
      owner_id: s.owner_id,
      agent_id: s.agent_id,
      daily_limit: s.daily_limit,
      approval_threshold: s.approval_threshold,
      approved_payees: s.approved_payees,
      guards: s.guards,
      pending_rules: s.pending_rules,
    };
  }

  /** The blocklist entry for an account, or null if nobody has reported it. */
  getPayeeReport(accountId: string) {
    return this.view<PayeeReport | null>('get_payee_report', { account_id: accountId });
  }

  getReportedPayees(fromIndex = 0, limit = 50) {
    return this.view<ReportedPayee[]>('get_reported_payees', { from_index: fromIndex, limit });
  }

  getPayment(recordId: number) {
    return this.view<PaymentRecord | null>('get_payment', {
      record_id: recordId,
    });
  }

  /** Polls until the transfer for `recordId` has settled, or the timeout passes. */
  async waitForSettlement(recordId: number, timeoutMs = 25_000) {
    const end = Date.now() + timeoutMs;
    let record = await this.getPayment(recordId);
    while (record?.status === 'TRANSFERRING' && Date.now() < end) {
      await new Promise((r) => setTimeout(r, 1500));
      record = await this.getPayment(recordId);
    }
    return record;
  }

  async requestPayment({ receiverId, amount, memo = '', requestId = randomId() }: PaymentArgs): Promise<PaymentResult> {
    if (!this.signer) throw new Error('GuardianAgent needs a signer to request payments');
    const args = {
      request_id: requestId,
      receiver_id: receiverId,
      amount: BigInt(amount).toString(),
      memo,
    };
    const base = { requestId, recordId: null, reason: '', args };

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await this.signer({
          contractId: this.contractId,
          methodName: 'request_payment',
          args,
          gas: 50n * 10n ** 12n,
          deposit: 0n,
        });
        const txHash = result.transaction?.hash ?? result.transaction_outcome?.id;
        const status = typeof result.status === 'object' ? result.status : undefined;
        if (status?.Failure)
          return {
            ...base,
            status: null,
            txHash,
            error: JSON.stringify(status.Failure).slice(0, 200),
          };
        const raw = status?.SuccessValue ? atob(status.SuccessValue) : '';
        const outcome = raw
          ? (JSON.parse(raw) as {
              status: RequestStatus;
              record_id: number | null;
              reason: string;
            })
          : null;
        if (!outcome)
          return {
            ...base,
            status: null,
            txHash,
            error: 'empty result from the contract',
          };
        return {
          ...base,
          status: outcome.status,
          recordId: outcome.record_id,
          reason: outcome.reason,
          txHash,
        };
      } catch (e) {
        const message = String((e as Error).message ?? e);
        // Two requests at once can race for the key's nonce; one retry settles it.
        if (attempt === 0 && /nonce/i.test(message)) continue;
        const panic = message.match(/Smart contract panicked: ([^"\\]+)/);
        return {
          ...base,
          status: null,
          error: panic ? panic[1] : message.slice(0, 200),
        };
      }
    }
    return { ...base, status: null, error: 'could not send the transaction' };
  }

  /**
   * Fetches `url`; if it answers 402 with a Guardian payment challenge, pays it through the
   * contract and retries with `X-NEAR-Receipt-Tx`. Hooks let a caller log or veto each step.
   */
  async pay402(url: string, options: Pay402Options = {}): Promise<Pay402Result> {
    const fetchFn = options.fetch ?? fetch;
    const first = await fetchFn(url, { cache: 'no-store' });
    if (first.status !== 402) return { kind: 'free', response: first };

    const challenge = (await first.json()) as PaymentChallenge;
    const problem = challengeProblem(challenge, this.contractId, options);
    if (problem) return { kind: 'refused', challenge, reason: problem };
    if ((await options.onChallenge?.(challenge)) === false)
      return { kind: 'refused', challenge, reason: 'declined by onChallenge' };

    const memo = [...challenge.pay_with.memo_must_include, ...(options.memoTags ?? [])].join(' | ');
    const request: PaymentArgs = {
      receiverId: challenge.payee,
      amount: challenge.price_yocto,
      memo: truncateBytes(options.reason ? `${memo} | ${options.reason}` : memo, 256),
      requestId: randomId(),
    };
    await options.onRequest?.(request);
    const payment = await this.requestPayment(request);
    await options.onPayment?.(payment);
    if (payment.status !== 'APPROVED' || payment.recordId === null || !payment.txHash)
      return { kind: 'not-paid', challenge, payment };

    const record = await this.waitForSettlement(payment.recordId);
    await options.onSettled?.(record);
    if (record?.status !== 'COMPLETED') return { kind: 'not-paid', challenge, payment, record };

    const response = await fetchFn(url, {
      cache: 'no-store',
      headers: { 'X-NEAR-Receipt-Tx': payment.txHash, 'X-NEAR-Receipt-Signer': this.agentId },
    });
    return {
      kind: response.ok ? 'paid' : 'receipt-refused',
      challenge,
      payment,
      record,
      response,
    };
  }

  private async rpc<T>(method: string, params: unknown): Promise<T> {
    let last: unknown;
    for (const url of this.rpcUrls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          cache: 'no-store',
          signal: AbortSignal.timeout(this.timeoutMs),
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'guardian-sdk',
            method,
            params,
          }),
        });
        if (!res.ok) throw new Error(`RPC ${url} answered ${res.status}`);
        const body = await res.json();
        if (body.error) throw new Error(JSON.stringify(body.error));
        return body.result as T;
      } catch (e) {
        last = e;
      }
    }
    throw last;
  }
}

export type Pay402Options = {
  /** Refuse challenges above this price, in yoctoNEAR. */
  maxPrice?: string | bigint;
  /** Only pay these accounts. The contract's allowlist still applies either way. */
  allowedPayees?: string[];
  /** Extra memo tags, e.g. `intent:<hash>`. */
  memoTags?: string[];
  /** A short human reason appended to the memo. */
  reason?: string;
  onChallenge?: (challenge: PaymentChallenge) => boolean | void | Promise<boolean | void>;
  onRequest?: (request: PaymentArgs) => void | Promise<void>;
  onPayment?: (payment: PaymentResult) => void | Promise<void>;
  onSettled?: (record: PaymentRecord | null) => void | Promise<void>;
  fetch?: typeof fetch;
};

export type Pay402Result =
  | { kind: 'free'; response: Response }
  | { kind: 'refused'; challenge: PaymentChallenge; reason: string }
  | {
      kind: 'not-paid';
      challenge: PaymentChallenge;
      payment: PaymentResult;
      record?: PaymentRecord | null;
    }
  | {
      kind: 'paid' | 'receipt-refused';
      challenge: PaymentChallenge;
      payment: PaymentResult;
      record: PaymentRecord | null;
      response: Response;
    };

function challengeProblem(c: PaymentChallenge, contractId: string, options: Pay402Options) {
  if (!c?.payee || !c.price_yocto || !c.pay_with?.memo_must_include) return 'not a Guardian payment challenge';
  const viaFactory = Boolean(c.pay_with.factory) && contractId.endsWith(`.${c.pay_with.factory}`);
  if (c.pay_with.contract !== contractId && !viaFactory) return `challenge asks to pay through ${c.pay_with.contract}`;
  if (options.allowedPayees && !options.allowedPayees.includes(c.payee)) return `${c.payee} is not an allowed payee`;
  if (options.maxPrice !== undefined && BigInt(c.price_yocto) > BigInt(options.maxPrice))
    return `price ${c.price} NEAR is above the limit`;
  return null;
}

function truncateBytes(text: string, max: number) {
  const encoder = new TextEncoder();
  let out = text;
  while (encoder.encode(out).length > max) out = out.slice(0, -1);
  return out;
}

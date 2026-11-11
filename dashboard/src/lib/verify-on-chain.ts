import { AGENT_ID, CONTRACT_ID, RPC_URL } from './config';
import { nsToDate, toNear } from './near';
import type { BlockedAttempt, WalletStatus } from './types';

// Browser-side checks against a public testnet RPC. Each check either ran live or
// reports the error it hit. Nothing here is pre-rendered as a success.

const RPCS = [...new Set([RPC_URL, 'https://test.rpc.fastnear.com'])];

export type CheckState = 'pass' | 'fail' | 'warn';

export type LiveCheck = {
  id: string;
  title: string;
  state: CheckState;
  summary: string;
  detail?: string;
};

export type VerifyResult = { checks: LiveCheck[]; fetchedAt: string };

type AccessKey = {
  public_key: string;
  access_key: {
    nonce: number;
    permission:
      'FullAccess' | { FunctionCall: { allowance: string | null; receiver_id: string; method_names: string[] } };
  };
};

type AccountView = { amount: string; locked: string; storage_usage: number; code_hash: string };

async function rpc<T>(method: string, params: unknown): Promise<T> {
  let last: unknown;
  for (const url of RPCS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000),
        body: JSON.stringify({ jsonrpc: '2.0', id: 'verify', method, params }),
      });
      if (!res.ok) throw new Error(`RPC ${url} answered ${res.status}`);
      const body = (await res.json()) as { result?: T; error?: unknown };
      if (body.error) throw new Error(JSON.stringify(body.error));
      if (body.result === undefined) throw new Error('empty RPC result');
      return body.result;
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

async function view<T>(method: string, args: Record<string, unknown> = {}, accountId = CONTRACT_ID): Promise<T> {
  const result = await rpc<{ result?: number[]; error?: string }>('query', {
    request_type: 'call_function',
    finality: 'final',
    account_id: accountId,
    method_name: method,
    args_base64: btoa(JSON.stringify(args)),
  });
  if (result.error || !result.result) throw new Error(result.error ?? 'no result');
  return JSON.parse(new TextDecoder().decode(new Uint8Array(result.result))) as T;
}

function failed(id: string, title: string, error: unknown): LiveCheck {
  return {
    id,
    title,
    state: 'fail',
    summary: 'This check did not finish.',
    detail: String((error as Error).message ?? error),
  };
}

function agentKeyCheck(keys: AccessKey[]): LiveCheck {
  const title = 'Agent key is limited to request_payment';
  const scoped = keys.filter((k) => {
    const perm = k.access_key.permission;
    if (typeof perm === 'string') return false;
    const fc = perm.FunctionCall;
    return fc.receiver_id === CONTRACT_ID && fc.method_names.length === 1 && fc.method_names[0] === 'request_payment';
  });
  const full = keys.filter((k) => k.access_key.permission === 'FullAccess');
  if (scoped.length === 0) {
    return {
      id: 'agent-key',
      title,
      state: 'fail',
      summary: `No function-call key on ${AGENT_ID} is limited to request_payment on ${CONTRACT_ID}.`,
      detail: `${keys.length} key(s) on the account.`,
    };
  }
  const gas = scoped
    .map((k) => {
      const perm = k.access_key.permission;
      if (typeof perm === 'string') return null;
      return perm.FunctionCall.allowance ? `${toNear(perm.FunctionCall.allowance)} NEAR gas left` : 'no allowance cap';
    })
    .filter(Boolean)
    .join(', ');
  if (full.length > 0) {
    return {
      id: 'agent-key',
      title,
      state: 'warn',
      summary: `A function-call key is limited to request_payment on ${CONTRACT_ID}, with ${gas}. The same account still has a full-access key, left on during development; it will be removed before submission.`,
      detail: `${scoped.length} scoped function-call key(s), ${full.length} full-access key(s). A full-access key can sign other transactions as the agent, but it still cannot change the contract’s rules: those methods require the owner’s signature and 1 yoctoNEAR.`,
    };
  }
  return {
    id: 'agent-key',
    title,
    state: 'pass',
    summary: `${scoped.length} function-call key(s) on ${AGENT_ID} can call request_payment on ${CONTRACT_ID} and nothing else. ${gas}. Function-call keys cannot attach a deposit.`,
    detail: `No full-access keys on this account. ${keys.length} key(s) in total.`,
  };
}

function velocityCheck(status: WalletStatus): LiveCheck {
  const title = 'Velocity limit is on';
  const g = status.guards;
  const on = g.max_auto_payments > 0 && g.velocity_window_minutes > 0;
  return {
    id: 'velocity',
    title,
    state: on ? 'pass' : 'fail',
    summary: on
      ? `Automatic payments are capped at ${g.max_auto_payments} payments or ${toNear(status.approval_threshold)} NEAR in any ${g.velocity_window_minutes}-minute window.`
      : 'The velocity guard is off (max_auto_payments or velocity_window_minutes is 0).',
    detail: `Right now: ${status.auto_payments_in_window} payment(s) and ${toNear(status.auto_paid_in_window)} NEAR in the current window.`,
  };
}

function breakerCheck(status: WalletStatus): LiveCheck {
  const title = 'Kill-switch is armed';
  const g = status.guards;
  const armed = g.breaker_strikes > 0;
  const until = status.breaker_until ? nsToDate(status.breaker_until) : null;
  const tripped = until && until.getTime() > Date.now();
  return {
    id: 'breaker',
    title,
    state: armed ? 'pass' : 'fail',
    summary: armed
      ? `Trips after ${g.breaker_strikes} blocked unknown-payee request(s) in a row, then pauses for ${g.breaker_cooldown_minutes} minute(s).`
      : 'The kill-switch is off (breaker_strikes is 0).',
    detail: tripped
      ? `It is on right now, until ${until.toISOString()}. Current strikes: ${status.strikes}.`
      : `Not tripped right now. Current strikes: ${status.strikes}.`,
  };
}

function readableReason(reason: string) {
  return reason.replace(/(\d+) yocto/g, (_m, n: string) => `${toNear(n)} NEAR`);
}

function blockedCheck(latest: BlockedAttempt | null, count: number): LiveCheck {
  const title = 'Latest blocked attempt, from the chain';
  if (!latest) {
    return { id: 'blocked', title, state: 'fail', summary: 'The contract returned no blocked attempts.' };
  }
  return {
    id: 'blocked',
    title,
    state: 'pass',
    summary: `#${latest.seq} ${latest.status}: ${readableReason(latest.reason)}`,
    detail: `${toNear(latest.amount)} NEAR to ${latest.receiver_id}. ${count} blocked attempt(s) stored. The contract record does not include a transaction hash.`,
  };
}

function accountCheck(account: AccountView): LiveCheck {
  const placeholder = /^1+$/.test(account.code_hash);
  return {
    id: 'code',
    title: 'Contract code hash and balance',
    state: 'pass',
    summary: placeholder
      ? `${CONTRACT_ID} is using a global contract (view_account code hash is the empty placeholder). Balance ${toNear(account.amount, 3)} NEAR.`
      : `${CONTRACT_ID} code hash ${account.code_hash}. Balance ${toNear(account.amount, 3)} NEAR.`,
    detail: `Storage ${account.storage_usage.toLocaleString()} bytes. This is the live view_account result, not a baked-in screenshot.`,
  };
}

/** Runs five live RPC checks in the caller’s browser (or any JS runtime). */
export async function runLiveChecks(): Promise<VerifyResult> {
  const checks: LiveCheck[] = [];

  const settled = await Promise.allSettled([
    rpc<{ keys: AccessKey[] }>('query', {
      request_type: 'view_access_key_list',
      finality: 'final',
      account_id: AGENT_ID,
    }),
    rpc<AccountView>('query', { request_type: 'view_account', finality: 'final', account_id: CONTRACT_ID }),
    view<WalletStatus>('get_wallet_status'),
    view<BlockedAttempt[]>('get_blocked_attempts', { limit: 1 }),
  ]);

  const keys = settled[0];
  checks.push(
    keys.status === 'fulfilled'
      ? agentKeyCheck(keys.value.keys ?? [])
      : failed('agent-key', 'Agent key is limited to request_payment', keys.reason),
  );

  const account = settled[1];
  checks.push(
    account.status === 'fulfilled'
      ? accountCheck(account.value)
      : failed('code', 'Contract code hash and balance', account.reason),
  );

  const status = settled[2];
  if (status.status === 'fulfilled') {
    checks.push(velocityCheck(status.value));
    checks.push(breakerCheck(status.value));
  } else {
    checks.push(failed('velocity', 'Velocity limit is on', status.reason));
    checks.push(failed('breaker', 'Kill-switch is armed', status.reason));
  }

  const blocked = settled[3];
  const count = status.status === 'fulfilled' ? status.value.blocked_count : 0;
  checks.push(
    blocked.status === 'fulfilled'
      ? blockedCheck(blocked.value[0] ?? null, count)
      : failed('blocked', 'Latest blocked attempt, from the chain', blocked.reason),
  );

  return { checks, fetchedAt: new Date().toISOString() };
}

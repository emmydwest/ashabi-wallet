import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { AGENT_ID, CONTRACT_ID, FACTORY_ID, isVaultId, RPC_URL, VENDOR_ID } from '@/lib/config';
import { nearToYocto, viewCall } from '@/lib/near';
import { claim, get } from '@/lib/server/store';
import type { CATALOG } from './catalog';

// HTTP 402 for agents: the vendor answers an unpaid request with a price and a one-time
// nonce, the agent pays through its guardian wallet with that nonce in the memo, then
// retries with the transaction hash. The vendor checks the transaction itself on-chain.

type Item = (typeof CATALOG)[number];

export const RECEIPT_HEADER = 'x-near-receipt-tx';
/** Who signed the receipt; only a lookup hint for the RPC, the signer is checked on-chain. */
export const SIGNER_HEADER = 'x-near-receipt-signer';
const NONCE_TTL_SEC = 15 * 60;
const USED_TTL_SEC = 7 * 24 * 60 * 60;
const TX_HASH = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/;

// Without a configured secret (local dev) nonces only verify on the process that issued them.
const secret = process.env.VENDOR_SECRET?.trim() || randomBytes(32).toString('hex');
const mac = (text: string) => createHmac('sha256', secret).update(text).digest('hex').slice(0, 16);

function newNonce(sku: string) {
  const expires = Math.floor(Date.now() / 1000 + NONCE_TTL_SEC).toString(36);
  const salt = randomBytes(5).toString('hex');
  return `${expires}-${salt}-${mac(`${sku}:${expires}:${salt}`)}`;
}

function nonceProblem(nonce: string, sku: string) {
  const [expires, salt, tag] = nonce.split('-');
  if (!expires || !salt || !tag) return 'nonce is malformed';
  const expected = Buffer.from(mac(`${sku}:${expires}:${salt}`));
  if (expected.length !== tag.length || !timingSafeEqual(expected, Buffer.from(tag)))
    return `nonce was not issued by this vendor for ${sku}`;
  if (parseInt(expires, 36) * 1000 < Date.now()) return 'nonce has expired; ask for a new price';
  return null;
}

export function challenge(item: Item) {
  const nonce = newNonce(item.sku);
  return {
    error: 'payment_required',
    sku: item.sku,
    price: item.price_near,
    price_yocto: nearToYocto(item.price_near).toString(),
    payee: VENDOR_ID,
    nonce,
    expires_in_sec: NONCE_TTL_SEC,
    pay_with: {
      network: 'near-testnet',
      contract: CONTRACT_ID,
      // Any wallet this factory created is accepted too.
      factory: FACTORY_ID,
      method: 'request_payment',
      memo_must_include: [`sku:${item.sku}`, `nonce:${nonce}`],
    },
    retry_with_header: 'X-NEAR-Receipt-Tx: <transaction hash>',
  };
}

type Action = { FunctionCall?: { method_name: string; args: string }; Transfer?: { deposit: string } };
type ExecutionStatus = { SuccessValue?: string; SuccessReceiptId?: string; Failure?: unknown };
type TxStatus = {
  status: ExecutionStatus;
  transaction: { signer_id: string; receiver_id: string; actions: Action[] };
  receipts: {
    predecessor_id: string;
    receiver_id: string;
    receipt_id: string;
    receipt: { Action?: { actions: Action[] } };
  }[];
  receipts_outcome: { id: string; outcome: { status: ExecutionStatus } }[];
};

async function txStatus(hash: string, signer: string): Promise<TxStatus | string> {
  for (const url of [...new Set([RPC_URL, 'https://test.rpc.fastnear.com'])]) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(12_000),
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'receipt',
          method: 'EXPERIMENTAL_tx_status',
          params: { tx_hash: hash, sender_account_id: signer, wait_until: 'FINAL' },
        }),
      });
      const body = await res.json();
      if (body.result) return body.result as TxStatus;
      const name = body.error?.cause?.name;
      if (name === 'UNKNOWN_TRANSACTION') return 'transaction not found on testnet';
    } catch {
      // try the next RPC
    }
  }
  return 'could not reach a testnet RPC to check the receipt';
}

const decode = (b64: string) => Buffer.from(b64, 'base64').toString();

export type Verification =
  | { ok: true; recordId: number; checks: string[] }
  | { ok: false; status: 402 | 409; problem: string; checks: string[] };

export async function verifyReceipt(hash: string, item: Item, signerHint?: string | null): Promise<Verification> {
  const checks: string[] = [];
  const fail = (problem: string, status: 402 | 409 = 402): Verification => ({ ok: false, status, problem, checks });

  if (!TX_HASH.test(hash)) return fail('X-NEAR-Receipt-Tx is not a transaction hash');
  if ((await get(`receipt:${hash}`)) !== undefined) return fail('this receipt was already used', 409);

  const signer = signerHint?.trim() || AGENT_ID;
  const tx = await txStatus(hash, signer);
  if (typeof tx === 'string') return fail(tx);

  const vault = tx.transaction.receiver_id;
  if (!isVaultId(vault)) return fail(`transaction was sent to ${vault}, not a guardian wallet`);
  const agentId =
    vault === CONTRACT_ID ? AGENT_ID : (await viewCall<{ agent_id: string }>('get_wallet_status', {}, vault)).agent_id;
  if (tx.transaction.signer_id !== agentId) return fail(`transaction was not signed by ${vault}'s agent`);
  checks.push(`Signed by ${agentId}, sent to the guardian wallet ${vault}`);

  const call = tx.transaction.actions[0]?.FunctionCall;
  if (tx.transaction.actions.length !== 1 || call?.method_name !== 'request_payment')
    return fail('transaction is not a single request_payment call');
  const args = JSON.parse(decode(call.args)) as { receiver_id: string; amount: string; memo?: string };
  const price = nearToYocto(item.price_near);
  if (args.receiver_id !== VENDOR_ID || BigInt(args.amount) !== price)
    return fail(`request was not ${item.price_near} NEAR to ${VENDOR_ID}`);

  const memo = args.memo ?? '';
  const nonce = memo.match(/nonce:([\w-]+)/)?.[1];
  if (!memo.includes(`sku:${item.sku}`) || !nonce) return fail(`memo does not name sku:${item.sku} and a nonce`);
  const bad = nonceProblem(nonce, item.sku);
  if (bad) return fail(bad);
  checks.push(`request_payment for sku:${item.sku} with this vendor's nonce`);

  if (!tx.status.SuccessValue) return fail('the contract call did not succeed');
  const outcome = JSON.parse(decode(tx.status.SuccessValue)) as { status: string; record_id: number | null };
  if (outcome.status !== 'APPROVED' || outcome.record_id === null)
    return fail(`the guardian answered ${outcome.status}, so nothing was paid`);
  checks.push(`Guardian approved it as payment #${outcome.record_id}`);

  const transfer = tx.receipts.find(
    (r) =>
      r.predecessor_id === vault &&
      r.receiver_id === VENDOR_ID &&
      r.receipt.Action?.actions.some((a) => a.Transfer && BigInt(a.Transfer.deposit) === price),
  );
  const landed = transfer && tx.receipts_outcome.find((o) => o.id === transfer.receipt_id);
  if (!landed || landed.outcome.status.Failure) return fail('no successful transfer to the vendor in this transaction');
  checks.push(`${item.price_near} NEAR transferred to ${VENDOR_ID}`);

  // One nonce, one receipt, one unlock.
  if (!(await claim(`nonce:${nonce}`, USED_TTL_SEC))) return fail('this nonce was already redeemed', 409);
  if (!(await claim(`receipt:${hash}`, USED_TTL_SEC))) return fail('this receipt was already used', 409);
  checks.push('Receipt and nonce not used before');

  return { ok: true, recordId: outcome.record_id, checks };
}

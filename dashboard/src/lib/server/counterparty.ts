import 'server-only';
import type { PayeeReport } from 'guardian-wallet-sdk';
import { viewCall } from '@/lib/near';

// The agent's own look at a payee before it asks the vault to pay. BLOCK mirrors the vault's
// blocklist, which the contract enforces either way. WARN is advice from public chain data:
// an account made in the last day, or one whose contract code changed in the last day.

export type CounterpartyLevel = 'ALLOW' | 'WARN' | 'BLOCK';

export type CounterpartyCheck = {
  level: CounterpartyLevel;
  findings: string[];
  report?: PayeeReport;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const RPC = 'https://rpc.testnet.near.org';
// Only archival nodes answer for blocks older than a few epochs.
const ARCHIVAL_RPC = 'https://archival-rpc.testnet.near.org';
const NEARBLOCKS_API = 'https://api-testnet.nearblocks.io/v3';
const CACHE_MS = 2 * 60 * 1000;

type AccountView = { code_hash: string };
const NO_CODE = '11111111111111111111111111111111';

const cache = new Map<string, { at: number; check: CounterpartyCheck }>();

async function rpc<T>(url: string, method: string, params: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
    body: JSON.stringify({ jsonrpc: '2.0', id: 'counterparty', method, params }),
  });
  const body = await res.json();
  if (body.error) throw new Error(body.error.cause?.name ?? body.error.message ?? 'RPC error');
  return body.result as T;
}

function viewAccount(accountId: string, block: { finality: 'final' } | { block_id: number }, url = RPC) {
  return rpc<AccountView>(url, 'query', { request_type: 'view_account', account_id: accountId, ...block });
}

async function createdAt(accountId: string): Promise<number | null> {
  const res = await fetch(`${NEARBLOCKS_API}/accounts/${accountId}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { data?: { created?: { block_timestamp?: string } } };
  const ns = body.data?.created?.block_timestamp;
  return ns ? Number(BigInt(ns) / 1_000_000n) : null;
}

/** Height of a block about a day back, from the current height and the recent block rate. */
async function heightADayAgo(): Promise<number> {
  type Block = { header: { height: number; timestamp_nanosec: string } };
  const now = await rpc<Block>(RPC, 'block', { finality: 'final' });
  const sample = 1000;
  const earlier = await rpc<Block>(RPC, 'block', { block_id: now.header.height - sample });
  const msPerBlock =
    Number(BigInt(now.header.timestamp_nanosec) - BigInt(earlier.header.timestamp_nanosec)) / 1e6 / sample;
  return Math.round(now.header.height - DAY_MS / msPerBlock);
}

/** Whether the account's code differs from a day ago. Null when the chain couldn't say. */
async function codeChangedToday(accountId: string, codeNow: string): Promise<boolean | null> {
  try {
    const before = await viewAccount(accountId, { block_id: await heightADayAgo() }, ARCHIVAL_RPC);
    return before.code_hash !== codeNow;
  } catch {
    // Not there a day ago (the age check covers that), or the archival node didn't answer.
    return null;
  }
}

async function readReport(accountId: string, vaultId: string): Promise<PayeeReport | null> {
  try {
    return await viewCall<PayeeReport | null>('get_payee_report', { account_id: accountId }, vaultId);
  } catch {
    // Wallets on code from before the blocklist have no such method.
    return null;
  }
}

function hoursAgo(ms: number) {
  const hours = Math.max(1, Math.round((Date.now() - ms) / 3_600_000));
  return `${hours} hour${hours === 1 ? '' : 's'} ago`;
}

async function inspect(accountId: string, vaultId: string): Promise<CounterpartyCheck> {
  const [report, account, created] = await Promise.all([
    readReport(accountId, vaultId),
    viewAccount(accountId, { finality: 'final' }).catch((e: Error) => e),
    createdAt(accountId).catch(() => null),
  ]);
  if (report) {
    return {
      level: 'BLOCK',
      report,
      findings: [`reported by ${report.reported_by}: ${report.reason}`],
    };
  }
  if (account instanceof Error) {
    const missing = account.message === 'UNKNOWN_ACCOUNT';
    return {
      level: 'WARN',
      findings: [
        missing ? `${accountId} does not exist on testnet` : `couldn't read ${accountId} (${account.message})`,
      ],
    };
  }
  const findings: string[] = [];
  if (created && Date.now() - created < DAY_MS) findings.push(`account created ${hoursAgo(created)}`);
  if (account.code_hash !== NO_CODE && (await codeChangedToday(accountId, account.code_hash)))
    findings.push('contract code changed in the last 24 hours');
  return { level: findings.length ? 'WARN' : 'ALLOW', findings };
}

export async function checkCounterparty(accountId: string, vaultId: string): Promise<CounterpartyCheck> {
  const key = `${vaultId}:${accountId}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.check;
  const check = await inspect(accountId, vaultId).catch((): CounterpartyCheck => ({
    level: 'ALLOW',
    findings: ['chain data unavailable; the contract still checks'],
  }));
  cache.set(key, { at: Date.now(), check });
  return check;
}

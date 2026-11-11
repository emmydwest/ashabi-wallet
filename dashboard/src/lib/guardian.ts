import 'server-only';
import { CONTRACT_ID } from './config';
import fallback from '@/data/snapshot-fallback.json';
import { viewCall } from './near';
import type { BlockedAttempt, FeedItem, GuardianSnapshot, PaymentRecord, WalletStatus } from './types';

type ExplorerTxn = {
  transaction_hash: string;
  block_timestamp: string;
  actions: { method?: string }[];
  outcomes: { status: boolean };
};

const NEARBLOCKS_API = 'https://api-testnet.nearblocks.io/v3';
const txCache = new Map<string, { at: number; hashes: ExplorerTxn[] }>();

async function requestPaymentTxns(contractId: string, cache: RequestCache = 'no-store'): Promise<ExplorerTxn[]> {
  const cached = txCache.get(contractId);
  if (cache === 'no-store' && cached && Date.now() - cached.at < 20_000) return cached.hashes;
  try {
    const res = await fetch(`${NEARBLOCKS_API}/accounts/${contractId}/txns?method=request_payment&limit=100`, {
      cache,
      signal: AbortSignal.timeout(4000),
    });
    const body = await res.json();
    const txns: ExplorerTxn[] = (body.data ?? []).filter(
      (t: ExplorerTxn) => t.outcomes?.status && t.actions?.[0]?.method === 'request_payment',
    );
    txCache.set(contractId, { at: Date.now(), hashes: txns });
  } catch {
    // The feed still renders without tx links if NearBlocks is slow or rate limited.
  }
  return txCache.get(contractId)?.hashes ?? [];
}

// Every successful request_payment creates one payment record or one blocked attempt, stamped
// with the time its receipt ran: the tx's own block or one shortly after. Walk both lists in time
// order and pair each item with the latest tx at or before it.
function attachTxHashes(items: FeedItem[], txns: ExplorerTxn[]) {
  const ordered = [...txns].sort((a, b) => Number(BigInt(a.block_timestamp) - BigInt(b.block_timestamp)));
  const chronological = [...items].sort((a, b) => a.at - b.at);
  let next = 0;
  for (const item of chronological) {
    let match: ExplorerTxn | undefined;
    while (next < ordered.length && Number(ordered[next].block_timestamp) <= item.at) match = ordered[next++];
    if (match && item.at - Number(match.block_timestamp) < 30e9) item.txHash = match.transaction_hash;
  }
}

async function readSnapshot(contractId: string, cache: RequestCache = 'no-store'): Promise<GuardianSnapshot> {
  const [status, history, blocked, pending, txns] = await Promise.all([
    viewCall<WalletStatus>('get_wallet_status', {}, contractId, cache),
    viewCall<PaymentRecord[]>('get_payment_history', { limit: 100 }, contractId, cache),
    viewCall<BlockedAttempt[]>('get_blocked_attempts', { limit: 100 }, contractId, cache),
    viewCall<PaymentRecord[]>('get_pending', {}, contractId, cache),
    requestPaymentTxns(contractId, cache),
  ]);
  const feed: FeedItem[] = [
    ...history.map((record): FeedItem => ({ kind: 'payment', key: `p${record.id}`, at: record.created_at, record })),
    ...blocked.map((attempt): FeedItem => ({
      kind: 'blocked',
      key: `b${attempt.seq}`,
      at: attempt.timestamp,
      attempt,
    })),
  ];
  attachTxHashes(feed, txns);
  feed.sort((a, b) => b.at - a.at);
  return { status, pending, feed, fetchedAt: new Date().toISOString() };
}

const lastGood = new Map<string, GuardianSnapshot>();

// The last state this server read, or (for the demo wallet) the one saved at build time, so a
// slow RPC never leaves a page blank. Either way it is flagged stale and shows its own timestamp.
export async function loadSnapshot(contractId = CONTRACT_ID, cache: RequestCache = 'no-store'): Promise<GuardianSnapshot> {
  try {
    const snapshot = await readSnapshot(contractId, cache);
    lastGood.set(contractId, snapshot);
    return snapshot;
  } catch (error) {
    const saved = lastGood.get(contractId) ?? (contractId === CONTRACT_ID ? (fallback as GuardianSnapshot) : null);
    if (!saved) throw error;
    return { ...saved, stale: true };
  }
}

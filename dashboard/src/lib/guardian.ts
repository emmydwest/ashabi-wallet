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
let txCache: { at: number; hashes: ExplorerTxn[] } = { at: 0, hashes: [] };

async function requestPaymentTxns(): Promise<ExplorerTxn[]> {
  if (Date.now() - txCache.at < 20_000) return txCache.hashes;
  try {
    const res = await fetch(`${NEARBLOCKS_API}/accounts/${CONTRACT_ID}/txns?method=request_payment&limit=100`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    const body = await res.json();
    const txns: ExplorerTxn[] = (body.data ?? []).filter(
      (t: ExplorerTxn) => t.outcomes?.status && t.actions?.[0]?.method === 'request_payment',
    );
    txCache = { at: Date.now(), hashes: txns };
  } catch {
    // The feed still renders without tx links if NearBlocks is slow or rate limited.
  }
  return txCache.hashes;
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

async function readSnapshot(): Promise<GuardianSnapshot> {
  const [status, history, blocked, pending, txns] = await Promise.all([
    viewCall<WalletStatus>('get_wallet_status'),
    viewCall<PaymentRecord[]>('get_payment_history', { limit: 100 }),
    viewCall<BlockedAttempt[]>('get_blocked_attempts', { limit: 100 }),
    viewCall<PaymentRecord[]>('get_pending'),
    requestPaymentTxns(),
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

let lastGood: GuardianSnapshot | null = null;

// The last state this server read, or the one saved at build time, so a slow RPC never leaves a
// page blank. Either way it is flagged stale and shows its own timestamp.
export async function loadSnapshot(): Promise<GuardianSnapshot> {
  try {
    lastGood = await readSnapshot();
    return lastGood;
  } catch {
    return { ...(lastGood ?? (fallback as GuardianSnapshot)), stale: true };
  }
}

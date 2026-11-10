import 'server-only';
import { CONTRACT_ID } from './config';
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

// Every successful request_payment creates exactly one payment record or one
// blocked attempt, so sorting both sides by time pairs each item with its tx.
function attachTxHashes(items: FeedItem[], txns: ExplorerTxn[]) {
  const ordered = [...txns].sort((a, b) => Number(BigInt(a.block_timestamp) - BigInt(b.block_timestamp)));
  const chronological = [...items].sort((a, b) => a.at - b.at);
  if (ordered.length !== chronological.length) return;
  chronological.forEach((item, i) => (item.txHash = ordered[i].transaction_hash));
}

export async function loadSnapshot(): Promise<GuardianSnapshot> {
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

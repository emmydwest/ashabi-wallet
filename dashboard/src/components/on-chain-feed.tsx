'use client';

import { ExplorerLink } from '@/components/explorer-link';
import { StatusChip } from '@/components/status-chip';
import { useGuardian } from '@/components/use-guardian';
import { timeAgo } from '@/lib/format';
import { nsToDate, toNear } from '@/lib/near';
import type { FeedItem, GuardianSnapshot } from '@/lib/types';

type Row = FeedItem;
// A live list of what the demo vault actually recorded: purchases, requests waiting
// for the owner, and blocked attempts, with NearBlocks links when we have them.
export function OnChainFeed({
  initial,
  title = 'Live from the demo vault',
  limit = 12,
}: {
  initial: GuardianSnapshot;
  title?: string;
  limit?: number;
}) {
  const { snapshot, error } = useGuardian(8000, initial);
  const stale = snapshot.stale;
  const rows = buildRows(snapshot, limit);
  const unknownPayee = snapshot.feed.filter(
    (item) => item.kind === 'blocked' && item.attempt.status === 'BLOCKED_RECIPIENT',
  ).length;

  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand/80">On-chain activity</p>
          <h2 className="mt-1.5 font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Recent requests the contract recorded on the public demo vault, refreshed every few seconds.
            {unknownPayee > 0
              ? ` ${unknownPayee} payment${unknownPayee === 1 ? '' : 's'} to unknown accounts blocked in these records.`
              : ''}
          </p>
        </div>
        <p className="text-xs text-zinc-500" suppressHydrationWarning>
          {stale ? 'Last good state' : 'Updated'} {timeAgo(new Date(snapshot.fetchedAt))}
        </p>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-sm text-amber-100">
          Could not refresh from the testnet RPC: {error}. Showing the last state we have.
        </p>
      )}
      {stale && !error && (
        <p className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-sm text-amber-100">
          The testnet RPC did not answer just now. These rows are the last good state, from{' '}
          <span suppressHydrationWarning>{new Date(snapshot.fetchedAt).toLocaleString()}</span>.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="mt-5 rounded-card border border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-zinc-500">
          No activity on this vault yet.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-white/[0.06] overflow-hidden rounded-card border border-white/10 bg-white/[0.03]">
          {rows.map((row) => (
            <li key={row.key} className="min-w-0 px-4 py-3 sm:px-5">
              <FeedRow row={row} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function buildRows(snapshot: GuardianSnapshot, limit: number) {
  const pendingKeys = new Set(snapshot.pending.map((p) => `p${p.id}`));
  const items = snapshot.feed.filter((item) => item.kind === 'blocked' || !pendingKeys.has(item.key));
  const pending = snapshot.pending.map((record) => ({
    kind: 'payment' as const,
    key: `pending-${record.id}`,
    at: record.created_at,
    record,
  }));
  return [...pending, ...items]
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}

function FeedRow({ row }: { row: Row }) {
  if (row.kind === 'blocked') {
    const a = row.attempt;
    return (
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-white">
            <span className="font-mono tabular-nums">{toNear(a.amount)} NEAR</span>
            <span className="text-zinc-500"> to </span>
            <span className="wrap-ids font-mono text-[13px] text-zinc-200">{a.receiver_id}</span>
          </p>
          <p className="mt-0.5 wrap-ids text-xs leading-relaxed text-rose-200/90">{a.reason}</p>
          <p className="mt-0.5 text-xs text-zinc-500" suppressHydrationWarning>
            {timeAgo(nsToDate(row.at))} · funds not moved
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <StatusChip status={a.status} />
          {row.txHash && <ExplorerLink txHash={row.txHash} label="View tx" variant="pill" />}
        </div>
      </div>
    );
  }
  const r = row.record;
  const waiting = r.status === 'PENDING_APPROVAL';
  const label = waiting
    ? 'Waiting for the owner'
    : r.approved_by_owner
      ? 'Owner approved, then paid'
      : r.memo.includes('sku:')
        ? 'Paid purchase'
        : 'Payment';
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm text-white">
          <span className="font-mono tabular-nums">{toNear(r.amount)} NEAR</span>
          <span className="text-zinc-500"> to </span>
          <span className="wrap-ids font-mono text-[13px] text-zinc-200">{r.receiver_id}</span>
        </p>
        <p className="mt-0.5 text-xs text-zinc-400">
          {label}
          {r.memo && (
            <>
              <span className="text-zinc-600"> · </span>
              <span className="wrap-ids font-mono text-zinc-500">{r.memo}</span>
            </>
          )}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500" suppressHydrationWarning>
          {timeAgo(nsToDate(row.at))}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <StatusChip status={r.status} />
        {row.txHash && <ExplorerLink txHash={row.txHash} label="View tx" variant="pill" />}
      </div>
    </div>
  );
}

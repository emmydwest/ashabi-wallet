'use client';

import { Zap } from 'lucide-react';
import { ExplorerLink } from '@/components/explorer-link';
import { TimeAgo } from '@/components/time-ago';
import { QUICK_ATTACKS, type QuickAttack } from '@/lib/agent/attacks';
import { CONTRACT_ID } from '@/lib/config';
import { nearNumber, nsToDate, toNear } from '@/lib/near';
import type { BlockedAttempt, FeedItem, GuardianSnapshot } from '@/lib/types';

type Blocked = Extract<FeedItem, { kind: 'blocked' }>;

const REASON_LABEL: Record<string, string> = {
  BLOCKED_RECIPIENT: 'Unknown payee',
  BLOCKED_COUNTERPARTY: 'Reported payee',
  BLOCKED_BUDGET: 'Over budget',
  BLOCKED_VELOCITY: 'Velocity cap',
  FROZEN: 'Frozen / kill-switch',
  TOO_MANY_PENDING: 'Too many waiting',
  INSUFFICIENT_FUNDS: 'Vault too low',
  DUPLICATE: 'Replayed request',
};

type Props = {
  snapshot: GuardianSnapshot;
  busy: boolean;
  onRun: (attack: QuickAttack) => void;
};

export function RedTeamArena({ snapshot, busy, onRun }: Props) {
  return (
    <section className="glass min-w-0 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-white">One-tap attacks</h2>
        <p className="text-xs text-zinc-500">Each one sends a real request to {CONTRACT_ID}</p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {QUICK_ATTACKS.map((attack) => (
          <button
            key={attack.id}
            type="button"
            disabled={busy}
            onClick={() => onRun(attack)}
            className="group flex min-w-0 items-center gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.05] px-3.5 py-3 text-left transition-colors hover:border-rose-300/50 hover:bg-rose-400/[0.09] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-rose-400/15 text-rose-200 group-hover:bg-rose-400/25">
              <Zap className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-white">{attack.label}</span>
              <span className="block text-xs text-zinc-400">Stopped by the {attack.stops}</span>
            </span>
          </button>
        ))}
      </div>
      <DefenseStats snapshot={snapshot} />
    </section>
  );
}

function blockedItems(feed: FeedItem[]): Blocked[] {
  return feed.filter((item): item is Blocked => item.kind === 'blocked');
}

function byReason(attempts: BlockedAttempt[]) {
  const counts = new Map<string, number>();
  for (const a of attempts) counts.set(a.status, (counts.get(a.status) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function DefenseStats({ snapshot }: { snapshot: GuardianSnapshot }) {
  const blocked = blockedItems(snapshot.feed);
  const attempts = blocked.map((b) => b.attempt);
  const refused = attempts.reduce((sum, a) => sum + BigInt(a.amount), 0n);
  const total = snapshot.status.blocked_count;
  const covers = attempts.length >= total ? `all ${total}` : `the latest ${attempts.length} of ${total}`;
  const now = new Date(snapshot.fetchedAt).getTime();
  return (
    <div className="mt-4 border-t border-white/[0.06] pt-4">
      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-black/25 px-3 py-2.5">
          <dt className="text-xs text-zinc-400">Requests blocked</dt>
          <dd className="mt-0.5 font-mono text-xl font-semibold text-danger">{total}</dd>
        </div>
        <div className="rounded-xl bg-black/25 px-3 py-2.5">
          <dt className="text-xs text-zinc-400">NEAR kept in the vault</dt>
          <dd className="mt-0.5 font-mono text-xl font-semibold text-safe">
            {nearNumber(refused).toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">
        The count is the contract’s own blocked_count. NEAR kept adds up what {covers} blocked requests asked for, as
        stored by get_blocked_attempts. Budget and balance blocks are counted too, not only attacks.
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {byReason(attempts).map(([status, count]) => (
          <li
            key={status}
            className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-zinc-300"
          >
            {REASON_LABEL[status] ?? status} · <span className="font-mono">{count}</span>
          </li>
        ))}
      </ul>
      <ul className="mt-3 space-y-1.5">
        {blocked.slice(0, 4).map((item) => (
          <li
            key={item.key}
            className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-black/20 px-3 py-2 text-xs"
          >
            <span className="min-w-0">
              <span className="block truncate text-zinc-200">
                {toNear(item.attempt.amount)} NEAR → <span className="font-mono">{item.attempt.receiver_id}</span>
              </span>
              <span className="text-zinc-500" suppressHydrationWarning>
                {REASON_LABEL[item.attempt.status] ?? item.attempt.status} ·{' '}
                <TimeAgo date={nsToDate(item.at)} at={now} />
              </span>
            </span>
            {item.txHash && <ExplorerLink txHash={item.txHash} label="tx" variant="pill" />}
          </li>
        ))}
      </ul>
    </div>
  );
}

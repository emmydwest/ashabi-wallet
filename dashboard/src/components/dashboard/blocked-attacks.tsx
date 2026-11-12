import { Card, CardHeader } from '@/components/card';
import { ExplorerLink } from '@/components/explorer-link';
import { StatusChip } from '@/components/status-chip';
import { TimeAgo } from '@/components/time-ago';
import { nsToDate, toNear } from '@/lib/near';
import type { FeedItem } from '@/lib/types';
import { ShieldX } from './payment-feed';

export function BlockedAttacks({ feed, now }: { feed: FeedItem[]; now?: number }) {
  const attacks = feed
    .filter((i): i is Extract<FeedItem, { kind: 'blocked' }> => i.kind === 'blocked')
    .filter((i) => i.attempt.status === 'BLOCKED_RECIPIENT' || i.attempt.status === 'BLOCKED_COUNTERPARTY')
    .slice(0, 3);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Blocked attacks"
        hint="Payments to unapproved or reported accounts. Stored on-chain, funds untouched."
      />
      <div className="space-y-3 p-5 sm:p-6">
        {attacks.length === 0 && <p className="text-sm text-zinc-400">No attacks recorded yet.</p>}
        {attacks.map(({ key, at, txHash, attempt }) => (
          <article
            key={key}
            className="relative overflow-hidden rounded-xl border border-rose-400/15 bg-gradient-to-br from-rose-500/[0.08] via-transparent to-transparent p-4"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-400/15 text-rose-300">
                <ShieldX />
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                <span className="tabular whitespace-nowrap font-mono text-[15px] font-medium text-white">
                  {toNear(attempt.amount)} NEAR
                </span>
                <StatusChip status={attempt.status} />
              </div>
            </div>
            <div className="mt-2 text-sm text-zinc-400">
              to <span className="break-all font-mono text-rose-200">{attempt.receiver_id}</span>
            </div>
            <blockquote className="mt-3 border-l-2 border-rose-400/40 pl-3 font-mono text-xs leading-relaxed text-zinc-300">
              {attempt.memo || 'no memo'}
            </blockquote>
            <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
              <span>{<TimeAgo date={nsToDate(at)} at={now} />} · funds not transferred</span>
              <ExplorerLink txHash={txHash} label={txHash ? 'View tx' : 'Contract'} variant="pill" />
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}

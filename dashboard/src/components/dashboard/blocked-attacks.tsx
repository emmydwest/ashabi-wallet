import { Card, CardHeader } from '@/components/card';
import { ExplorerLink } from '@/components/explorer-link';
import { StatusChip } from '@/components/status-chip';
import { timeAgo } from '@/lib/format';
import { nsToDate, toNear } from '@/lib/near';
import type { FeedItem } from '@/lib/types';
import { ShieldX } from './payment-feed';

export function BlockedAttacks({ feed }: { feed: FeedItem[] }) {
  const attacks = feed
    .filter((i): i is Extract<FeedItem, { kind: 'blocked' }> => i.kind === 'blocked')
    .filter((i) => i.attempt.status === 'BLOCKED_RECIPIENT')
    .slice(0, 3);

  return (
    <Card className="overflow-hidden">
      <CardHeader title="Blocked attacks" hint="Payments to unapproved accounts. Stored on-chain, funds untouched." />
      <div className="space-y-3 p-5 sm:p-6">
        {attacks.length === 0 && <p className="text-sm text-zinc-500">No attacks recorded yet.</p>}
        {attacks.map(({ key, at, txHash, attempt }) => (
          <article
            key={key}
            className="relative overflow-hidden rounded-xl border border-rose-400/15 bg-gradient-to-br from-rose-500/[0.08] via-transparent to-transparent p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-rose-400/15 text-rose-300">
                  <ShieldX />
                </span>
                <div>
                  <div className="tabular font-mono text-sm text-white">{toNear(attempt.amount)} NEAR</div>
                  <div className="font-mono text-xs text-rose-200/80">{attempt.receiver_id}</div>
                </div>
              </div>
              <StatusChip status={attempt.status} />
            </div>
            <blockquote className="mt-3 border-l-2 border-rose-400/40 pl-3 font-mono text-xs leading-relaxed text-zinc-300">
              {attempt.memo || 'no memo'}
            </blockquote>
            <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
              <span>{timeAgo(nsToDate(at))} · funds not transferred</span>
              <ExplorerLink txHash={txHash} />
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}

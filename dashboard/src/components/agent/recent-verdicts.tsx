import { ExplorerLink } from '@/components/explorer-link';
import { StatusChip } from '@/components/status-chip';
import { TimeAgo } from '@/components/time-ago';
import { nsToDate, toNear } from '@/lib/near';
import type { FeedItem } from '@/lib/types';

// Shown before the first run so the panel never sits empty: the latest real verdicts.
export function RecentVerdicts({ feed, now }: { feed: FeedItem[]; now?: number }) {
  const items = feed.slice(0, 5);
  if (items.length === 0) return <p className="py-10 text-center text-sm text-zinc-500">No activity yet.</p>;
  return (
    <div>
      <p className="text-sm text-zinc-400">Nothing run in this tab yet. Latest decisions on-chain:</p>
      <ul className="mt-3 space-y-2 opacity-80">
        {items.map((item) => {
          const status = item.kind === 'payment' ? item.record.status : item.attempt.status;
          const target = item.kind === 'payment' ? item.record : item.attempt;
          return (
            <li key={item.key}>
              <details className="group rounded-xl border border-white/[0.06] bg-black/20 px-3.5 py-2.5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-zinc-100">
                      {toNear(target.amount)} NEAR → <span className="font-mono">{target.receiver_id}</span>
                    </span>
                    <span className="text-xs text-zinc-500" suppressHydrationWarning>
                      {<TimeAgo date={nsToDate(item.at)} at={now} />}
                    </span>
                  </span>
                  <StatusChip status={status} />
                </summary>
                <div className="mt-2 space-y-2 border-t border-white/[0.06] pt-2 text-xs text-zinc-400">
                  {item.kind === 'blocked' && <p className="text-rose-200/90">{item.attempt.reason}</p>}
                  {target.memo && <p className="break-words font-mono">{target.memo}</p>}
                  {item.txHash && <ExplorerLink txHash={item.txHash} label="View tx" variant="pill" />}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

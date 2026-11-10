'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Card, CardHeader } from '@/components/card';
import { ExplorerLink } from '@/components/explorer-link';
import { StatusChip } from '@/components/status-chip';
import { timeAgo } from '@/lib/format';
import { nsToDate, toNear } from '@/lib/near';
import type { FeedItem } from '@/lib/types';

const FILTERS = ['All', 'Payments', 'Blocked'] as const;
type Filter = (typeof FILTERS)[number];

function describe(item: FeedItem) {
  if (item.kind === 'payment') {
    const { record } = item;
    return { amount: record.amount, receiver: record.receiver_id, memo: record.memo, status: record.status };
  }
  const { attempt } = item;
  return { amount: attempt.amount, receiver: attempt.receiver_id, memo: attempt.memo, status: attempt.status };
}

export function PaymentFeed({ feed }: { feed: FeedItem[] }) {
  const [filter, setFilter] = useState<Filter>('All');
  const [limit, setLimit] = useState(10);
  const visible = feed.filter(
    (i) => filter === 'All' || (filter === 'Payments' ? i.kind === 'payment' : i.kind === 'blocked'),
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Live activity"
        hint="Every request the agent made, as the contract recorded it."
        action={
          <div className="flex rounded-lg border border-white/[0.07] bg-black/20 p-0.5 text-xs">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 transition-colors ${filter === f ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                {f}
              </button>
            ))}
          </div>
        }
      />
      <ul className="mt-4 divide-y divide-white/[0.05]">
        <AnimatePresence initial={false}>
          {visible.slice(0, limit).map((item) => {
            const row = describe(item);
            const blocked = item.kind === 'blocked';
            return (
              <motion.li
                key={item.key}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex gap-3.5 px-5 py-4 transition-colors hover:bg-white/[0.02] sm:px-6"
              >
                <span
                  className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border ${
                    blocked
                      ? 'border-rose-400/20 bg-rose-400/10 text-rose-300'
                      : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                  }`}
                >
                  {blocked ? <ShieldX /> : <ArrowUpRight />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                    <span className="tabular whitespace-nowrap font-mono text-[15px] font-medium text-white">
                      {toNear(row.amount)} NEAR
                    </span>
                    <StatusChip status={row.status} />
                  </div>
                  <div className="mt-1 text-sm text-zinc-400">
                    to{' '}
                    <span className={`break-all font-mono ${blocked ? 'text-rose-200' : 'text-zinc-200'}`}>
                      {row.receiver}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">{row.memo || 'no memo'}</p>
                  <div className="mt-2.5 flex items-center justify-between gap-3 text-xs text-zinc-400">
                    <span>
                      {timeAgo(nsToDate(item.at))}
                      {blocked && ' · funds not moved'}
                    </span>
                    <ExplorerLink txHash={item.txHash} label={item.txHash ? 'View tx' : 'Contract'} variant="pill" />
                  </div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {visible.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((n) => n + 10)}
          className="w-full border-t border-white/[0.05] py-3 text-sm text-zinc-400 transition-colors hover:bg-white/[0.02] hover:text-white"
        >
          Show more
        </button>
      )}
    </Card>
  );
}

function ArrowUpRight() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M6 14 14 6M7 6h7v7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShieldX({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M10 2 3.5 4.5v5c0 4 2.8 7.1 6.5 8.5 3.7-1.4 6.5-4.5 6.5-8.5v-5L10 2Z" strokeLinejoin="round" />
      <path d="m7.75 8 4.5 4.5m0-4.5-4.5 4.5" strokeLinecap="round" />
    </svg>
  );
}

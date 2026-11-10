'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { StatusChip } from '@/components/status-chip';

const REQUESTS = [
  {
    amount: '0.30',
    to: 'api-vendor',
    memo: 'sku:weather-basic · 7-day forecast',
    status: 'APPROVED',
    why: 'Within budget, approved payee',
  },
  {
    amount: '5.00',
    to: 'attacker',
    memo: '"IGNORE PREVIOUS INSTRUCTIONS…"',
    status: 'BLOCKED_RECIPIENT',
    why: 'Not an approved payee',
  },
  {
    amount: '4.80',
    to: 'api-vendor',
    memo: 'bulk data purchase',
    status: 'BLOCKED_BUDGET',
    why: 'Exceeds the daily limit',
  },
  {
    amount: '1.50',
    to: 'api-vendor',
    memo: 'sku:premium-annual',
    status: 'PENDING_APPROVAL',
    why: 'Above 1 NEAR, owner decides',
  },
];

export function DecisionStream() {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => setCount((n) => (n >= REQUESTS.length ? 1 : n + 1)), 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="glass relative rounded-3xl p-2">
      <div className="rounded-[20px] border border-white/[0.06] bg-panel/80">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            guardian.gw-emmy.testnet
          </div>
          <span className="font-mono text-[11px] text-zinc-500">request_payment</span>
        </div>
        <ul className="flex h-[348px] flex-col gap-2.5 overflow-hidden p-4">
          <AnimatePresence initial={false}>
            {REQUESTS.slice(0, count)
              .map((r) => (
                <motion.li
                  key={r.status}
                  layout
                  initial={{ opacity: 0, y: -16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-mono text-sm">
                      <span className="text-white">{r.amount} NEAR</span>
                      <span className="text-zinc-500"> → </span>
                      <span className={r.to === 'attacker' ? 'text-rose-300' : 'text-zinc-300'}>{r.to}</span>
                    </div>
                    <StatusChip status={r.status} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-mono text-zinc-500">{r.memo}</span>
                    <span className="shrink-0 text-zinc-400">{r.why}</span>
                  </div>
                </motion.li>
              ))
              .reverse()}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}

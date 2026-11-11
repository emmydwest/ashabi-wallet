'use client';

import { motion } from 'motion/react';
import { nearNumber } from '@/lib/near';
import type { WalletStatus } from '@/lib/types';

const RADIUS = 78;
const SWEEP = 0.75;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC = CIRCUMFERENCE * SWEEP;

function Arc({ from, to, color }: { from: number; to: number; color: string }) {
  const length = Math.max(0, to - from) * ARC;
  return (
    <motion.circle
      cx="100"
      cy="100"
      r={RADIUS}
      fill="none"
      stroke={color}
      strokeWidth="12"
      strokeLinecap="round"
      initial={{ strokeDasharray: `0 ${CIRCUMFERENCE}` }}
      animate={{ strokeDasharray: `${length} ${CIRCUMFERENCE}` }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      style={{ strokeDashoffset: -from * ARC }}
    />
  );
}

export function BudgetGauge({ status }: { status: WalletStatus }) {
  const limit = nearNumber(status.daily_limit);
  const spent = nearNumber(status.spent_today);
  const reserved = nearNumber(status.reserved);
  const scale = Math.max(limit, spent + reserved) || 1;
  const spentEnd = spent / scale;
  const reservedEnd = (spent + reserved) / scale;
  const remaining = nearNumber(status.remaining_today);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
      <div className="relative size-48 shrink-0">
        <svg viewBox="0 0 200 200" className="size-full rotate-[135deg]">
          <circle
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            stroke="rgb(255 255 255 / 0.07)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${ARC} ${CIRCUMFERENCE}`}
          />
          <Arc from={0} to={spentEnd} color="#3df2a6" />
          {reserved > 0 && <Arc from={spentEnd} to={reservedEnd} color="#fbbf24" />}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <span className="tabular font-mono text-3xl font-semibold tracking-tight text-white">
            {remaining.toFixed(2)}
          </span>
          <span className="mt-0.5 text-xs text-zinc-400">NEAR remaining today</span>
          {remaining <= 0 && <span className="text-xs text-rose-300">limit reached</span>}
        </div>
      </div>
      <dl className="grid w-full grid-cols-3 gap-3 text-sm sm:grid-cols-1">
        <Legend color="bg-emerald-400" label="Spent today" value={spent} />
        <Legend color="bg-amber-400" label="Waiting for owner" value={reserved} />
        <Legend color="bg-white/20" label="Daily limit" value={limit} />
      </dl>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div>
      <dt className="flex items-center gap-2 text-zinc-400">
        <span className={`size-2 rounded-full ${color}`} />
        {label}
      </dt>
      <dd className="tabular mt-0.5 pl-4 font-mono text-white">{value.toFixed(2)} NEAR</dd>
    </div>
  );
}

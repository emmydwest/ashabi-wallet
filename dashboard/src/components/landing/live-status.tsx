'use client';

import { Ban, ShieldCheck, Smartphone, UserCheck, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { useGuardian } from '@/components/use-guardian';
import { toNear } from '@/lib/near';
import { budgetToday } from '@/lib/stats';
import type { GuardianSnapshot } from '@/lib/types';
import { CountUp } from './count-up';

// The demo wallet's real state, refreshed every few seconds, shaped like the card in the hero.
export function LiveStatus({ initial }: { initial: GuardianSnapshot }) {
  const { snapshot } = useGuardian(8000, initial);
  const s = snapshot.status;
  const b = budgetToday(s);
  const paused = s.frozen || s.breaker_until !== null;

  return (
    <div className="glass glass-glow w-full rounded-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="size-5 text-emerald-300" aria-hidden />
          <span className="font-semibold text-white">Guardian Wallet</span>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-400">
          <span className="relative flex size-1.5" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
          </span>
          Live demo
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-zinc-400">Budget remaining today</span>
          <span className="whitespace-nowrap font-mono text-sm text-white tabular">
            {toNear(b.remaining)} <span className="text-zinc-500">of {toNear(b.limit)} NEAR</span>
          </span>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"
          role="progressbar"
          aria-label="Daily budget used"
          aria-valuenow={b.percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 shadow-[0_0_12px_rgb(61_242_166/0.6)] transition-[width] duration-700"
            style={{ width: `${Math.max(2, 100 - b.percent)}%` }}
          />
        </div>
      </div>

      <ul className="mt-5 space-y-2.5 text-sm">
        <Row icon={<UserCheck className="size-4" />} label="Approved recipients only">
          {s.approved_payees.length} {s.approved_payees.length === 1 ? 'account' : 'accounts'}
        </Row>
        <Row icon={<Smartphone className="size-4" />} label="Human approval">
          over {toNear(s.approval_threshold)} NEAR
        </Row>
        <Row icon={<Ban className="size-4" />} label="Requests blocked, all-time" tone="text-danger">
          <CountUp value={s.blocked_count} />
        </Row>
        <Row icon={<Wallet className="size-4" />} label="Payments accepted, all-time">
          <CountUp value={s.payment_count} />
        </Row>
      </ul>

      <div
        className={`mt-5 flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm font-medium ${
          paused
            ? 'border-pending/30 bg-pending/[0.08] text-pending'
            : 'border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-200'
        }`}
        role="status"
      >
        <ShieldCheck className="size-4 shrink-0" aria-hidden />
        {s.frozen
          ? 'Payments frozen by the owner'
          : s.breaker_until !== null
            ? 'Kill-switch on: payments paused for a few minutes'
            : 'Your AI is protected'}
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  tone = 'text-white',
  children,
}: {
  icon: ReactNode;
  label: string;
  tone?: string;
  children: ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2.5 text-zinc-300">
        <span className="grid size-7 place-items-center rounded-lg bg-white/[0.05] text-emerald-300" aria-hidden>
          {icon}
        </span>
        {label}
      </span>
      <span className={`whitespace-nowrap font-mono text-[13px] tabular ${tone}`}>{children}</span>
    </li>
  );
}

export function LiveStatusSkeleton() {
  return <div className="glass h-[23rem] w-full animate-pulse rounded-card" aria-hidden />;
}

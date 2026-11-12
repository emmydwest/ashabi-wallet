'use client';

import { useGuardian } from '@/components/use-guardian';
import { toNear } from '@/lib/near';
import { budgetToday } from '@/lib/stats';
import type { GuardianSnapshot } from '@/lib/types';
import { DemoWalletLabel } from '@/components/wallet/demo-wallet-label';
import { CountUp } from '@/components/count-up';

// Real numbers only, each with its scope: the shared demo wallet, or every wallet the factory made.
export function StatsStrip({ initial, wallets }: { initial: GuardianSnapshot; wallets: number | null }) {
  const { snapshot } = useGuardian(15000, initial);
  const s = snapshot.status;
  const b = budgetToday(s);
  const stats = [
    { value: s.payment_count, label: 'Payments accepted', scope: 'demo wallet, all-time' },
    { value: s.blocked_count, label: 'Requests blocked', scope: 'demo wallet, all-time', tone: 'text-danger' },
    {
      value: Number(toNear(b.used)),
      decimals: 2,
      unit: 'NEAR',
      label: 'Spent today',
      scope: `of ${toNear(b.limit)} NEAR, demo wallet`,
    },
    { value: wallets, label: 'Wallets created', scope: 'by the factory, all-time' },
  ];

  return (
    <div>
      <dl className="glass grid grid-cols-2 divide-white/[0.06] rounded-card lg:grid-cols-4 lg:divide-x">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={`px-5 py-5 sm:px-6 ${i < 2 ? 'border-b border-white/[0.06] lg:border-b-0' : ''} ${i % 2 === 0 ? 'border-r border-white/[0.06] lg:border-r-0' : ''}`}
        >
          <dt className="text-sm text-zinc-300">{stat.label}</dt>
          <dd className="mt-1.5">
            <span
              className={`font-display text-3xl font-semibold tracking-tight sm:text-4xl ${stat.tone ?? 'text-white'}`}
            >
              {stat.value === null ? '—' : <CountUp value={stat.value} decimals={stat.decimals} />}
            </span>
            {stat.unit && <span className="ml-1.5 text-sm text-zinc-400">{stat.unit}</span>}
          </dd>
          <dd className="mt-1 text-xs text-zinc-500">{stat.scope}</dd>
        </div>
      ))}
      </dl>
      <DemoWalletLabel className="mt-3 px-1" />
    </div>
  );
}

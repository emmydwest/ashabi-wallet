'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useGuardian } from '@/components/use-guardian';
import { timeAgo } from '@/lib/format';
import type { ActionLog } from '@/lib/types';
import { AgentTimeline } from './agent-timeline';
import { BlockedAttacks } from './blocked-attacks';
import { InjectionPanel } from './injection-panel';
import { BalanceCard, BudgetCard, PolicyCard } from './overview-cards';
import { PaymentFeed } from './payment-feed';

function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function DashboardView({ log }: { log: ActionLog }) {
  const { snapshot, error } = useGuardian();

  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-300/80">Live from the contract</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Guardian dashboard</h1>
        </div>
        <p className="font-mono text-xs text-zinc-400">
          {error ? (
            <span className="text-rose-300">RPC error: {error}</span>
          ) : snapshot ? (
            <>Updated {timeAgo(new Date(snapshot.fetchedAt))} · refreshes every 6s</>
          ) : (
            'Reading testnet…'
          )}
        </p>
      </div>

      {snapshot?.status.frozen && (
        <div className="mt-6 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          Spending is frozen by the owner. Every agent request is rejected until it is unfrozen.
        </div>
      )}

      {snapshot ? (
        <>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            <Reveal>
              <BalanceCard snapshot={snapshot} />
            </Reveal>
            <Reveal delay={0.05}>
              <BudgetCard snapshot={snapshot} />
            </Reveal>
            <Reveal delay={0.1}>
              <PolicyCard snapshot={snapshot} />
            </Reveal>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
            <Reveal delay={0.15}>
              <PaymentFeed feed={snapshot.feed} />
            </Reveal>
            <Reveal delay={0.2}>
              <BlockedAttacks feed={snapshot.feed} />
            </Reveal>
          </div>
        </>
      ) : (
        <Skeleton />
      )}

      <Reveal delay={0.25} className="mt-5">
        <AgentTimeline log={log} />
      </Reveal>
      <Reveal delay={0.3} className="mt-5">
        <InjectionPanel />
      </Reveal>
    </main>
  );
}

function Skeleton() {
  return (
    <div className="mt-8 grid gap-5 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="glass h-72 animate-pulse rounded-2xl" />
      ))}
    </div>
  );
}

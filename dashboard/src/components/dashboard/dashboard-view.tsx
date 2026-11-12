'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useGuardian } from '@/components/use-guardian';
import { TimeAgo } from '@/components/time-ago';
import { AsOf } from '@/components/as-of';
import type { ActionLog, GuardianSnapshot } from '@/lib/types';
import { AgentTimeline } from './agent-timeline';
import { KeyScopeBadge } from '@/components/keys/key-scope-badge';
import { BlockedAttacks } from './blocked-attacks';
import { InjectionPanel } from './injection-panel';
import { BalanceCard, BudgetCard, PolicyCard } from './overview-cards';
import { DemoWalletLabel } from '@/components/wallet/demo-wallet-label';
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

export function DashboardView({ log, initial }: { log: ActionLog; initial: GuardianSnapshot }) {
  const { snapshot, error } = useGuardian(6000, initial);

  return (
    <main className="mx-auto min-w-0 max-w-7xl px-5 pb-24 pt-10 sm:px-8">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-300/80">Live from the contract</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Guardian dashboard</h1>
          <DemoWalletLabel className="mt-3" />
        </div>
        {snapshot.stale || error ? (
          <AsOf snapshot={snapshot} offline={Boolean(error)} />
        ) : (
          <p className="font-mono text-xs text-zinc-400" suppressHydrationWarning>
            Updated <TimeAgo date={new Date(snapshot.fetchedAt)} at={new Date(snapshot.fetchedAt).getTime()} /> · refreshes every 6s
          </p>
        )}
      </div>

      {snapshot.status.frozen && (
        <div className="mt-6 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          Spending is frozen by the owner. Every agent request is rejected until it is unfrozen.
        </div>
      )}

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
            <PaymentFeed feed={snapshot.feed} now={new Date(snapshot.fetchedAt).getTime()} />
          </Reveal>
          <div className="min-w-0 space-y-5">
            <Reveal delay={0.2}>
              <BlockedAttacks feed={snapshot.feed} now={new Date(snapshot.fetchedAt).getTime()} />
            </Reveal>
            <Reveal delay={0.25}>
              <KeyScopeBadge />
            </Reveal>
          </div>
        </div>
      </>

      {/* The scripted terminal run predates the live console; keep it as reference, out of the way. */}
      <details className="group mt-8 rounded-2xl border border-white/10 bg-white/[0.02]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white">Recorded reference run</span>
            <span className="block text-xs text-zinc-400">
              The scripted three-act run and its poisoned page. The live version is on /agent.
            </span>
          </span>
          <span aria-hidden className="shrink-0 text-zinc-400 transition-transform group-open:rotate-180">
            ⌄
          </span>
        </summary>
        <div className="space-y-5 border-t border-white/[0.06] p-3 sm:p-5">
          <AgentTimeline log={log} />
          <InjectionPanel />
        </div>
      </details>
    </main>
  );
}

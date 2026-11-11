'use client';

import Link from 'next/link';
import { ExplorerLink } from '@/components/explorer-link';
import { TimeAgo } from '@/components/time-ago';
import { nsToDate, toNear } from '@/lib/near';
import { budgetToday, latestProof } from '@/lib/stats';
import type { FeedItem, GuardianSnapshot } from '@/lib/types';

export type ProofKind = 'paid' | 'hijack' | 'approval';

// Recorded runs from the README's proof table, shown if the live feed has none of a kind.
const REFERENCE: Record<ProofKind, string> = {
  paid: 'EUnUDq8NLvfdenULi2X2Q6XFc99ruA8xrDbEmSnmHMvN',
  hijack: 'AVTza2m9fpq6KWvUkUpu7Y2dAfoWqRYys4VA64aaLftb',
  approval: '8D6HW9p6eGudHSzNQnThAo7p2D2V3aqmh6KxVvUf46Ye',
};

const PRICE: Record<ProofKind, string | null> = { paid: '0.05', hijack: null, approval: '1.5' };

type Props = {
  snapshot: GuardianSnapshot;
  /** On /agent the buttons run the agent in place; elsewhere they link there. */
  onRun?: (kind: ProofKind) => void;
  busy?: boolean;
};

/** Why a live run wouldn't show the intended outcome right now, or null if it would. */
export function proofBlocker({ status }: GuardianSnapshot, kind: ProofKind): string | null {
  if (kind === 'hijack') return null;
  if (status.frozen || status.breaker_until !== null)
    return 'Spending is paused on the demo wallet right now, so the contract would refuse it.';
  const budget = budgetToday(status);
  if (!budget.canAfford(PRICE[kind]!))
    return `Today’s demo budget is used up (${toNear(budget.used)} of ${toNear(budget.limit)} NEAR), so the contract would refuse it until the budget resets at 00:00 UTC (1:00 AM WAT).`;
  const max = status.pending_rules?.max_pending ?? 0;
  if (kind === 'approval' && max > 0 && status.pending_count >= max)
    return 'Three requests are already waiting for the owner, the most the contract allows.';
  return null;
}

export function ProofFlow({ snapshot, onRun, busy = false }: Props) {
  const { feed } = snapshot;
  const latest = latestProof(feed);

  const blocker = (kind: ProofKind) => proofBlocker(snapshot, kind);

  const steps: {
    kind: ProofKind;
    n: string;
    title: string;
    body: string;
    action: string;
    item?: FeedItem;
    outcome: string;
    tone: string;
  }[] = [
    {
      kind: 'paid',
      n: 'A',
      title: 'An allowed payment goes through',
      body: 'The agent buys a 0.05 NEAR weather report from a vendor on the list. Within budget, so the contract pays it.',
      action: 'Run a real purchase',
      item: latest.paid,
      outcome: 'Paid',
      tone: 'text-safe',
    },
    {
      kind: 'hijack',
      n: 'B',
      title: 'A hijacked agent gets refused',
      body: 'A compromised agent tries to send 2 NEAR to an attacker. The contract refuses it and records the attempt.',
      action: 'Hijack the agent',
      item: latest.blocked,
      outcome: 'Refused',
      tone: 'text-danger',
    },
    {
      kind: 'approval',
      n: 'C',
      title: 'A big payment waits for the owner',
      body: '1.5 NEAR is over the 1 NEAR auto-pay limit, so it pauses. Nothing moves until the owner approves on their phone.',
      action: 'Ask for 1.5 NEAR',
      item: latest.approved,
      outcome: 'Approved by the owner, then paid',
      tone: 'text-pending',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {steps.map((step) => {
        const problem = blocker(step.kind);
        const target = step.item?.kind === 'payment' ? step.item.record : step.item?.attempt;
        const button =
          'block w-full rounded-xl py-3 text-center text-[15px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40';
        const style =
          step.kind === 'hijack' ? 'bg-danger text-ink hover:brightness-110' : 'bg-white text-ink hover:bg-zinc-200';
        return (
          <article key={step.kind} className="glass flex min-w-0 flex-col rounded-card p-5">
            <div className="flex items-center gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/[0.08] font-mono text-xs text-zinc-200">
                {step.n}
              </span>
              <h3 className="font-display text-[17px] font-semibold leading-snug text-white">{step.title}</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.body}</p>

            <div className="mt-4 rounded-xl bg-black/25 px-3 py-2.5 text-xs">
              <div className="text-zinc-500">{step.item ? 'Latest on the demo wallet' : 'Recorded run'}</div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-zinc-200" suppressHydrationWarning>
                  {target ? (
                    <>
                      <span className={step.tone}>{step.outcome}</span> · {toNear(target.amount)} NEAR ·{' '}
                      {<TimeAgo date={nsToDate(step.item!.at)} at={new Date(snapshot.fetchedAt).getTime()} />}
                    </>
                  ) : (
                    <span className={step.tone}>{step.outcome}</span>
                  )}
                </span>
                <ExplorerLink txHash={step.item?.txHash ?? REFERENCE[step.kind]} label="View tx" />
              </div>
            </div>

            {problem && (
              <p className="mt-3 text-xs leading-relaxed text-pending">
                {problem} The link above is the latest real one.
              </p>
            )}

            <div className="mt-auto pt-4">
              {onRun ? (
                <button
                  type="button"
                  onClick={() => onRun(step.kind)}
                  disabled={busy || Boolean(problem)}
                  className={`${button} ${style}`}
                >
                  {problem ? 'Not possible right now' : step.action}
                </button>
              ) : (
                <Link href={problem ? '/agent' : `/agent?try=${step.kind}`} className={`${button} ${style}`}>
                  {problem ? 'Open the Arena' : step.action}
                </Link>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

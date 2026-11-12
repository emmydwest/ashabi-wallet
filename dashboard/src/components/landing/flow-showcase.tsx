'use client';

import { useInView, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { FlowLabels } from '@/components/art/flow-labels';
import { PaymentFlow, type FlowState, type Payee } from '@/components/art/payment-flow';

type Case = { id: string; tab: string; state: FlowState; payee: Payee; title: string; body: string; dot: string };

const CASES: Case[] = [
  {
    id: 'paid',
    tab: 'Allowed',
    state: 'paid',
    payee: 'vendor',
    title: 'An approved shop, inside the budget',
    body: 'The contract checks the payee list, today’s budget and the speed cap, then pays the shop itself.',
    dot: 'bg-safe',
  },
  {
    id: 'blocked',
    tab: 'Attack',
    state: 'blocked',
    payee: 'attacker',
    title: 'A hijacked agent tries to pay a stranger',
    body: 'The payee isn’t on the list, so the contract refuses. Nothing moves, and the attempt is counted on-chain.',
    dot: 'bg-danger',
  },
  {
    id: 'pending',
    tab: 'Over the limit',
    state: 'pending',
    payee: 'vendor',
    title: 'A bigger buy waits for you',
    body: 'Anything over the auto-pay limit is parked in the contract until the owner signs from their own wallet.',
    dot: 'bg-pending',
  },
];

const CYCLE_MS = 4200;

// The three outcomes the contract can give, played on a loop while the section is on screen.
export function FlowShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [plays, setPlays] = useState(0);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (!inView || reduce || pinned) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % CASES.length);
      setPlays((p) => p + 1);
    }, CYCLE_MS);
    return () => clearInterval(timer);
  }, [inView, reduce, pinned]);

  const current = CASES[index];
  return (
    <div ref={ref} className="glass glass-glow overflow-hidden rounded-3xl px-4 py-5 sm:p-8">
      <div role="tablist" aria-label="Payment outcomes" className="flex flex-wrap gap-2">
        {CASES.map((c, i) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            onClick={() => {
              setIndex(i);
              setPlays((p) => p + 1);
              setPinned(true);
            }}
            className={`press inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              i === index
                ? 'border-white/25 bg-white/[0.08] text-white'
                : 'border-white/10 text-zinc-400 hover:border-white/20 hover:text-white'
            }`}
          >
            <span className={`size-1.5 rounded-full ${c.dot}`} />
            {c.tab}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-6 max-w-3xl">
        {inView || plays > 0 ? (
          <PaymentFlow state={current.state} payee={current.payee} playKey={plays} />
        ) : (
          <PaymentFlow state="idle" payee={current.payee} />
        )}
        <FlowLabels payee={current.payee === 'attacker' ? 'Attacker' : 'API shop'} />
      </div>

      {/* All three captions share one grid cell, so the card is always as tall as the longest and
          nothing below it jumps when the loop moves on. */}
      <div className="mx-auto mt-6 grid max-w-2xl text-center" aria-live="polite">
        {CASES.map((c) => (
          <div
            key={c.id}
            aria-hidden={c.id !== current.id}
            className={`[grid-area:1/1] ${c.id === current.id ? 'animate-in' : 'invisible'}`}
          >
            <h3 className="text-lg font-semibold tracking-tight text-white">{c.title}</h3>
            <p className="mt-1.5 leading-relaxed text-zinc-300">{c.body}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-center text-xs text-zinc-500">
        An illustration of the contract’s three answers.{' '}
        <Link href="/agent" className="text-zinc-300 underline-offset-4 hover:underline">
          Run them for real on the demo wallet
        </Link>
        .
      </p>
    </div>
  );
}

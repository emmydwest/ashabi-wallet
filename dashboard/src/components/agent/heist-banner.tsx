'use client';

import { toNear } from '@/lib/near';
import type { GuardianSnapshot } from '@/lib/types';
import { Mascot } from '@/components/mascot/mascot';

// Live numbers from the demo vault. The headline uses the contract's own
// `balance` (the account's NEAR), not a baked-in figure.
export function HeistBanner({
  snapshot,
  onAttack,
}: {
  snapshot: GuardianSnapshot;
  onAttack: () => void;
}) {
  const s = snapshot.status;
  const unknownPayee = snapshot.feed.filter(
    (item) => item.kind === 'blocked' && item.attempt.status === 'BLOCKED_RECIPIENT',
  ).length;
  const storedBlocked = snapshot.feed.filter((item) => item.kind === 'blocked').length;
  const allStored = s.blocked_count <= storedBlocked || storedBlocked >= 100;

  return (
    <section className="relative mt-8 overflow-hidden rounded-card border border-rose-400/25 bg-gradient-to-br from-rose-500/[0.08] via-black/20 to-emerald-400/[0.06] p-5 sm:p-6">
      <div aria-hidden className="absolute -right-16 -top-16 size-48 rounded-full bg-rose-400/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-rose-200/80">Public heist challenge</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span className="tabular-nums text-rose-100">{toNear(s.balance, 3)} NEAR</span> in the vault. Try to make
            the agent steal it.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
            This is NEAR testnet, no real money. The agent can only ask. The contract decides, and every attempt is
            recorded on-chain. Spendable after storage is {toNear(s.available_balance, 3)} NEAR.
          </p>
          <p className="mt-3 text-sm text-zinc-400">
            {unknownPayee} payment{unknownPayee === 1 ? '' : 's'} to unknown accounts blocked
            {allStored ? ', all-time' : ' in the latest records'}. {s.blocked_count} blocked request
            {s.blocked_count === 1 ? '' : 's'} in total, including budget and speed limits.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <Mascot mood="alert" size={88} decorative className="hidden sm:block" />
          <button
            type="button"
            onClick={onAttack}
            className="rounded-full border border-rose-300/40 bg-rose-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-rose-300"
          >
            Open the attacks
          </button>
        </div>
      </div>
    </section>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { ChallengeArena } from '@/components/challenge/challenge-arena';
import { CHALLENGE_VAULT, CONTRACT_ID } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Open attack challenge',
  description: 'Write any prompt injection you like. A live agent reads it, and the NEAR contract decides whether money moves.',
};

export default function ChallengePage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl px-4 pb-20 pt-8 sm:px-8 sm:pt-12">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-rose-300/80">Open challenge</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl">
        Talk the agent into paying you.
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-300">
        Type any injection. A live agent on free models reads it, and if it falls for it, its request goes to the vault
        contract on NEAR testnet. You see its reasoning, the contract’s verdict and the transaction.
      </p>

      <div className="mt-8">
        <ChallengeArena />
      </div>

      <section className="mt-12 space-y-3 text-sm leading-relaxed text-zinc-400">
        <h2 className="font-display text-xl font-semibold text-white">How this is set up</h2>
        <p>
          Attempts run on their own factory wallet, <span className="wrap-ids font-mono text-zinc-300">{CHALLENGE_VAULT}</span>,
          not the demo wallet <span className="wrap-ids font-mono text-zinc-300">{CONTRACT_ID}</span>, so a run of
          attacks here can’t pause the demo for anyone else. It has 0.3 NEAR a day, asks its owner above 0.1 NEAR, and
          pays only its two approved providers.
        </p>
        <p>
          The agent never buys anything in challenge mode. If it ignores your text, nothing is sent. If it falls for it
          and names a payee the provider would refuse, the run stops there. If it names any other account, the request
          goes to the contract, which refuses it and stores the attempt on-chain.
        </p>
        <p>
          The contract’s kill-switch is real here too: three refused requests to unknown accounts in a row trip it, and
          it refuses everything (<span className="font-mono">FROZEN</span>) for 3 minutes. Attempts during that time are
          still refused and recorded. Only the cooldown or the wallet’s owner can lift it; there is no public reset.
        </p>
        <p>
          Each visitor gets 3 attempts per 10 minutes, and the whole challenge stops for the day after 300 model calls to
          stay inside free tiers. Prefer preset attacks with fixed outcomes? They’re on{' '}
          <Link href="/agent" className="text-emerald-300 hover:text-emerald-200">
            /agent
          </Link>
          .
        </p>
      </section>
    </main>
  );
}

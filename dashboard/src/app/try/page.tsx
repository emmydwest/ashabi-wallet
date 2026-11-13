import type { Metadata } from 'next';
import Link from 'next/link';
import { TryFlow } from '@/components/try/try-flow';

export const metadata: Metadata = {
  title: 'Try it in 60 seconds',
  description: 'Get a sandbox Ashabi wallet in one tap, watch its agent buy live data, then watch the contract stop a hijack.',
};

export default function TryPage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-xl px-4 pb-20 pt-8 sm:pt-12">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand/80">Try it in 60 seconds</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        Your own agent wallet, no setup.
      </h1>
      <p className="mt-3 text-zinc-400">
        Tap once for a wallet on NEAR testnet. Its agent pays for live data, then gets hijacked, and the contract
        refuses the theft on-chain.
      </p>
      <div className="mt-8">
        <TryFlow />
      </div>
      <p className="mt-8 text-xs leading-relaxed text-zinc-500">
        Sandbox wallets were created ahead of time through <span className="font-mono">factory.gw-emmy.testnet</span>,
        each with 0.3 NEAR a day, a 0.1 NEAR approval threshold and two approved providers. You get one for 24 hours
        per network address. You use its agent but don’t own it: rule changes and approvals stay with its owner
        account. Want the owner side too? Create your own on <Link href="/start" className="text-emerald-300">/start</Link>{' '}
        with a testnet wallet.
      </p>
    </main>
  );
}

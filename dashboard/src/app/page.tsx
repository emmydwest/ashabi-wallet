import { ArrowRight, CircleCheck, Coins, ShieldAlert, Smartphone, Swords, Timer, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { AboveLimit } from '@/components/landing/above-limit';
import { Architecture } from '@/components/landing/architecture';
import { HeroStage } from '@/components/landing/hero-stage';
import { ProofFlow } from '@/components/proof/proof-flow';
import { LiveStatus } from '@/components/landing/live-status';
import { ScreensStrip } from '@/components/landing/screens-strip';
import { StatsStrip } from '@/components/landing/stats-strip';
import { Trust } from '@/components/landing/trust';
import { Economy } from '@/components/landing/economy';
import { OnChainFeed } from '@/components/on-chain-feed';
import { LiveChecks } from '@/components/verify/live-checks';
import { Mascot } from '@/components/mascot/mascot';
import { accountUrl, CONTRACT_ID } from '@/lib/config';
import { cachedSnapshot, cachedWalletCount } from '@/lib/server/cached-snapshot';

const RULES = [
  { icon: Coins, text: 'Daily budget' },
  { icon: UserCheck, text: 'Approved recipients only' },
  { icon: Smartphone, text: 'You OK the big ones' },
  { icon: Timer, text: '3 payments or 1 NEAR per 10 min' },
  { icon: ShieldAlert, text: '3-strike kill-switch' },
];

const STEPS = [
  {
    n: '01',
    icon: Coins,
    title: 'Set a budget',
    body: 'Choose how much your AI can spend in a day. The money sits in your own wallet, not with the AI.',
  },
  {
    n: '02',
    icon: UserCheck,
    title: 'Pick who it can pay',
    body: 'Only the shops and services you list. A trick on some web page can’t add a new one.',
  },
  {
    n: '03',
    icon: Smartphone,
    title: 'Approve big payments from your phone',
    body: 'Anything over your limit waits for a tap. One button freezes everything if something looks off.',
  },
  {
    n: '04',
    icon: Timer,
    title: 'Cap how fast it can pay',
    body: 'Automatic payments are limited to 3, or 1 NEAR, in any 10-minute window. Splitting a large payment into small pieces does not get around it.',
  },
  {
    n: '05',
    icon: ShieldAlert,
    title: 'A kill-switch for runaway agents',
    body: 'Three blocked unknown-payee requests in a row pause spending automatically. It cools down on its own, or the owner can reset it.',
  },
];

const COMPARISON = [
  ['Where the rules live', 'In the prompt', 'In a smart contract'],
  ['A hidden instruction on a web page', 'Can talk the model out of them', 'Changes nothing'],
  ['Who holds the money', 'The agent', 'The contract'],
  [
    'Split-payment attacks and runaway loops',
    "Can't track on-chain velocity",
    'A rolling 10-min cap, plus an automatic kill-switch',
  ],
  ['Proof of what happened', 'App logs', 'Public chain records'],
];

export default async function Home() {
  const [snapshot, wallets] = await Promise.all([cachedSnapshot(), cachedWalletCount()]);
  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
      <section className="grid grid-cols-1 items-center gap-10 pb-14 pt-10 lg:grid-cols-[1.1fr_1fr] lg:gap-8 lg:pb-20 lg:pt-20">
        <div className="min-w-0">
          <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs leading-snug text-zinc-200">
            <span className="size-1.5 shrink-0 rounded-full bg-brand" />
            Free to try on NEAR testnet
          </span>
          <h1 className="mt-6 font-display text-[2.45rem] font-semibold leading-[1.04] tracking-[-0.035em] text-balance text-white sm:text-6xl lg:text-[4.4rem]">
            Give your AI an allowance,
            <span className="glow-text block text-brand">not your bank password.</span>
          </h1>
          <div className="relative mx-auto mt-6 w-fit lg:hidden" aria-hidden>
            <div className="animate-glow absolute inset-6 rounded-full bg-emerald-400/25 blur-2xl" />
            <Mascot size={176} priority decorative className="animate-float relative" />
            <div className="mx-auto -mt-3 h-4 w-36 rounded-[50%] border border-emerald-300/60 bg-emerald-400/15 shadow-[0_0_24px_rgb(61_242_166/0.5)]" />
          </div>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-zinc-300 sm:text-lg">
            Let an AI assistant buy things for you with a budget you set. It can spend what you allow, with the people
            you allow, and it has to ask you before anything big.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="The rules">
            {RULES.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1.5 text-sm text-emerald-100"
              >
                <Icon className="size-4 text-emerald-300" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
          <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
            <Link
              href="/start"
              className="btn-brand inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-semibold transition-shadow"
            >
              Create your Ashabi wallet
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/agent?try=hijack"
              className="inline-flex items-center justify-center gap-2.5 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3.5 text-base font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.07]"
            >
              <span className="relative flex size-2.5" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-70" />
                <span className="relative inline-flex size-2.5 rounded-full bg-danger" />
              </span>
              See it survive an attack
            </Link>
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            Or{' '}
            <Link href="/chat" className="text-zinc-300 underline-offset-4 hover:underline">
              ask the live agent to buy something
            </Link>{' '}
            first.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-[36rem]">
          <div className="hidden lg:block">
            <HeroStage />
          </div>
          <div className="relative lg:-mt-28 lg:ml-auto lg:w-[21.5rem] xl:-mr-10">
            <LiveStatus initial={snapshot} />
          </div>
        </div>
      </section>

      <section aria-label="Live numbers" className="pt-4 lg:pt-10">
        <StatsStrip initial={snapshot} wallets={wallets} />
      </section>

      <section className="pt-24">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand/80">How it works</p>
        <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          The rules your AI can’t talk its way past.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map(({ n, icon: Icon, title, body }) => (
            <article key={n} className="glass rounded-card p-6 transition hover:border-emerald-400/25">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="font-mono text-sm text-zinc-500">{n}</span>
              </div>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-white">{title}</h3>
              <p className="mt-2 leading-relaxed text-zinc-300">{body}</p>
            </article>
          ))}
          <Link
            href="/agent?try=hijack"
            className="glass group relative flex flex-col overflow-hidden rounded-card border-danger/25 p-6 transition hover:border-danger/50"
          >
            <div aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-danger/15 blur-3xl" />
            <div className="relative flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-xl border border-danger/25 bg-danger/[0.08] text-danger">
                <Swords className="size-5" aria-hidden />
              </span>
              <Mascot mood="blocked" size={56} decorative />
            </div>
            <h3 className="relative mt-6 text-lg font-semibold tracking-tight text-white">Watch the attack demo</h3>
            <p className="relative mt-2 leading-relaxed text-zinc-300">
              We hide a “send the money elsewhere” order in a web page and let the agent read it. The contract says no.
            </p>
            <span className="relative mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-danger">
              Hijack the agent
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        </div>
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-zinc-400">
          Under the hood: the rules live in a NEAR smart contract that holds the money. Your AI’s key can only ask that
          contract for a payment. It can’t move funds or change the rules, even if it’s fully hijacked. The same contract
          enforces a rolling 10-minute payment cap and an automatic kill-switch.{' '}
          <a href={accountUrl(CONTRACT_ID)} target="_blank" rel="noreferrer" className="text-emerald-300">
            See the demo contract ↗
          </a>
        </p>
      </section>

      <section id="proof" className="pt-24">
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-brand/80">
          <CircleCheck className="size-4" aria-hidden />
          Proof, not promises
        </p>
        <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Three things to see for yourself.
        </h2>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Each one is a real transaction on the demo wallet. Tap to run it live, or open the latest one on NearBlocks.
        </p>
        <div className="mt-8">
          <ProofFlow snapshot={snapshot} />
        </div>
      </section>

      <section id="activity" className="pt-24">
        <OnChainFeed initial={snapshot} />
      </section>

      <section id="verify" className="pt-24">
        <LiveChecks compact />
      </section>

      <section className="pt-24">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand/80">The app</p>
        <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Built for your phone.
        </h2>
        <div className="mt-8">
          <ScreensStrip />
        </div>
      </section>

      <section className="pt-24">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-pending/90">Above your limit</p>
        <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          What happens when your AI wants to spend more.
        </h2>
        <div className="mt-8">
          <AboveLimit />
        </div>
      </section>

      <section className="pt-24">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand/80">Who can do what</p>
        <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          The AI can ask. Only the contract can pay.
        </h2>
        <div className="mt-8">
          <Architecture />
        </div>
      </section>

      <section className="pt-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand/80">Why a contract</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Prompts can be argued with. Code can&apos;t.
            </h2>
            <p className="mt-4 leading-relaxed text-zinc-300">
              Most agent safety lives in the system prompt or in a second model acting as a judge. Both can be
              jailbroken. Ashabi Wallet moves the rules to where the money is.
            </p>
          </div>
          <ul className="space-y-3 sm:hidden">
            {COMPARISON.map(([label, prompt, guardian]) => (
              <li key={label} className="glass rounded-2xl p-4">
                <div className="text-sm font-medium text-white">{label}</div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-zinc-400">Prompt guardrails</div>
                    <div className="mt-1 text-zinc-300">{prompt}</div>
                  </div>
                  <div>
                    <div className="text-xs text-emerald-300">Ashabi Wallet</div>
                    <div className="mt-1 text-white">{guardian}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="glass hidden overflow-hidden rounded-2xl sm:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-zinc-400">
                  <th className="px-5 py-3 font-normal" />
                  <th className="px-5 py-3 font-normal">Prompt guardrails</th>
                  <th className="px-5 py-3 font-medium text-emerald-300">Ashabi Wallet</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(([label, prompt, guardian]) => (
                  <tr key={label} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-5 py-4 text-zinc-300">{label}</td>
                    <td className="px-5 py-4 text-zinc-400">{prompt}</td>
                    <td className="px-5 py-4 text-white">{guardian}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="pt-24">
        <Economy />
      </section>

      <section className="pt-24">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand/80">Trust</p>
        <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Open, tested, and honest about its limits.
        </h2>
        <div className="mt-8">
          <Trust />
        </div>
      </section>

      <section className="glass glass-glow relative mt-24 overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12">
        <div
          aria-hidden
          className="absolute inset-x-0 -top-24 mx-auto h-48 w-2/3 rounded-full bg-emerald-400/20 blur-3xl"
        />
        <Mascot mood="approved" size={96} decorative className="relative mx-auto mb-4" />
        <h2 className="relative font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Set it up in a minute. It’s free on testnet.
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-zinc-300">
          Connect a NEAR testnet wallet, pick a budget, and your assistant is ready to shop. Everything it does shows up
          on a public record, linked to its transaction.
        </p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/start"
            className="btn-brand whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-shadow"
          >
            Create your Ashabi wallet
          </Link>
          <Link
            href="/agent"
            className="whitespace-nowrap rounded-full border border-white/15 px-5 py-2.5 text-sm text-zinc-100 transition hover:border-white/25"
          >
            Attack the demo agent
          </Link>
          <Link
            href="/verify"
            className="whitespace-nowrap rounded-full border border-white/15 px-5 py-2.5 text-sm text-zinc-100 transition hover:border-white/25"
          >
            Verify on NEAR
          </Link>
          <Link
            href="/dashboard"
            className="whitespace-nowrap rounded-full border border-white/15 px-5 py-2.5 text-sm text-zinc-100 transition hover:border-white/25"
          >
            Live dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}


import Link from 'next/link';
import { DecisionStream } from '@/components/landing/decision-stream';
import { accountUrl, CONTRACT_ID } from '@/lib/config';

const STEPS = [
  {
    n: '01',
    title: 'The agent asks',
    body: 'Your AI agent plans the task and calls request_payment. Its key can do nothing else: no transfers, no policy changes.',
  },
  {
    n: '02',
    title: 'The contract decides',
    body: 'A NEAR smart contract holds the funds and checks the payee list, the daily budget and the approval threshold. No AI involved.',
  },
  {
    n: '03',
    title: 'You stay in control',
    body: 'Large payments wait for your approval from your phone. One tap freezes all spending. Every decision is on-chain.',
  },
];

const COMPARISON = [
  ['Where the rules live', 'In the prompt', 'In a smart contract'],
  ['A hidden instruction on a web page', 'Can talk the model out of them', 'Changes nothing'],
  ['Who holds the money', 'The agent', 'The contract'],
  ['Proof of what happened', 'App logs', 'Public chain records'],
];

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-5 pb-28 sm:px-8">
      <section className="grid items-center gap-14 pb-20 pt-16 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-300">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Built at NEAR HACKATHON · AI Security &amp; Agent Economy
          </span>
          <h1 className="mt-6 text-[2.75rem] font-semibold leading-[1.04] tracking-[-0.035em] text-white sm:text-6xl lg:text-[4.25rem]">
            Give AI the freedom to act.
            <span className="text-gradient block">Never the freedom to overspend.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
            Guardian Wallet lets an AI agent pay for things on NEAR without ever holding the money. A smart contract
            enforces your spending rules, so even a fully compromised agent cannot spend outside them.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-ink shadow-[0_0_40px_-8px_rgba(110,231,183,0.6)] transition hover:bg-emerald-100"
            >
              Open the live dashboard
            </Link>
            <a
              href={accountUrl(CONTRACT_ID)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/12 px-5 py-2.5 text-sm text-zinc-200 transition hover:border-white/25 hover:text-white"
            >
              Contract on NearBlocks
            </a>
          </div>
        </div>
        <DecisionStream />
      </section>

      <section className="border-t border-white/[0.06] pt-20">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-300/80">How it works</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          The agent can ask. Only the contract can pay.
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((step) => (
            <article key={step.n} className="glass group rounded-2xl p-6 transition hover:border-white/15">
              <span className="font-mono text-sm text-emerald-300/80">{step.n}</span>
              <h3 className="mt-6 text-xl font-semibold tracking-tight text-white">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-zinc-400">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pt-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-300/80">Why a contract</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Prompts can be argued with. Code can&apos;t.
            </h2>
            <p className="mt-4 leading-relaxed text-zinc-400">
              Most agent safety lives in the system prompt or in a second model acting as a judge. Both can be
              jailbroken. Guardian Wallet moves the rules to where the money is.
            </p>
          </div>
          <div className="glass overflow-hidden rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-zinc-500">
                  <th className="px-5 py-3 font-normal" />
                  <th className="px-5 py-3 font-normal">Prompt guardrails</th>
                  <th className="px-5 py-3 font-medium text-emerald-300">Guardian Wallet</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(([label, prompt, guardian]) => (
                  <tr key={label} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-5 py-4 text-zinc-400">{label}</td>
                    <td className="px-5 py-4 text-zinc-500">{prompt}</td>
                    <td className="px-5 py-4 text-white">{guardian}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="glass relative mt-24 overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12">
        <div
          aria-hidden
          className="absolute inset-x-0 -top-24 mx-auto h-48 w-2/3 rounded-full bg-emerald-400/20 blur-3xl"
        />
        <h2 className="relative text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Watch it stop a real attack on testnet.
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-zinc-400">
          The dashboard reads the contract live: balances, the budget, every payment and every blocked attempt, each
          linked to its transaction.
        </p>
        <div className="relative mt-8 flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-emerald-100"
          >
            Open dashboard
          </Link>
          <Link
            href="/approve"
            className="rounded-full border border-white/12 px-5 py-2.5 text-sm text-zinc-200 transition hover:border-white/25"
          >
            Owner approvals
          </Link>
        </div>
      </section>

      <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 text-sm text-zinc-500">
        <span>Guardian Wallet · NEAR testnet</span>
        <span className="font-mono text-xs">{CONTRACT_ID}</span>
      </footer>
    </main>
  );
}

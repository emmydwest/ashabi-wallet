import type { Metadata } from 'next';
import Link from 'next/link';
import { KeyScopeBadge } from '@/components/keys/key-scope-badge';
import { LiveChecks } from '@/components/verify/live-checks';
import { LockStatus } from '@/components/verify/lock-status';
import { cachedSnapshot } from '@/lib/server/cached-snapshot';
import { accountUrl, AGENT_ID, CONTRACT_ID } from '@/lib/config';
import { PROOF_GROUPS, PROOFS, proofUrl } from '@/lib/proofs';

export const metadata: Metadata = {
  title: 'Verify',
  description: 'Live NEAR RPC checks and every on-chain proof transaction for Ashabi Wallet.',
};

export default async function VerifyPage() {
  const initial = await cachedSnapshot();
  return (
    <main className="mx-auto min-w-0 max-w-4xl px-5 pb-24 pt-10 sm:px-8 sm:pt-16">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand/80">Verify</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
        Verify it yourself, on NEAR.
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-300">
        The checks below query a public testnet RPC from your browser. Under that is every proof transaction this
        project has published, each with a NearBlocks link. No keys needed.
      </p>
      <p className="mt-3 text-sm text-zinc-500">
        Contract{' '}
        <a href={accountUrl(CONTRACT_ID)} target="_blank" rel="noreferrer" className="wrap-ids font-mono text-emerald-300">
          {CONTRACT_ID} ↗
        </a>
        {' · '}
        Agent{' '}
        <a href={accountUrl(AGENT_ID)} target="_blank" rel="noreferrer" className="wrap-ids font-mono text-emerald-300">
          {AGENT_ID} ↗
        </a>
      </p>

      <div className="mt-10">
        <LockStatus initial={initial} />
      </div>

      <KeyScopeBadge className="mt-6" />

      <div className="mt-6">
        <LiveChecks />
      </div>

      <section className="mt-16">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand/80">On-chain proofs</p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white">
          Every published transaction.
        </h2>
        <p className="mt-2 max-w-2xl text-zinc-400">
          These are historical, but they are real. Open any row on NearBlocks. New runs on{' '}
          <Link href="/agent" className="text-emerald-300 hover:text-emerald-200">
            /agent
          </Link>{' '}
          add their own “View tx” links on top of this list.
        </p>
        <div className="mt-8 space-y-10">
          {PROOF_GROUPS.map((group) => (
            <div key={group.id}>
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-400">{group.label}</h3>
              <ul className="mt-3 divide-y divide-white/[0.06] overflow-hidden rounded-card border border-white/10">
                {PROOFS.filter((p) => p.group === group.id).map((proof) => (
                  <li
                    key={proof.tx}
                    className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="text-sm leading-snug text-white">{proof.title}</div>
                      <div className="mt-1 font-mono text-xs text-zinc-500">{proof.status}</div>
                    </div>
                    <a
                      href={proofUrl(proof.tx)}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 font-mono text-xs text-emerald-300 hover:text-emerald-200"
                    >
                      {proof.tx.slice(0, 8)}… ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

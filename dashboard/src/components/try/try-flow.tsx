'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, LoaderCircle, MessageCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { AgentArt, VaultArt } from '@/components/art/pieces';
import { ExplorerLink } from '@/components/explorer-link';
import { RunFlow } from '@/components/agent/run-flow';
import { RunTimeline } from '@/components/agent/run-timeline';
import { useAgentRun } from '@/components/agent/use-agent-run';
import { useGuardian } from '@/components/use-guardian';
import { accountUrl, OPEN_DATA_ID } from '@/lib/config';
import { toNear } from '@/lib/near';

type Sandbox = { vault: string; since: number; shared: boolean };
type Job = 'buy' | 'hijack';

const KEY = 'ashabi:sandbox';
const BUY_TASK = 'How clean is the air in Lagos right now? Buy the live reading.';

export function TryFlow() {
  const [sandbox, setSandbox] = useState<Sandbox | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A visitor who already has one gets it straight back.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Sandbox | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && Date.now() - saved.since < 23 * 60 * 60 * 1000) setSandbox(saved);
    } catch {
      /* nothing saved */
    }
  }, []);

  const claim = useCallback(async () => {
    setClaiming(true);
    setError(null);
    try {
      const res = await fetch('/api/try', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
      localStorage.setItem(KEY, JSON.stringify(body));
      setSandbox(body as Sandbox);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setClaiming(false);
    }
  }, []);

  if (!sandbox) {
    return (
      <div className="glass animate-in rounded-card p-6 text-center sm:p-8">
        <div className="flex items-end justify-center gap-1">
          <AgentArt pose="idle" size={88} className="animate-float-sm" />
          <VaultArt size={88} />
        </div>
        <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-white">One tap, your own wallet</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
          A sandbox Ashabi wallet on NEAR testnet, with its own agent and 0.3 NEAR a day to spend. No wallet app, no
          sign-up, no faucet.
        </p>
        <button
          type="button"
          onClick={() => void claim()}
          disabled={claiming}
          className="press mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-black shadow-[0_0_40px_-8px_rgba(52,211,153,0.7)] transition hover:bg-emerald-300 disabled:opacity-60"
        >
          {claiming ? <LoaderCircle className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
          {claiming ? 'Finding your wallet…' : 'Give me a wallet'}
        </button>
        {error && <p className="mt-4 text-sm text-amber-200">{error}</p>}
      </div>
    );
  }
  return <SandboxWallet sandbox={sandbox} />;
}

function SandboxWallet({ sandbox }: { sandbox: Sandbox }) {
  const { snapshot, refresh } = useGuardian(10_000, null, sandbox.vault);
  const [name, ...rest] = sandbox.vault.split('.');
  // Until the first fetch lands the hook holds the demo wallet's saved state; don't show its numbers.
  const live = snapshot.status.agent_id === `${name}-agent.${rest.join('.')}`;
  const status = live ? snapshot.status : null;
  const run = useAgentRun(refresh);
  const [job, setJob] = useState<Job | null>(null);
  const [runs, setRuns] = useState(0);

  const start = (next: Job) => {
    setJob(next);
    setRuns((n) => n + 1);
    void run.run(next === 'buy' ? { mode: 'task', task: BUY_TASK } : { mode: 'hijack' }, sandbox.vault);
  };

  return (
    <div className="space-y-5">
      <section className="glass animate-in rounded-card p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <VaultArt size={64} />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand/80">Your sandbox wallet</p>
            <a
              href={accountUrl(sandbox.vault)}
              target="_blank"
              rel="noreferrer"
              className="wrap-ids mt-1 block font-mono text-sm text-emerald-300 hover:text-emerald-200"
            >
              {sandbox.vault} ↗
            </a>
            <p className="mt-1 text-xs text-zinc-500">
              Made by the factory, owned by the project’s sandbox account, yours to use for 24 hours.
              {sandbox.shared ? ' Every sandbox is taken, so this one is shared with another visitor.' : ''}
            </p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Figure label="Left today" value={status ? `${toNear(status.remaining_today)} Ⓝ` : '…'} />
          <Figure label="Asks above" value={status ? `${toNear(status.approval_threshold)} Ⓝ` : '…'} />
          <Figure label="Payees" value={status ? String(status.approved_payees.length) : '…'} />
        </dl>
      </section>

      <section className="glass rounded-card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-white">Make it spend, then make it steal</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Both are real testnet transactions from your wallet’s own agent key.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <JobButton
            onClick={() => start('buy')}
            disabled={run.running}
            active={job === 'buy' && run.running}
            title="1. Buy live Lagos air quality"
            note={`0.05 NEAR to ${OPEN_DATA_ID}, over HTTP 402`}
          />
          <JobButton
            onClick={() => start('hijack')}
            disabled={run.running}
            active={job === 'hijack' && run.running}
            danger
            title="2. Hijack the agent"
            note="It tries to send 2 NEAR to an attacker"
          />
        </div>
        {run.quota && (
          <p className="mt-2 text-xs text-zinc-500">
            {run.quota.left} of {run.quota.limit} runs left for you in this 10-minute window.
          </p>
        )}

        {(run.running || run.summary || run.error) && (
          <div className="mt-5">
            <RunFlow steps={run.steps} summary={run.summary} running={run.running} status={status ?? undefined} runs={runs} />
            {run.summary && (
              <div
                className={`animate-in mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-sm ${
                  run.summary.verdict === 'APPROVED'
                    ? 'border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-100'
                    : 'border-rose-400/25 bg-rose-400/[0.07] text-rose-100'
                }`}
              >
                <span>{run.summary.headline ?? run.summary.message ?? run.summary.verdict ?? 'Nothing was sent.'}</span>
                {run.summary.txHash && <ExplorerLink txHash={run.summary.txHash} label="View tx" variant="pill" />}
              </div>
            )}
            {run.error && <p className="mb-4 text-sm text-amber-200">{run.error}</p>}
            <RunTimeline steps={run.steps} running={run.running} />
          </div>
        )}
      </section>

      <Link
        href={`/chat?vault=${encodeURIComponent(sandbox.vault)}`}
        className="press glass flex items-center gap-3 rounded-card p-5 transition hover:border-emerald-300/30"
      >
        <MessageCircle className="size-6 shrink-0 text-emerald-300" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-white">3. Chat with it</span>
          <span className="block text-sm text-zinc-400">Ask for exchange rates, try to talk it into paying you.</span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-zinc-500" />
      </Link>
      <Link
        href="/challenge"
        className="press glass flex items-center gap-3 rounded-card p-5 transition hover:border-rose-300/30"
      >
        <ShieldAlert className="size-6 shrink-0 text-rose-300" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-white">4. Write your own injection</span>
          <span className="block text-sm text-zinc-400">The open challenge: any text, a live agent, the chain’s verdict.</span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-zinc-500" />
      </Link>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/30 px-2 py-3">
      <dt className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</dt>
      <dd className="mt-1 font-display text-lg font-semibold tabular-nums text-white">{value}</dd>
    </div>
  );
}

function JobButton({
  title,
  note,
  onClick,
  disabled,
  active,
  danger,
}: {
  title: string;
  note: string;
  onClick: () => void;
  disabled: boolean;
  active: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`press rounded-2xl border px-4 py-3 text-left transition disabled:opacity-60 ${
        danger
          ? 'border-rose-400/25 bg-rose-400/[0.06] hover:border-rose-300/50'
          : 'border-emerald-400/25 bg-emerald-400/[0.06] hover:border-emerald-300/50'
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-white">
        {active && <LoaderCircle className="size-4 animate-spin" />}
        {title}
      </span>
      <span className="wrap-ids mt-0.5 block text-xs text-zinc-400">{note}</span>
    </button>
  );
}

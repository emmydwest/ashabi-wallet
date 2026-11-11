'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, CircleAlert, LoaderCircle, RefreshCw, X } from 'lucide-react';
import { runLiveChecks, type CheckState, type LiveCheck, type VerifyResult } from '@/lib/verify-on-chain';

const TONE: Record<CheckState, string> = {
  pass: 'border-emerald-400/25 bg-emerald-400/[0.06]',
  warn: 'border-amber-400/30 bg-amber-400/[0.07]',
  fail: 'border-rose-400/30 bg-rose-400/[0.07]',
};

const ICON_TONE: Record<CheckState, string> = {
  pass: 'bg-emerald-400 text-black',
  warn: 'bg-amber-400 text-black',
  fail: 'bg-rose-400 text-black',
};

function Icon({ state }: { state: CheckState }) {
  const IconShape = state === 'pass' ? Check : state === 'warn' ? CircleAlert : X;
  return (
    <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${ICON_TONE[state]}`}>
      <IconShape className="size-3" strokeWidth={3} aria-hidden />
    </span>
  );
}

export function LiveChecks({ compact = false }: { compact?: boolean }) {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      setResult(await runLiveChecks());
    } catch (e) {
      setResult(null);
      setError((e as Error).message ?? 'The testnet RPC did not answer.');
    } finally {
      setRunning(false);
    }
  }, []);

  // Start on mount, and again if the panel scrolls into view before the first run finished starting.
  useEffect(() => {
    const start = () => {
      if (started.current) return;
      started.current = true;
      void run();
    };
    start();
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) start();
      },
      { rootMargin: '120px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [run]);

  return (
    <div ref={root} className="glass rounded-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand/80">Verify live on NEAR</p>
          <h2 className="mt-1.5 font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Don’t trust this UI. Check the chain yourself.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            These checks run in your browser against a public testnet RPC. A green tick means the call succeeded
            and the claim held. If something fails, you’ll see the error, not a mock.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-sm text-zinc-200 transition hover:border-white/30 disabled:opacity-50"
        >
          {running ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {running ? 'Checking' : result ? 'Run again' : 'Run the checks'}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-sm text-amber-100">
          Could not reach a testnet RPC: {error}
        </p>
      )}

      {running && !result && (
        <ul className="mt-5 space-y-2" aria-hidden>
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="h-[4.25rem] animate-pulse rounded-2xl bg-white/[0.04]" />
          ))}
        </ul>
      )}

      {result && (
        <ul className="mt-5 space-y-2">
          {result.checks.map((check) => (
            <CheckRow key={check.id} check={check} compact={compact} />
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <span>
          {result
            ? `Last run ${new Date(result.fetchedAt).toLocaleTimeString()}`
            : running
              ? 'Checking the chain…'
              : error
                ? 'Could not reach the chain. Try again.'
                : 'Starting the checks…'}
        </span>
        {compact && (
          <Link href="/verify" className="text-emerald-300 hover:text-emerald-200">
            Every proof transaction ↗
          </Link>
        )}
      </div>
    </div>
  );
}

function CheckRow({ check, compact }: { check: LiveCheck; compact: boolean }) {
  return (
    <li className={`rounded-2xl border px-4 py-3 ${TONE[check.state]}`}>
      <div className="flex gap-3">
        <Icon state={check.state} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-white">{check.title}</h3>
            <StatePill state={check.state} />
          </div>
          <p className="wrap-ids mt-1 text-sm leading-relaxed text-zinc-300">{check.summary}</p>
          {check.detail && !compact && <p className="wrap-ids mt-1 text-xs leading-relaxed text-zinc-400">{check.detail}</p>}
          {check.detail && compact && (
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-200">More</summary>
              <p className="wrap-ids mt-1 text-xs leading-relaxed text-zinc-400">{check.detail}</p>
            </details>
          )}
        </div>
      </div>
    </li>
  );
}

function StatePill({ state }: { state: CheckState }) {
  const label = state === 'pass' ? 'Live, holds' : state === 'warn' ? 'Live, with a caveat' : 'Did not hold';
  const cls =
    state === 'pass'
      ? 'bg-emerald-400/15 text-emerald-200'
      : state === 'warn'
        ? 'bg-amber-400/15 text-amber-200'
        : 'bg-rose-400/15 text-rose-200';
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{label}</span>;
}

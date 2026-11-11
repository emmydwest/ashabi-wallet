'use client';

import { useState } from 'react';
import { AGENT_ID, RPC_URL } from '@/lib/config';
import { canonical, intentHash, INTENT_PREFIX_LENGTH, memoIntent, type IntentLog } from '@/lib/agent/intent';

type Result =
  | { state: 'idle' | 'checking' }
  | { state: 'match' | 'mismatch'; computed: string; onChain: string | null; memo: string }
  | { state: 'error'; message: string };

async function memoOf(txHash: string) {
  for (const url of [...new Set([RPC_URL, 'https://test.rpc.fastnear.com'])]) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'intent',
          method: 'tx',
          params: { tx_hash: txHash, sender_account_id: AGENT_ID, wait_until: 'EXECUTED_OPTIMISTIC' },
        }),
      });
      const body = await res.json();
      const args = body.result?.transaction?.actions?.[0]?.FunctionCall?.args;
      if (args) return String(JSON.parse(atob(args)).memo ?? '');
    } catch {
      // next RPC
    }
  }
  throw new Error('Could not read the transaction from a testnet RPC.');
}

// Recomputes the intent hash in this browser and compares it with the memo stored on-chain.
// It is an audit-trail commitment: it proves the log was not edited after the payment.
export function VerifyIntent({ log, hash, txHash }: { log: IntentLog; hash: string; txHash: string }) {
  const [result, setResult] = useState<Result>({ state: 'idle' });

  const verify = async (entry: IntentLog) => {
    setResult({ state: 'checking' });
    try {
      const [computed, memo] = await Promise.all([intentHash(entry), memoOf(txHash)]);
      const onChain = memoIntent(memo);
      setResult({
        state: onChain === computed.slice(0, INTENT_PREFIX_LENGTH) ? 'match' : 'mismatch',
        computed,
        onChain,
        memo,
      });
    } catch (e) {
      setResult({ state: 'error', message: (e as Error).message });
    }
  };

  const tone =
    result.state === 'match'
      ? 'border-emerald-400/30 bg-emerald-400/[0.06]'
      : result.state === 'mismatch'
        ? 'border-rose-400/30 bg-rose-400/[0.06]'
        : 'border-white/10 bg-white/[0.02]';

  return (
    <div className={`mt-4 rounded-2xl border p-4 ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">Intent hash</div>
          <div className="font-mono text-xs text-zinc-400">
            intent:{hash.slice(0, INTENT_PREFIX_LENGTH)} · audit-trail commitment (SHA-256 of the run log)
          </div>
        </div>
        <button
          type="button"
          onClick={() => verify(log)}
          disabled={result.state === 'checking'}
          className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-black disabled:opacity-50"
        >
          {result.state === 'checking' ? 'Checking' : 'Verify intent'}
        </button>
      </div>

      {result.state === 'match' && (
        <p className="mt-3 flex items-start gap-2 text-sm text-emerald-100">
          <span className="mt-0.5 rounded-full bg-emerald-400 px-2 py-0.5 text-[11px] font-bold text-black">
            Verified
          </span>
          <span>SHA-256 of this log, computed in your browser, matches the intent tag in the on-chain memo.</span>
        </p>
      )}
      {result.state === 'mismatch' && (
        <p className="mt-3 flex items-start gap-2 text-sm text-rose-100">
          <span className="mt-0.5 rounded-full bg-rose-400 px-2 py-0.5 text-[11px] font-bold text-black">Mismatch</span>
          <span>
            This log hashes to {result.computed.slice(0, 16)}, the chain says {result.onChain ?? 'nothing'}.
          </span>
        </p>
      )}
      {result.state === 'error' && <p className="mt-3 text-sm text-amber-200">{result.message}</p>}

      <details className="mt-3 rounded-lg border border-white/[0.07] bg-black/30">
        <summary className="cursor-pointer list-none px-3 py-1.5 font-mono text-xs text-zinc-300">
          View the log that was hashed
        </summary>
        <pre className="overflow-x-auto whitespace-pre-wrap break-words border-t border-white/[0.06] px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-300">
          {canonical(log)}
        </pre>
        {(result.state === 'match' || result.state === 'mismatch') && (
          <p className="break-words border-t border-white/[0.06] px-3 py-2 font-mono text-[11px] text-zinc-400">
            on-chain memo: {result.memo}
          </p>
        )}
      </details>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { KeyRound, LoaderCircle, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { ExplorerLink } from '@/components/explorer-link';
import { accountUrl, AGENT_ID, CONTRACT_ID } from '@/lib/config';
import { readKeyScope, shortKey, type KeyScope } from '@/lib/key-scope';
import { toNear } from '@/lib/near';

const CANNOT = ['send NEAR', 'attach a deposit', 'add or delete keys', 'deploy code', 'call owner methods'];

export function KeyScopeBadge({ className = '' }: { className?: string }) {
  const [scope, setScope] = useState<KeyScope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setScope(await readKeyScope());
    } catch (e) {
      setError((e as Error).message || 'The testnet RPC did not answer.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <section className={`glass min-w-0 rounded-2xl p-4 sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-emerald-300/80">
            Agent key scope · live
          </p>
          <h2 className="mt-1 text-base font-semibold text-white">What the agent’s key can sign</h2>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Read the keys again"
          className="grid size-8 shrink-0 place-items-center rounded-full border border-white/12 text-zinc-300 transition hover:border-white/30 disabled:opacity-50"
        >
          {loading ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-3 py-2 text-sm text-amber-100">
          Could not read the keys: {error}
        </p>
      )}
      {!scope && !error && <div className="mt-4 h-28 animate-pulse rounded-xl bg-white/[0.04]" aria-hidden />}
      {scope && <ScopeDetails scope={scope} />}
    </section>
  );
}

function ScopeDetails({ scope }: { scope: KeyScope }) {
  const key = scope.scoped.find((k) => k.publicKey === scope.signedBy?.publicKey) ?? scope.scoped[0];
  return (
    <div className="mt-4 space-y-3">
      {key ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] px-3 py-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-300" aria-hidden />
          <div className="min-w-0 text-sm leading-relaxed">
            <p className="font-semibold text-white">
              FunctionCall key · <span className="font-mono">request_payment</span> only
            </p>
            <p className="wrap-ids mt-0.5 text-zinc-300">
              Scoped to <span className="font-mono text-emerald-200">{key.receiverId}</span>
              {key.allowance && <> · {toNear(key.allowance)} NEAR gas allowance left</>}
            </p>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-rose-400/30 bg-rose-400/[0.07] px-3 py-3 text-sm text-rose-100">
          No key on {AGENT_ID} is limited to request_payment on {CONTRACT_ID}.
        </p>
      )}

      <SignedByRow scope={scope} />

      <div className="text-xs leading-relaxed text-zinc-400">
        <span className="text-zinc-300">This key cannot:</span> {CANNOT.join(' · ')}.
      </div>

      <dl className="grid grid-cols-2 gap-2">
        <Stat label="Scoped keys" value={scope.scoped.length} tone="text-emerald-300" />
        <Stat
          label="Full-access keys"
          value={scope.fullAccess.length}
          tone={scope.fullAccess.length ? 'text-amber-300' : 'text-emerald-300'}
        />
      </dl>
      {scope.fullAccess.length > 0 && (
        <p className="flex gap-2 text-xs leading-relaxed text-amber-100/90">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-300" aria-hidden />
          <span>
            {AGENT_ID} still has {scope.fullAccess.length} full-access key
            {scope.fullAccess.length === 1 ? '' : 's'} from development ({scope.fullAccess.map(shortKey).join(', ')}).
            The agent server signs with the scoped key, not this one, and this key can’t change the vault’s rules: owner
            methods need the owner’s signature. It gets deleted at code freeze, and this count reads 0 on its own after
            that.
          </span>
        </p>
      )}
      {scope.other > 0 && (
        <p className="text-xs text-zinc-500">
          {scope.other} other function-call key{scope.other === 1 ? '' : 's'} on the account reach a different contract
          or method.
        </p>
      )}
      <p className="text-[11px] text-zinc-500" suppressHydrationWarning>
        view_access_key_list on{' '}
        <a href={accountUrl(AGENT_ID)} target="_blank" rel="noreferrer" className="font-mono hover:text-emerald-300">
          {AGENT_ID}
        </a>
        , read from your browser at {new Date(scope.fetchedAt).toLocaleTimeString()}.
      </p>
    </div>
  );
}

function SignedByRow({ scope }: { scope: KeyScope }) {
  const signed = scope.signedBy;
  if (!signed)
    return (
      <p className="text-xs text-zinc-500">Couldn’t load the agent’s latest transaction to show which key signed it.</p>
    );
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/25 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <KeyRound className={`size-4 shrink-0 ${signed.scoped ? 'text-emerald-300' : 'text-rose-300'}`} aria-hidden />
        <span className="min-w-0 text-zinc-300">
          Latest request signed by <span className="font-mono text-white">{shortKey(signed.publicKey)}</span>
          {signed.scoped ? ' (the scoped key)' : ' (not the scoped key)'}
        </span>
      </div>
      <ExplorerLink txHash={signed.txHash} label="View tx" variant="pill" />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl bg-black/25 px-3 py-2">
      <dt className="text-xs text-zinc-400">{label}</dt>
      <dd className={`mt-0.5 font-mono text-lg font-semibold ${tone}`}>{value}</dd>
    </div>
  );
}

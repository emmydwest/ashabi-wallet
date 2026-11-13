'use client';

import { useEffect, useState } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { ExplorerLink } from '@/components/explorer-link';
import { StatusChip } from '@/components/status-chip';
import { useGuardian } from '@/components/use-guardian';
import { accountUrl, AGENT_ID, CONTRACT_ID, FACTORY_ID, RPC_URL } from '@/lib/config';
import { toNear } from '@/lib/near';
import type { GuardianSnapshot } from '@/lib/types';
import { rpc, type AccessKey } from '@/lib/verify-on-chain';

type KeyCount = { id: string; role: string; full: number; total: number } | { id: string; role: string; error: string };

const ACCOUNTS = [
  { id: CONTRACT_ID, role: 'Demo vault' },
  { id: AGENT_ID, role: 'Its agent' },
  { id: FACTORY_ID, role: 'Wallet factory' },
];

async function countKeys(id: string, role: string): Promise<KeyCount> {
  try {
    const { keys } = await rpc<{ keys: AccessKey[] }>('query', {
      request_type: 'view_access_key_list',
      finality: 'final',
      account_id: id,
    });
    return { id, role, full: keys.filter((k) => k.access_key.permission === 'FullAccess').length, total: keys.length };
  } catch (e) {
    return { id, role, error: (e as Error).message };
  }
}

const COMMAND = `curl -s ${RPC_URL} -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"query","params":{"request_type":"view_access_key_list","finality":"final","account_id":"${CONTRACT_ID}"}}'`;

/** The lock, the rules and the latest refusals, all read live; nothing here is baked in. */
export function LockStatus({ initial }: { initial: GuardianSnapshot }) {
  const [counts, setCounts] = useState<KeyCount[] | null>(null);
  const { snapshot } = useGuardian(15_000, initial);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void Promise.all(ACCOUNTS.map((a) => countKeys(a.id, a.role))).then(setCounts);
  }, []);

  const vault = counts?.find((c) => c.id === CONTRACT_ID);
  const locked = vault && !('error' in vault) && vault.full === 0;
  const status = snapshot.status;
  const refused = snapshot.feed.filter((f) => f.kind === 'blocked').slice(0, 6);

  return (
    <div className="space-y-4">
      <section
        className={`animate-in rounded-card border p-5 sm:p-6 ${
          !counts
            ? 'border-white/10 bg-white/[0.03]'
            : locked
              ? 'border-emerald-400/30 bg-emerald-400/[0.07]'
              : 'border-amber-400/30 bg-amber-400/[0.07]'
        }`}
      >
        <div className="flex items-start gap-4">
          <span
            className={`grid size-12 shrink-0 place-items-center rounded-2xl ${
              locked ? 'bg-emerald-400 text-black' : counts ? 'bg-amber-400 text-black' : 'bg-white/10 text-zinc-400'
            }`}
          >
            {locked ? <Lock className="size-6" aria-hidden /> : <LockOpen className="size-6" aria-hidden />}
          </span>
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-400">Contract lock, live</p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-white">
              {!counts ? 'Reading the chain…' : locked ? 'Locked: 0 full-access keys' : 'Not locked yet'}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-300">
              {!counts
                ? 'Asking a public testnet RPC for the vault’s access keys.'
                : locked
                  ? 'Nobody can deploy new code to the vault or sign for it, including us. Only its rules decide what moves, and only the owner changes them.'
                  : 'The vault account still has a full-access key, so whoever holds it could deploy different code. This turns green by itself once the count is 0.'}
            </p>
          </div>
        </div>
        <ul className="mt-5 grid gap-2 sm:grid-cols-3">
          {(counts ?? ACCOUNTS.map((a) => ({ ...a, full: -1, total: -1 }))).map((c) => (
            <li key={c.id} className="min-w-0 rounded-2xl border border-white/[0.08] bg-black/30 px-3 py-2.5">
              <div className="text-[11px] uppercase tracking-wider text-zinc-500">{c.role}</div>
              <a
                href={accountUrl(c.id)}
                target="_blank"
                rel="noreferrer"
                className="wrap-ids block font-mono text-xs text-zinc-300 hover:text-emerald-300"
              >
                {c.id}
              </a>
              <div className="mt-1 text-sm text-white">
                {'error' in c
                  ? 'RPC error'
                  : c.full < 0
                    ? '…'
                    : `${c.full} full-access · ${c.total - c.full} limited`}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-zinc-500">
          The factory keeps its key so it can still be upgraded. Wallets it already made are pinned to their code hash
          and have no keys of their own.
        </p>
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-zinc-400">Check it yourself, from any terminal:</span>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(COMMAND).then(() => setCopied(true));
              }}
              className="press rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-200 hover:border-white/30"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-white/[0.08] bg-black/50 p-3 font-mono text-[11px] leading-relaxed text-zinc-300">
            {COMMAND}
          </pre>
          <p className="mt-1 text-xs text-zinc-500">An empty <span className="font-mono">keys</span> list means locked.</p>
        </div>
      </section>

      <section className="glass rounded-card p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand/80">The rules, from get_wallet_status</p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
          <Rule label="Daily budget" value={`${toNear(status.daily_limit)} NEAR`} />
          <Rule label="Asks the owner above" value={`${toNear(status.approval_threshold)} NEAR`} />
          <Rule label="Left today" value={`${toNear(status.remaining_today)} NEAR`} />
          <Rule
            label="Velocity cap"
            value={`${status.guards.max_auto_payments} payments / ${status.guards.velocity_window_minutes} min`}
          />
          <Rule
            label="Kill-switch"
            value={`${status.guards.breaker_strikes} strikes → ${status.guards.breaker_cooldown_minutes} min pause`}
          />
          <Rule label="Frozen by owner" value={status.frozen ? 'Yes' : 'No'} />
        </dl>
        <div className="mt-4 text-sm">
          <span className="text-zinc-500">Approved payees: </span>
          <span className="wrap-ids font-mono text-xs text-zinc-200">{status.approved_payees.join(', ')}</span>
        </div>
        <div className="mt-1 text-sm">
          <span className="text-zinc-500">Owner: </span>
          <span className="wrap-ids font-mono text-xs text-zinc-200">{status.owner_id}</span>
        </div>
      </section>

      <section className="glass rounded-card p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand/80">Latest refusals</p>
          <span className="text-xs text-zinc-500">{status.blocked_count} refused in total</span>
        </div>
        <ul className="mt-3 divide-y divide-white/[0.06]">
          {refused.map((item) =>
            item.kind === 'blocked' ? (
              <li key={item.key} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5">
                <div className="min-w-0">
                  <StatusChip status={item.attempt.status} />
                  <span className="wrap-ids ml-2 text-xs text-zinc-400">
                    {toNear(item.attempt.amount)} NEAR → {item.attempt.receiver_id}
                  </span>
                </div>
                {item.txHash ? <ExplorerLink txHash={item.txHash} /> : <span className="text-xs text-zinc-600">no tx link</span>}
              </li>
            ) : null,
          )}
        </ul>
      </section>
    </div>
  );
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-white">{value}</dd>
    </div>
  );
}

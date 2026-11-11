'use client';

import { useState } from 'react';
import { nearToYocto, toNear } from '@/lib/near';
import type { WalletStatus } from '@/lib/types';
import { walletLinkFor } from './wallet-link';

const ACCOUNT_ID = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

type Props = {
  status: WalletStatus;
  isOwner: boolean;
  busy: string | null;
  run: (key: string, method: string, args: Record<string, unknown>, success: string) => void;
  /** The wallet these controls change; the demo wallet by default. */
  contractId?: string;
};

export function OwnerControls({ status, isOwner, busy, run, contractId }: Props) {
  const [limit, setLimit] = useState('');
  const [payee, setPayee] = useState('');
  const disabled = !isOwner || busy !== null;

  const limitNear = Number(limit);
  const limitValid = limit !== '' && limitNear > 0 && limitNear <= 1000;
  const payeeId = payee.trim().toLowerCase();
  const payeeValid = payeeId.length >= 2 && payeeId.length <= 64 && ACCOUNT_ID.test(payeeId);
  const limitArgs = limitValid ? { daily_limit: nearToYocto(String(limitNear)).toString() } : null;
  const back = typeof window === 'undefined' ? '' : `${window.location.origin}${window.location.pathname}`;

  return (
    <section className="glass mt-8 rounded-2xl p-5">
      <h2 className="text-lg font-semibold tracking-tight text-white">Rules</h2>
      <p className="mt-1 text-sm text-zinc-400">
        The contract enforces these on every request. Only the owner can change them.
      </p>

      <div className="mt-5">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-zinc-300">Daily limit</span>
          <span className="font-mono text-xs text-zinc-400">now {toNear(status.daily_limit)} NEAR</span>
        </div>
        <div className="mt-2 flex gap-2">
          <input
            inputMode="decimal"
            value={limit}
            onChange={(e) => setLimit(e.target.value.replace(/[^\d.]/g, ''))}
            placeholder="e.g. 5"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 font-mono text-base text-white outline-none placeholder:text-zinc-500 focus:border-emerald-300/40"
          />
          <button
            type="button"
            disabled={disabled || !limitArgs}
            onClick={() =>
              limitArgs && run('limit', 'set_daily_limit', limitArgs, `Daily limit set to ${limitNear} NEAR.`)
            }
            className="shrink-0 rounded-xl bg-white px-4 text-sm font-medium text-ink disabled:opacity-40"
          >
            {busy === 'limit' ? 'Waiting…' : 'Save'}
          </button>
        </div>
        {isOwner && limitArgs && (
          <a
            href={walletLinkFor(status.owner_id, 'set_daily_limit', limitArgs, back, contractId)}
            className="mt-2 inline-block text-xs text-sky-300"
          >
            Or sign it in MyNearWallet →
          </a>
        )}
      </div>

      <GuardsEditor
        status={status}
        disabled={disabled}
        busy={busy}
        run={run}
        back={back}
        isOwner={isOwner}
        contractId={contractId}
      />

      <div className="mt-6">
        <span className="text-sm text-zinc-300">Approved payees</span>
        <ul className="mt-2 space-y-2">
          {status.approved_payees.map((id) => (
            <li key={id} className="flex items-center justify-between gap-3 rounded-xl bg-black/25 px-3.5 py-2.5">
              <span className="min-w-0 truncate font-mono text-sm text-zinc-100">{id}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => run(`remove-${id}`, 'remove_payee', { account_id: id }, `${id} removed.`)}
                className="shrink-0 text-xs text-rose-300 disabled:opacity-40"
              >
                {busy === `remove-${id}` ? 'Waiting…' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex gap-2">
          <input
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="account.testnet"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 font-mono text-base text-white outline-none placeholder:text-zinc-500 focus:border-emerald-300/40"
          />
          <button
            type="button"
            disabled={disabled || !payeeValid}
            onClick={() => run('add-payee', 'add_payee', { account_id: payeeId }, `${payeeId} can now be paid.`)}
            className="shrink-0 rounded-xl border border-white/15 px-4 text-sm text-zinc-100 disabled:opacity-40"
          >
            {busy === 'add-payee' ? 'Waiting…' : 'Add'}
          </button>
        </div>
      </div>
    </section>
  );
}

const GUARD_FIELDS = [
  ['max_auto_payments', 'Auto-payments per window', '0 turns the velocity limit off'],
  ['velocity_window_minutes', 'Velocity window (min)', ''],
  ['breaker_strikes', 'Kill-switch strikes', '0 turns the kill-switch off'],
  ['breaker_cooldown_minutes', 'Kill-switch cooldown (min)', ''],
] as const;

type GuardKey = (typeof GUARD_FIELDS)[number][0];

function GuardsEditor({
  status,
  disabled,
  busy,
  run,
  back,
  isOwner,
  contractId,
}: Omit<Props, 'status'> & {
  status: WalletStatus;
  disabled: boolean;
  back: string;
}) {
  const [draft, setDraft] = useState<Partial<Record<GuardKey, string>>>({});
  const guards = Object.fromEntries(
    GUARD_FIELDS.map(([key]) => [key, draft[key] === undefined ? status.guards[key] : Number(draft[key])]),
  ) as WalletStatus['guards'];
  const changed = GUARD_FIELDS.some(([key]) => guards[key] !== status.guards[key]);
  const problem = GUARD_FIELDS.some(
    ([key]) => !Number.isInteger(guards[key]) || guards[key] < 0 || guards[key] > 10_000,
  )
    ? 'Use whole numbers from 0 to 10000.'
    : guards.max_auto_payments > 0 && guards.velocity_window_minutes === 0
      ? 'The velocity window needs at least 1 minute.'
      : guards.breaker_strikes > 0 && guards.breaker_cooldown_minutes === 0
        ? 'The cooldown needs at least 1 minute.'
        : null;
  const args = { guards };

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-zinc-300">Guards</span>
        <span className="text-xs text-zinc-500">set_guards</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {GUARD_FIELDS.map(([key, label, hint]) => (
          <label key={key} className="rounded-xl bg-black/25 px-3.5 py-2.5">
            <span className="block text-xs text-zinc-400">{label}</span>
            <input
              inputMode="numeric"
              value={draft[key] ?? String(status.guards[key])}
              onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
              className="mt-1 w-full bg-transparent font-mono text-base text-white outline-none"
            />
            {hint && <span className="block text-[11px] text-zinc-500">{hint}</span>}
          </label>
        ))}
      </div>
      {problem && changed && <p className="mt-2 text-xs text-amber-200">{problem}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={disabled || !changed || Boolean(problem)}
          onClick={() => run('guards', 'set_guards', args, 'Guards updated.')}
          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-ink disabled:opacity-40"
        >
          {busy === 'guards' ? 'Waiting…' : 'Save guards'}
        </button>
        {isOwner && changed && !problem && (
          <a
            href={walletLinkFor(status.owner_id, 'set_guards', args, back, contractId)}
            className="text-xs text-sky-300"
          >
            Or sign it in MyNearWallet →
          </a>
        )}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">
        A new cooldown applies the next time the kill-switch trips. To lift one that is on now, tap “Reset the circuit
        breaker” at the top.
      </p>
    </div>
  );
}

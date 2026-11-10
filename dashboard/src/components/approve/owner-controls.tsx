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
};

export function OwnerControls({ status, isOwner, busy, run }: Props) {
  const [limit, setLimit] = useState('');
  const [payee, setPayee] = useState('');
  const disabled = !isOwner || busy !== null;

  const limitNear = Number(limit);
  const limitValid = limit !== '' && limitNear > 0 && limitNear <= 1000;
  const payeeId = payee.trim().toLowerCase();
  const payeeValid = payeeId.length >= 2 && payeeId.length <= 64 && ACCOUNT_ID.test(payeeId);
  const limitArgs = limitValid ? { daily_limit: nearToYocto(String(limitNear)).toString() } : null;
  const back = typeof window === 'undefined' ? '' : `${window.location.origin}/approve`;

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
            href={walletLinkFor(status.owner_id, 'set_daily_limit', limitArgs, back)}
            className="mt-2 inline-block text-xs text-sky-300"
          >
            Or sign it in MyNearWallet →
          </a>
        )}
      </div>

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

'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { ExplorerLink } from '@/components/explorer-link';
import { useGuardian } from '@/components/use-guardian';
import { OWNER_ID } from '@/lib/config';
import { timeAgo } from '@/lib/format';
import { nsToDate, toNear } from '@/lib/near';
import type { PaymentRecord } from '@/lib/types';
import { useWallet } from './wallet';

type Notice = { tone: 'ok' | 'error'; text: string; txHash?: string };

export function ApproveView() {
  const { snapshot, refresh } = useGuardian(4000);
  const { accountId, ready, signIn, signOut, callOwnerMethod } = useWallet();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const isOwner = accountId === OWNER_ID;
  const frozen = snapshot?.status.frozen ?? false;

  async function run(key: string, method: string, args: Record<string, unknown>, success: string) {
    setBusy(key);
    setNotice(null);
    try {
      const txHash = await callOwnerMethod(method, args);
      setNotice({ tone: 'ok', text: success, txHash });
      await refresh();
    } catch (e) {
      setNotice({ tone: 'error', text: (e as Error).message || 'The wallet did not send the transaction.' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-16 pt-6">
      <div className="glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Signed in as</div>
          <div className="truncate font-mono text-sm text-white">{accountId ?? 'Not connected'}</div>
        </div>
        {accountId ? (
          <button
            type="button"
            onClick={signOut}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300"
          >
            Sign out
          </button>
        ) : (
          <button
            type="button"
            onClick={signIn}
            disabled={!ready}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-ink disabled:opacity-50"
          >
            Connect wallet
          </button>
        )}
      </div>

      {!accountId && (
        <p className="mt-3 px-1 text-sm text-zinc-500">
          Connect the owner wallet to approve payments or freeze spending. Each action is confirmed in your wallet.
        </p>
      )}

      {accountId && !isOwner && (
        <p className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          This wallet is not the owner. The contract will reject its actions. Owner:{' '}
          <span className="font-mono">{OWNER_ID}</span>
        </p>
      )}

      <button
        type="button"
        disabled={!isOwner || busy !== null}
        onClick={() =>
          run(
            'freeze',
            frozen ? 'unfreeze' : 'freeze',
            {},
            frozen ? 'Spending unfrozen.' : 'All agent spending is frozen.',
          )
        }
        className={`mt-5 flex w-full flex-col items-center justify-center rounded-3xl px-6 py-7 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
          frozen
            ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
            : 'bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-[0_20px_60px_-20px_rgba(244,63,94,0.7)]'
        }`}
      >
        <span className="text-2xl font-semibold tracking-tight">
          {busy === 'freeze' ? 'Waiting for wallet…' : frozen ? 'Unfreeze spending' : 'Freeze all spending'}
        </span>
        <span className={`mt-1 text-sm ${frozen ? 'text-emerald-300/80' : 'text-rose-100/80'}`}>
          {frozen ? 'The agent is blocked right now' : 'Stops every agent payment instantly'}
        </span>
      </button>

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-4 flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm ${
              notice.tone === 'ok' ? 'bg-emerald-400/10 text-emerald-200' : 'bg-rose-500/10 text-rose-200'
            }`}
          >
            <span>{notice.text}</span>
            {notice.txHash && <ExplorerLink txHash={notice.txHash} />}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 flex items-baseline justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-white">Waiting for you</h1>
        <span className="font-mono text-xs text-zinc-500">
          {snapshot ? `${snapshot.pending.length} pending` : 'loading…'}
        </span>
      </div>

      <div className="mt-3 space-y-3">
        {snapshot && snapshot.pending.length === 0 && (
          <div className="glass rounded-2xl px-5 py-10 text-center">
            <div className="text-white">Nothing needs your approval</div>
            <p className="mt-1 text-sm text-zinc-500">
              Payments above {toNear(snapshot.status.approval_threshold)} NEAR will show up here.
            </p>
          </div>
        )}
        {snapshot?.pending.map((record) => (
          <PendingCard
            key={record.id}
            record={record}
            busy={busy}
            disabled={!isOwner || frozen || busy !== null}
            onApprove={() =>
              run(
                `approve-${record.id}`,
                'approve_payment',
                { record_id: record.id },
                `Payment #${record.id} approved.`,
              )
            }
            onReject={() =>
              run(`reject-${record.id}`, 'reject_payment', { record_id: record.id }, `Payment #${record.id} rejected.`)
            }
          />
        ))}
      </div>

      {snapshot && (
        <dl className="mt-8 grid grid-cols-2 gap-3 text-sm">
          <Fact label="Left today" value={`${toNear(snapshot.status.remaining_today)} NEAR`} />
          <Fact label="Vault" value={`${toNear(snapshot.status.available_balance)} NEAR`} />
        </dl>
      )}
    </main>
  );
}

type PendingCardProps = {
  record: PaymentRecord;
  busy: string | null;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
};

function PendingCard({ record, busy, disabled, onApprove, onReject }: PendingCardProps) {
  const [sku, ...reason] = record.memo.split(' | ');
  return (
    <motion.article layout className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="tabular font-mono text-3xl font-semibold tracking-tight text-white">
            {toNear(record.amount)} <span className="text-base font-normal text-zinc-400">NEAR</span>
          </div>
          <div className="mt-1 font-mono text-xs text-zinc-400">to {record.receiver_id}</div>
        </div>
        <span className="rounded-full bg-amber-400/10 px-2.5 py-1 font-mono text-[11px] text-amber-300">
          #{record.id}
        </span>
      </div>
      <div className="mt-4 rounded-xl bg-black/25 px-3.5 py-3 text-sm">
        <div className="font-mono text-xs text-zinc-500">{sku}</div>
        {reason.length > 0 && <p className="mt-1 text-zinc-200">{reason.join(' | ')}</p>}
      </div>
      <div className="mt-2 text-xs text-zinc-500">Requested by the agent {timeAgo(nsToDate(record.created_at))}</div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onReject}
          disabled={disabled}
          className="rounded-xl border border-white/10 py-3 text-sm text-zinc-200 transition hover:bg-white/5 disabled:opacity-40"
        >
          {busy === `reject-${record.id}` ? 'Waiting…' : 'Reject'}
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={disabled}
          className="rounded-xl bg-emerald-400 py-3 text-sm font-semibold text-ink transition hover:bg-emerald-300 disabled:opacity-40"
        >
          {busy === `approve-${record.id}` ? 'Waiting…' : 'Approve'}
        </button>
      </div>
    </motion.article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl px-4 py-3">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="tabular mt-0.5 font-mono text-white">{value}</dd>
    </div>
  );
}

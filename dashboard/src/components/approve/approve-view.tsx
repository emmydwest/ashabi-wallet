'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { ExplorerLink } from '@/components/explorer-link';
import { Mascot } from '@/components/mascot/mascot';
import { useGuardian } from '@/components/use-guardian';
import { nsToDate, toNear } from '@/lib/near';
import { AsOf } from '@/components/as-of';
import { CONTRACT_ID } from '@/lib/config';
import type { GuardianSnapshot } from '@/lib/types';
import { BudgetMeter } from '@/components/stats/budget-meter';
import { ApprovalCard } from './approval-card';
import { OwnerControls } from './owner-controls';
import { PolicyWriter } from './policy-writer';
import { useWallet } from './wallet';
import { ConnectWalletButton } from '@/components/wallet/connect-control';
import { readWalletReturn, walletLinkFor } from './wallet-link';

type Notice = { tone: 'ok' | 'error'; text: string; txHash?: string };

type Props = {
  initial: GuardianSnapshot;
  vaultId?: string;
  /** Extra sections for the per-user wallet page, drawn from the same live snapshot. */
  header?: (snapshot: GuardianSnapshot) => ReactNode;
  footer?: (snapshot: GuardianSnapshot) => ReactNode;
};

export function ApproveView({ initial, vaultId = CONTRACT_ID, header, footer }: Props) {
  const { snapshot, error, refresh } = useGuardian(4000, initial, vaultId === CONTRACT_ID ? undefined : vaultId);
  const { accountId, signOut, callOwnerMethod } = useWallet();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  // The contract is the source of truth: ownership can move with set_owner.
  const ownerId = snapshot.status.owner_id;
  const isOwner = Boolean(accountId) && accountId === ownerId;
  const frozen = snapshot.status.frozen ?? false;
  const breakerUntil = snapshot.status.breaker_until ?? null;
  // A tripped breaker also clears with unfreeze, so one button covers both.
  const stopped = frozen || breakerUntil !== null;

  // Coming back from a MyNearWallet redirect: show the outcome once, then tidy the URL.
  useEffect(() => {
    const result = readWalletReturn(window.location.search);
    if (!result) return;
    window.history.replaceState(null, '', window.location.pathname);
    refresh().then(() =>
      setNotice(
        'txHash' in result
          ? { tone: 'ok', text: 'Signed in MyNearWallet.', txHash: result.txHash }
          : { tone: 'error', text: `MyNearWallet did not send it: ${result.error}` },
      ),
    );
  }, [refresh]);

  async function run(key: string, method: string, args: Record<string, unknown>, success: string) {
    setBusy(key);
    setNotice(null);
    try {
      const txHash = await callOwnerMethod(method, args, vaultId);
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
      {(snapshot.stale || error) && (
        <div className="mb-3">
          <AsOf snapshot={snapshot} offline={Boolean(error)} />
        </div>
      )}
      {header?.(snapshot)}
      <div className="glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-zinc-400">
            Signed in as
            {isOwner && (
              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 normal-case tracking-normal text-emerald-300">
                owner
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate font-mono text-[15px] text-white">{accountId ?? 'Not connected'}</div>
        </div>
        {accountId ? (
          <button
            type="button"
            onClick={signOut}
            className="shrink-0 rounded-full border border-white/15 px-3.5 py-1.5 text-sm text-zinc-100"
          >
            Sign out
          </button>
        ) : (
          <ConnectWalletButton variant="compact" className="shrink-0 rounded-full px-4 py-2" />
        )}
      </div>

      {!accountId && (
        <p className="mt-3 px-1 text-sm text-zinc-400">
          Connect the owner wallet to approve payments or freeze spending. Each action is confirmed in your wallet.
        </p>
      )}

      {accountId && ownerId && !isOwner && (
        <p className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          This wallet is not the owner. The contract will reject its actions. Owner:{' '}
          <span className="font-mono">{ownerId}</span>
        </p>
      )}

      <button
        type="button"
        disabled={!isOwner || busy !== null}
        onClick={() =>
          run(
            'freeze',
            stopped ? 'unfreeze' : 'freeze',
            {},
            stopped ? 'Spending unfrozen.' : 'All agent spending is frozen.',
          )
        }
        className={`mt-5 flex w-full flex-col items-center justify-center rounded-3xl px-6 py-7 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
          stopped
            ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
            : 'bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-[0_20px_60px_-20px_rgba(244,63,94,0.7)]'
        }`}
      >
        <span className="text-2xl font-semibold tracking-tight">
          {busy === 'freeze'
            ? 'Waiting for wallet…'
            : frozen
              ? 'Unfreeze spending'
              : breakerUntil
                ? 'Reset the circuit breaker'
                : 'Freeze all spending'}
        </span>
        <span className={`mt-1 text-sm ${stopped ? 'text-emerald-300/80' : 'text-rose-100/80'}`}>
          {frozen
            ? 'The agent is blocked right now'
            : breakerUntil
              ? `Tripped by suspicious requests · lifts by itself at ${nsToDate(breakerUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Stops every agent payment instantly'}
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
        <span className="font-mono text-xs text-zinc-400">{snapshot.pending.length} pending</span>
      </div>

      <div className="mt-3 space-y-3">
        {snapshot.pending.length === 0 && (
          <div className="glass rounded-2xl px-5 py-10 text-center">
            <Mascot size={112} decorative className="mx-auto" />
            <div className="mt-2 text-white">Nothing needs your approval</div>
            <p className="mt-1 text-sm text-zinc-400">
              Payments above {toNear(snapshot.status.approval_threshold)} NEAR will show up here.
            </p>
          </div>
        )}
        {snapshot.pending.map((record) => (
          <ApprovalCard
            key={record.id}
            vaultId={vaultId}
            record={record}
            status={snapshot.status}
            walletLink={
              ownerId
                ? walletLinkFor(ownerId, 'approve_payment', { record_id: record.id }, approveUrl(), vaultId)
                : null
            }
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

      {!header && (
        <div className="glass mt-8 rounded-2xl px-4 py-4">
          <BudgetMeter status={snapshot.status} />
          <p className="mt-3 text-sm text-zinc-400">
            In the wallet:{' '}
            <span className="font-mono text-white">{toNear(snapshot.status.available_balance)} NEAR</span>
          </p>
        </div>
      )}

      {footer?.(snapshot)}

      <OwnerControls status={snapshot.status} isOwner={isOwner} busy={busy} run={run} contractId={vaultId} />
      <PolicyWriter
        status={snapshot.status}
        feed={snapshot.feed}
        isOwner={isOwner}
        busy={busy}
        run={run}
        contractId={vaultId}
      />
    </main>
  );
}

function approveUrl() {
  return typeof window === 'undefined' ? '' : `${window.location.origin}${window.location.pathname}`;
}

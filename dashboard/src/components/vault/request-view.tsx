'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApprovalCard } from '@/components/approve/approval-card';
import { useWallet } from '@/components/approve/wallet';
import { ConnectWalletButton } from '@/components/wallet/connect-control';
import { readWalletReturn, walletLinkFor } from '@/components/approve/wallet-link';
import { ExplorerLink } from '@/components/explorer-link';
import { Mascot, type Mood } from '@/components/mascot/mascot';
import { useGuardian } from '@/components/use-guardian';
import { CONTRACT_ID } from '@/lib/config';
import { viewCall } from '@/lib/near';
import { describeRequest } from '@/lib/request-text';
import type { GuardianSnapshot, PaymentRecord } from '@/lib/types';

type Props = { vaultId: string; recordId: number; initial: GuardianSnapshot };

const OUTCOME: Record<string, { title: string; tone: string; mood: Mood }> = {
  TRANSFERRING: { title: 'Approved, paying now', tone: 'text-safe', mood: 'thinking' },
  COMPLETED: { title: 'Approved and paid', tone: 'text-safe', mood: 'approved' },
  REJECTED: { title: 'Rejected', tone: 'text-zinc-200', mood: 'blocked' },
  EXPIRED: { title: 'Expired without an answer', tone: 'text-zinc-300', mood: 'alert' },
  FAILED: { title: 'Approved, but the transfer failed', tone: 'text-danger', mood: 'alert' },
};

// The page a phone opens from a shared link: one request, the two buttons, and its outcome.
export function RequestView({ vaultId, recordId, initial }: Props) {
  const { snapshot } = useGuardian(8000, initial, vaultId === CONTRACT_ID ? undefined : vaultId);
  const { accountId, callOwnerMethod } = useWallet();
  const [record, setRecord] = useState<PaymentRecord | null | undefined>(() => {
    const item = initial.feed.find((i) => i.kind === 'payment' && i.record.id === recordId);
    return item?.kind === 'payment' ? item.record : undefined;
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string; tx?: string } | null>(null);

  const load = useCallback(
    () =>
      viewCall<PaymentRecord | null>('get_payment', { record_id: recordId }, vaultId).then(setRecord, () => {
        // Keep what we have; the next poll will try again.
      }),
    [recordId, vaultId],
  );

  useEffect(() => {
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const result = readWalletReturn(window.location.search);
    if (!result) return;
    window.history.replaceState(null, '', window.location.pathname);
    // Coming back from a MyNearWallet redirect; the URL is only readable after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotice(
      'txHash' in result
        ? { ok: true, text: 'Signed in MyNearWallet.', tx: result.txHash }
        : { ok: false, text: `MyNearWallet did not send it: ${result.error}` },
    );
  }, []);

  const ownerId = snapshot.status.owner_id;
  const isOwner = Boolean(accountId) && accountId === ownerId;

  async function act(kind: 'approve' | 'reject') {
    setBusy(`${kind}-${recordId}`);
    setNotice(null);
    try {
      const tx = await callOwnerMethod(`${kind}_payment`, { record_id: recordId }, vaultId);
      setNotice({ ok: true, text: kind === 'approve' ? 'Approved.' : 'Rejected.', tx });
      await load();
    } catch (e) {
      setNotice({ ok: false, text: (e as Error).message || 'The wallet did not send it.' });
    } finally {
      setBusy(null);
    }
  }

  const back = typeof window === 'undefined' ? '' : `${window.location.origin}${window.location.pathname}`;

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-16 pt-8">
      <Link href={`/vault/${vaultId}`} className="text-sm text-zinc-400 hover:text-white">
        ← {vaultId === CONTRACT_ID ? 'Demo wallet' : 'My wallet'}
      </Link>

      <div className="mt-4">
        {record === undefined && <div className="glass h-72 animate-pulse rounded-card" aria-label="Loading" />}
        {record === null && (
          <div className="glass rounded-card px-5 py-10 text-center">
            <Mascot mood="thinking" size={120} decorative className="mx-auto" />
            <div className="mt-2 text-white">No request #{recordId} on this wallet</div>
            <p className="mt-1 text-sm text-zinc-400">The link may be for another wallet, or it was mistyped.</p>
          </div>
        )}
        {record && record.status === 'PENDING_APPROVAL' && (
          <ApprovalCard
            standalone
            vaultId={vaultId}
            record={record}
            status={snapshot.status}
            busy={busy}
            disabled={!isOwner || snapshot.status.frozen || busy !== null}
            walletLink={walletLinkFor(ownerId, 'approve_payment', { record_id: recordId }, back, vaultId)}
            onApprove={() => act('approve')}
            onReject={() => act('reject')}
          />
        )}
        {record && record.status !== 'PENDING_APPROVAL' && <Outcome record={record} />}
      </div>

      {notice && (
        <div
          className={`mt-4 flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm ${
            notice.ok ? 'bg-safe/10 text-safe' : 'bg-danger/10 text-danger'
          }`}
        >
          <span>{notice.text}</span>
          {notice.tx && <ExplorerLink txHash={notice.tx} />}
        </div>
      )}

      {record?.status === 'PENDING_APPROVAL' && (
        <div className="mt-4 text-center text-sm text-zinc-400">
          {!accountId ? (
            <ConnectWalletButton variant="primary" label="Connect the owner wallet" className="rounded-full py-2.5 text-sm" />
          ) : isOwner ? (
            <span>
              Signed in as <span className="font-mono text-zinc-200">{accountId}</span>
            </span>
          ) : (
            <span className="text-pending">
              {accountId} isn’t the owner. Only <span className="font-mono">{ownerId}</span> can decide.
            </span>
          )}
          {snapshot.status.frozen && (
            <p className="mt-2 text-pending">Spending is frozen, so nothing can be approved.</p>
          )}
        </div>
      )}
    </main>
  );
}

function Outcome({ record }: { record: PaymentRecord }) {
  const { amount, what } = describeRequest(record);
  const outcome = OUTCOME[record.status] ?? { title: record.status, tone: 'text-zinc-200', mood: 'happy' };
  return (
    <div className="glass rounded-card px-5 py-8 text-center">
      <Mascot mood={outcome.mood} size={128} decorative className="mx-auto" />
      <div className={`mt-2 font-display text-xl font-semibold ${outcome.tone}`}>{outcome.title}</div>
      <p className="mt-2 text-sm text-zinc-400">
        {amount} NEAR for {what} · request #{record.id}
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        {record.approved_by_owner ? 'You approved it.' : 'Nothing left to do here.'}
      </p>
    </div>
  );
}

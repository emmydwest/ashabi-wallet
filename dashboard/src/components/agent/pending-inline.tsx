'use client';

import { useState } from 'react';
import { useWallet } from '@/components/approve/wallet';
import { walletLinkFor } from '@/components/approve/wallet-link';
import { ExplorerLink } from '@/components/explorer-link';
import { StatusChip } from '@/components/status-chip';
import type { PendingRequest } from '@/lib/agent/types';
import { toNear } from '@/lib/near';
import type { GuardianSnapshot } from '@/lib/types';

type Props = { request: PendingRequest; snapshot: GuardianSnapshot | null; onSigned: () => void };

// Real owner signing only: the buttons work for the owner's wallet, everyone else just watches it resolve.
export function PendingInline({ request, snapshot, onSigned }: Props) {
  const { accountId, ready, signIn, callOwnerMethod } = useWallet();
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string; txHash?: string } | null>(null);

  const ownerId = snapshot?.status.owner_id;
  const isOwner = Boolean(accountId) && accountId === ownerId;
  const record = snapshot?.feed.find((i) => i.kind === 'payment' && i.record.id === request.recordId);
  const live = record?.kind === 'payment' ? record.record.status : 'PENDING_APPROVAL';
  const open = live === 'PENDING_APPROVAL';
  const back = typeof window === 'undefined' ? '' : `${window.location.origin}/agent`;

  async function act(kind: 'approve' | 'reject') {
    setBusy(kind);
    setResult(null);
    try {
      const txHash = await callOwnerMethod(`${kind}_payment`, { record_id: request.recordId });
      setResult({ ok: true, text: kind === 'approve' ? 'Approved in your wallet.' : 'Rejected.', txHash });
      onSigned();
    } catch (e) {
      setResult({ ok: false, text: (e as Error).message || 'The wallet did not send it.' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="animate-in mt-4 rounded-2xl border border-amber-400/25 bg-amber-400/[0.05] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.14em] text-amber-300/90">
            Needs the owner · #{request.recordId}
          </div>
          <div className="mt-1 font-mono text-2xl font-semibold text-white">
            {toNear(request.amount)} <span className="text-sm font-normal text-zinc-400">NEAR</span>
          </div>
          <div className="break-all font-mono text-xs text-zinc-400">to {request.receiverId}</div>
        </div>
        <StatusChip status={live} />
      </div>
      <p className="mt-3 break-words rounded-lg bg-black/25 px-3 py-2 font-mono text-xs text-zinc-300">
        {request.memo}
      </p>

      {open && isOwner && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => act('reject')}
            disabled={busy !== null}
            className="rounded-xl border border-white/10 py-2.5 text-sm text-zinc-200 disabled:opacity-40"
          >
            {busy === 'reject' ? 'Waiting…' : 'Reject'}
          </button>
          <button
            type="button"
            onClick={() => act('approve')}
            disabled={busy !== null || snapshot?.status.frozen}
            className="rounded-xl bg-emerald-400 py-2.5 text-sm font-semibold text-ink disabled:opacity-40"
          >
            {busy === 'approve' ? 'Waiting…' : 'Approve in wallet'}
          </button>
        </div>
      )}
      {open && isOwner && ownerId && (
        <a
          href={walletLinkFor(ownerId, 'approve_payment', { record_id: request.recordId }, back)}
          className="mt-2 inline-block text-xs text-sky-300"
        >
          Or approve in MyNearWallet →
        </a>
      )}
      {open && !isOwner && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
          <span>Only the owner’s wallet can approve this. It updates here when they do.</span>
          {!accountId && (
            <button
              type="button"
              onClick={() => signIn()}
              disabled={!ready}
              className="rounded-full border border-white/15 px-3 py-1.5 text-zinc-100 disabled:opacity-40"
            >
              I’m the owner
            </button>
          )}
        </div>
      )}
      {!open && (
        <p className="mt-3 text-sm text-zinc-300">
          {live === 'COMPLETED' ? 'The owner approved it and the payment settled.' : `Resolved: ${live.toLowerCase()}.`}
        </p>
      )}
      {result && (
        <div
          className={`mt-3 flex items-center justify-between gap-2 text-sm ${result.ok ? 'text-emerald-200' : 'text-rose-200'}`}
        >
          <span>{result.text}</span>
          {result.txHash && <ExplorerLink txHash={result.txHash} label="View tx" variant="pill" />}
        </div>
      )}
    </div>
  );
}

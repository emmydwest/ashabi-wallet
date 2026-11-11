'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { useState } from 'react';
import { timeAgo } from '@/lib/format';
import { nsToDate } from '@/lib/near';
import { describeRequest, expiresAt, requestPath } from '@/lib/request-text';
import type { PaymentRecord, WalletStatus } from '@/lib/types';

type Props = {
  vaultId: string;
  record: PaymentRecord;
  status: WalletStatus;
  busy: string | null;
  disabled: boolean;
  walletLink: string | null;
  onApprove: () => void;
  onReject: () => void;
  /** Hide the "open on its own page" link when already on that page. */
  standalone?: boolean;
};

// One request, one decision. Readable at a glance on a phone, with the details underneath.
export function ApprovalCard(props: Props) {
  const { vaultId, record, status, busy, disabled, walletLink, onApprove, onReject, standalone } = props;
  const { amount, what, reason, payee } = describeRequest(record);
  const expires = expiresAt(record, status);
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${requestPath(vaultId, record.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Approve a payment', url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // The share sheet was dismissed.
    }
  }

  return (
    <motion.article layout className="glass rounded-card p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-pending">Needs your OK</span>
        <span className="font-mono text-xs text-zinc-500">#{record.id}</span>
      </div>
      <p className="mt-3 text-lg leading-snug text-zinc-200">
        Your AI wants to spend{' '}
        <span className="font-display text-2xl font-semibold text-white tabular">{amount} NEAR</span> on{' '}
        <span className="font-semibold text-white">{what}</span>.
      </p>
      {reason && <p className="mt-2 text-sm text-zinc-400">“{reason}”</p>}
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="min-w-0 rounded-xl bg-black/25 px-3 py-2">
          <dt className="text-zinc-500">Pays</dt>
          <dd className="mt-0.5 truncate font-mono text-zinc-200">{payee}</dd>
        </div>
        <div className="rounded-xl bg-black/25 px-3 py-2">
          <dt className="text-zinc-500">Asked</dt>
          <dd className="mt-0.5 text-zinc-200" suppressHydrationWarning>
            {timeAgo(nsToDate(record.created_at))}
            {expires && (
              <span className="text-zinc-500" suppressHydrationWarning>
                {' '}
                · expires {expires.toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </dd>
        </div>
      </dl>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onReject}
          disabled={disabled}
          className="rounded-xl border border-white/10 py-3.5 text-[15px] text-zinc-200 transition hover:bg-white/5 disabled:opacity-40"
        >
          {busy === `reject-${record.id}` ? 'Waiting…' : 'Reject'}
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={disabled}
          className="rounded-xl btn-brand py-3.5 text-[15px] font-semibold text-on-brand transition disabled:opacity-40"
        >
          {busy === `approve-${record.id}` ? 'Waiting…' : 'Approve'}
        </button>
      </div>
      {walletLink && (
        <a href={walletLink} className="mt-3 block text-center text-xs text-sky-300">
          Wallet popup didn&apos;t open? Approve in MyNearWallet →
        </a>
      )}
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3 text-xs">
        <button type="button" onClick={share} className="text-zinc-400 hover:text-white">
          {copied ? 'Link copied' : 'Send to my phone'}
        </button>
        {!standalone && (
          <Link href={requestPath(vaultId, record.id)} className="text-zinc-400 hover:text-white">
            Open on its own →
          </Link>
        )}
      </div>
    </motion.article>
  );
}

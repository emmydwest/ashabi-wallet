'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { FAUCET_URL } from '@/lib/config';

export const WALLET_OPTIONS = [
  {
    id: 'my-near-wallet',
    name: 'MyNearWallet',
    blurb: 'Opens in the browser, including iPhone Safari.',
    icon: '/wallets/my-near-wallet.png',
  },
  {
    id: 'meteor-wallet',
    name: 'Meteor Wallet',
    blurb: 'Mobile app or browser extension.',
    icon: '/wallets/meteor.png',
  },
  {
    id: 'here-wallet',
    name: 'HERE Wallet',
    blurb: 'Mobile app. You’ll be sent to HERE to confirm.',
    icon: '/wallets/here.svg',
  },
  {
    id: 'intear-wallet',
    name: 'Intear Wallet',
    blurb: 'Browser wallet. Works best on desktop.',
    icon: '/wallets/intear.svg',
  },
] as const;

export type WalletOptionId = (typeof WALLET_OPTIONS)[number]['id'];

export function ConnectModal({
  open,
  pendingId,
  error,
  onClose,
  onPick,
}: {
  open: boolean;
  pendingId: string | null;
  error: string | null;
  onClose: () => void;
  onPick: (id: WalletOptionId) => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pendingId) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, pendingId, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close wallet options"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        disabled={Boolean(pendingId)}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="animate-in relative w-full max-w-[26rem] overflow-hidden rounded-t-3xl border border-white/10 bg-[#0a0d0c] shadow-[0_-16px_60px_rgb(0_0_0/0.55)] sm:rounded-3xl sm:shadow-[0_24px_80px_rgb(0_0_0/0.65)]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,rgb(61_242_166/0.12),transparent_70%)]"
        />
        <div className="relative px-5 pb-5 pt-5 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="font-display text-xl font-semibold tracking-tight text-white">
                Connect a wallet
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                NEAR testnet only. You’ll confirm every action in the wallet. Nothing here uses real funds.
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              aria-label="Close"
              disabled={Boolean(pendingId)}
              onClick={onClose}
              className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-300 hover:bg-white/[0.06] disabled:opacity-40"
            >
              <X className="size-4" />
            </button>
          </div>

          <ul className="mt-5 space-y-2">
            {WALLET_OPTIONS.map((wallet) => {
              const pending = pendingId === wallet.id;
              return (
                <li key={wallet.id}>
                  <button
                    type="button"
                    disabled={Boolean(pendingId)}
                    onClick={() => onPick(wallet.id)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left transition-colors hover:border-emerald-400/35 hover:bg-emerald-400/[0.06] disabled:opacity-60"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={wallet.icon}
                      alt=""
                      width={40}
                      height={40}
                      className="size-10 shrink-0 rounded-xl bg-black object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium text-white">{wallet.name}</span>
                      <span className="mt-0.5 block text-xs text-zinc-400">{wallet.blurb}</span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-emerald-300">
                      {pending ? 'Opening…' : 'Connect'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

          <p className="mt-4 text-center text-xs text-zinc-500">
            Need testnet NEAR?{' '}
            <a href={FAUCET_URL} target="_blank" rel="noreferrer" className="text-sky-300 hover:text-sky-200">
              Get some free
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

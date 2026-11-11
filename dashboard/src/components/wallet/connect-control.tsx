'use client';

import { LogOut, Wallet } from 'lucide-react';
import { useWallet } from '@/components/approve/wallet';

function shortAccount(id: string) {
  if (id.length <= 22) return id;
  return `${id.slice(0, 10)}…${id.slice(-10)}`;
}

export function ConnectWalletButton({
  variant = 'primary',
  label = 'Connect wallet',
  onBeforeOpen,
  className = '',
}: {
  variant?: 'nav' | 'menu' | 'primary' | 'compact';
  label?: string;
  onBeforeOpen?: () => void;
  className?: string;
}) {
  const { accountId, ready, signIn, signOut } = useWallet();

  if (accountId) {
    return <AccountPill accountId={accountId} onSignOut={signOut} variant={variant} className={className} />;
  }

  const styles = {
    nav: 'inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-400/10 px-3.5 py-1.5 text-sm font-semibold text-emerald-100 hover:bg-emerald-400/20 disabled:opacity-50',
    menu: 'inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-400/35 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-400/20 disabled:opacity-50',
    primary:
      'inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-5 py-3 text-[15px] font-medium text-ink disabled:opacity-50',
    compact:
      'inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-50',
  }[variant];

  return (
    <button
      type="button"
      disabled={!ready}
      onClick={() => {
        onBeforeOpen?.();
        void signIn();
      }}
      className={`${styles} ${className}`}
    >
      {variant !== 'compact' && <Wallet className="size-4" aria-hidden />}
      {label}
    </button>
  );
}

function AccountPill({
  accountId,
  onSignOut,
  variant,
  className,
}: {
  accountId: string;
  onSignOut: () => Promise<void>;
  variant: 'nav' | 'menu' | 'primary' | 'compact';
  className: string;
}) {
  const wide = variant === 'menu';
  return (
    <div
      className={`flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] p-1 ${
        wide ? 'w-full justify-between' : 'max-w-full'
      } ${className}`}
    >
      <span className="flex min-w-0 items-center gap-2 pl-2.5 pr-1">
        <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
        <span className="truncate font-mono text-xs text-emerald-100" title={accountId}>
          {shortAccount(accountId)}
        </span>
      </span>
      <button
        type="button"
        onClick={() => void onSignOut()}
        aria-label="Disconnect wallet"
        className="grid size-8 shrink-0 place-items-center rounded-full text-zinc-300 hover:bg-white/10 hover:text-white"
      >
        <LogOut className="size-3.5" />
      </button>
    </div>
  );
}

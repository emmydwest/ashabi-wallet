'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useWallet } from '@/components/approve/wallet';
import { Mascot } from '@/components/mascot/mascot';
import { CONTRACT_ID } from '@/lib/config';
import { factory, vaultName, type VaultInfo } from '@/lib/factory';

export function MyWallets() {
  const { accountId, ready, signIn, signOut } = useWallet();
  // Keyed by account, so switching accounts shows a loading state instead of the old list.
  const [result, setResult] = useState<{ owner: string; vaults?: VaultInfo[]; error?: boolean } | null>(null);
  const current = result?.owner === accountId ? result : null;
  const vaults = current?.vaults ?? null;
  const error = Boolean(current?.error);

  useEffect(() => {
    if (!accountId) return;
    factory.vaultsOf(accountId).then(
      (list) => setResult({ owner: accountId, vaults: list }),
      () => setResult({ owner: accountId, error: true }),
    );
  }, [accountId]);

  if (!accountId)
    return (
      <div className="glass rounded-card px-5 py-10 text-center">
        <Mascot size={120} decorative className="mx-auto" />
        <p className="mt-2 text-white">Connect to see the wallets you own</p>
        <button
          type="button"
          onClick={() => signIn()}
          disabled={!ready}
          className="mt-4 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-50"
        >
          Connect wallet
        </button>
        <p className="mt-4 text-sm text-zinc-500">
          Just looking?{' '}
          <Link href={`/vault/${CONTRACT_ID}`} className="text-sky-300">
            Open the demo wallet
          </Link>
        </p>
      </div>
    );

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate text-zinc-400">
          Signed in as <span className="font-mono text-zinc-200">{accountId}</span>
        </span>
        <button type="button" onClick={signOut} className="shrink-0 text-zinc-400 hover:text-white">
          Sign out
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {vaults === null &&
          !error &&
          [0, 1].map((i) => <div key={i} className="glass h-20 animate-pulse rounded-card" />)}
        {error && <p className="text-sm text-danger">Couldn’t reach NEAR testnet. Refresh to try again.</p>}
        {vaults?.length === 0 && (
          <div className="glass rounded-card px-5 py-10 text-center">
            <Mascot mood="thinking" size={120} decorative className="mx-auto" />
            <p className="mt-2 text-white">You don’t have a guarded wallet yet</p>
            <p className="mt-1 text-sm text-zinc-400">It takes one transaction and a little testnet NEAR.</p>
          </div>
        )}
        {vaults?.map((v) => (
          <Link
            key={v.vault_id}
            href={`/vault/${v.vault_id}`}
            className="glass flex items-center justify-between gap-3 rounded-card px-5 py-4 hover:bg-white/[0.04]"
          >
            <div className="min-w-0">
              <div className="truncate font-medium text-white">{vaultName(v.vault_id)}</div>
              <div className="truncate font-mono text-xs text-zinc-500">{v.vault_id}</div>
            </div>
            <span className="shrink-0 text-sm text-zinc-400">{v.state === 'CREATING' ? 'Setting up…' : 'Open →'}</span>
          </Link>
        ))}
      </div>
      <Link
        href="/start"
        className="btn-brand mt-5 block rounded-full py-3.5 text-center text-[15px] font-semibold transition-shadow"
      >
        Create {vaults?.length ? 'another' : 'my'} guarded wallet
      </Link>
    </div>
  );
}

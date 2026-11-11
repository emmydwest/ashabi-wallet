'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/components/approve/wallet';
import { factory, type VaultInfo } from '@/lib/factory';

/** Ready vaults first, then anything else the connected owner has at the factory. */
export function useOwnedVaults() {
  const { accountId } = useWallet();
  const [loaded, setLoaded] = useState<{ owner: string; vaults: VaultInfo[] } | null>(null);

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    factory.vaultsOf(accountId).then(
      (list) => {
        if (!cancelled) setLoaded({ owner: accountId, vaults: list });
      },
      () => {
        if (!cancelled) setLoaded({ owner: accountId, vaults: [] });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const vaults = accountId && loaded?.owner === accountId ? loaded.vaults : null;
  const ready = vaults?.filter((v) => v.state === 'READY') ?? [];
  const primary = ready[0] ?? vaults?.[0] ?? null;
  return { accountId, vaults, primary };
}

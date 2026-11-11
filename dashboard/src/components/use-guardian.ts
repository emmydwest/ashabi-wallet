'use client';

import { useCallback, useEffect, useState } from 'react';
import fallback from '@/data/snapshot-fallback.json';
import type { GuardianSnapshot } from '@/lib/types';

const FALLBACK = { ...(fallback as GuardianSnapshot), stale: true };

export function useGuardian(intervalMs = 6000, initial: GuardianSnapshot | null = null, vaultId?: string) {
  // Never empty: the server's snapshot, or the saved one until the first fetch lands.
  const [snapshot, setSnapshot] = useState<GuardianSnapshot>(initial ?? FALLBACK);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const url = vaultId ? `/api/guardian?vault=${encodeURIComponent(vaultId)}` : '/api/guardian';
      const res = await fetch(url, { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      const next = body as GuardianSnapshot;
      // A cold server may only have the saved state; don't trade newer numbers for it.
      setSnapshot((prev) =>
        next.stale && Date.parse(prev.fetchedAt) > Date.parse(next.fetchedAt) ? { ...prev, stale: true } : next,
      );
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [vaultId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const timer = setInterval(refresh, intervalMs);
    return () => clearInterval(timer);
  }, [refresh, intervalMs]);

  return { snapshot, error, refresh };
}

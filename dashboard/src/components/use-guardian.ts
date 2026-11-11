'use client';

import { useCallback, useEffect, useState } from 'react';
import type { GuardianSnapshot } from '@/lib/types';

export function useGuardian(intervalMs = 6000, initial: GuardianSnapshot | null = null) {
  const [snapshot, setSnapshot] = useState<GuardianSnapshot | null>(initial);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/guardian', { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      setSnapshot(body);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const timer = setInterval(refresh, intervalMs);
    return () => clearInterval(timer);
  }, [refresh, intervalMs]);

  return { snapshot, error, refresh };
}

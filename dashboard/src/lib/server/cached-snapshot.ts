import 'server-only';
import { cacheLife } from 'next/cache';
import { factory } from '@/lib/factory';
import { loadSnapshot } from '@/lib/guardian';

// Pages render with this so the first paint already has real numbers; the client refreshes after.
export async function cachedSnapshot() {
  'use cache';
  cacheLife({ stale: 15, revalidate: 15, expire: 120 });
  return loadSnapshot();
}

/** How many wallets the factory has made; null if the RPC can't be reached. */
export async function cachedWalletCount() {
  'use cache';
  cacheLife({ stale: 60, revalidate: 60, expire: 600 });
  return factory
    .config()
    .then((c) => c.vault_count)
    .catch(() => null);
}

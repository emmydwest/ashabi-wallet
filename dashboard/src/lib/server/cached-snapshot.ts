import 'server-only';
import { cacheLife } from 'next/cache';
import { loadSnapshot } from '@/lib/guardian';

// Pages render with this so the first paint already has real numbers; the client refreshes after.
export async function cachedSnapshot() {
  'use cache';
  cacheLife({ stale: 15, revalidate: 15, expire: 120 });
  return loadSnapshot();
}

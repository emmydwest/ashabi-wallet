import 'server-only';
import { getCache } from '@vercel/functions';

// Vercel has no database here. The runtime cache is shared by the functions in a region and
// survives deploys; the in-process map covers local runs and a cache that is briefly down.
const memory = new Map<string, { value: unknown; until: number }>();

function cache() {
  try {
    return getCache({ namespace: 'guardian' });
  } catch {
    return null;
  }
}

export async function put(key: string, value: unknown, ttlSec: number) {
  memory.set(key, { value, until: Date.now() + ttlSec * 1000 });
  await cache()
    ?.set(key, value, { ttl: ttlSec })
    .catch(() => {});
}

export async function get<T>(key: string): Promise<T | undefined> {
  const local = memory.get(key);
  if (local && local.until > Date.now()) return local.value as T;
  return ((await cache()
    ?.get(key)
    .catch(() => undefined)) ?? undefined) as T | undefined;
}

// Marks a key as used. Returns false if it already was. Not atomic across regions, which is
// fine for a testnet demo; a production vendor would use a database with a unique index.
export async function claim(key: string, ttlSec: number) {
  if ((await get(key)) !== undefined) return false;
  await put(key, Date.now(), ttlSec);
  return true;
}

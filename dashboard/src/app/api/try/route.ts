import { cookies } from 'next/headers';
import { clientIp } from '@/lib/server/rate-limit';
import { sandboxFor } from '@/lib/server/sandbox';

export const maxDuration = 30;

const COOKIE = 'ashabi_sandbox';
const CLAIMS_PER_HOUR = 3;
const claims = new Map<string, number[]>();

// One click on /try: the visitor gets a sandbox wallet for 24 hours. A cookie and their IP both
// bring the same one back, and new claims are capped per IP, so reloading can't empty the pool.
export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const jar = await cookies();
  const now = Date.now();
  const recent = (claims.get(ip) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  const remembered = jar.get(COOKIE)?.value;
  if (!remembered && recent.length >= CLAIMS_PER_HOUR)
    return Response.json({ error: 'That’s a few wallets from this network already. Try again in an hour.' }, { status: 429 });

  const sandbox = await sandboxFor(ip, remembered);
  if (!sandbox)
    return Response.json(
      { error: 'Every sandbox wallet is busy or out of testnet NEAR right now. Try the demo wallet on /agent.' },
      { status: 503 },
    );
  if (sandbox.vault !== remembered) claims.set(ip, [...recent, now]);
  jar.set(COOKIE, sandbox.vault, { httpOnly: true, sameSite: 'lax', secure: true, maxAge: 24 * 60 * 60, path: '/' });
  return Response.json(sandbox, { headers: { 'cache-control': 'no-store' } });
}

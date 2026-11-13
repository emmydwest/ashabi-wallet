import { clientIp } from '@/lib/server/rate-limit';
import { sandboxFor } from '@/lib/server/sandbox';

export const maxDuration = 30;

// One click on /try: the visitor gets a sandbox wallet for 24 hours, keyed by their IP so a
// reload or a second tab gets the same one back instead of using up the pool.
export async function POST(request: Request) {
  const sandbox = await sandboxFor(clientIp(request.headers));
  if (!sandbox)
    return Response.json(
      { error: 'Every sandbox wallet is busy or out of testnet NEAR right now. Try the demo wallet on /agent.' },
      { status: 503 },
    );
  return Response.json(sandbox, { headers: { 'cache-control': 'no-store' } });
}

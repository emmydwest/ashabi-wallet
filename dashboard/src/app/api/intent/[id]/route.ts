import { connection } from 'next/server';
import type { IntentLog } from '@/lib/agent/intent';
import { get } from '@/lib/server/store';

// The full log behind an intent:<id> memo, kept for a week. The run result carries it too,
// so verifying never depends on this cache.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f]{16}$/.test(id)) return Response.json({ error: 'bad intent id' }, { status: 400 });
  const entry = await get<{ log: IntentLog; hash: string }>(`intent:${id}`);
  if (!entry) return Response.json({ error: 'not found (logs are kept for 7 days)' }, { status: 404 });
  return Response.json(entry, { headers: { 'cache-control': 'no-store' } });
}

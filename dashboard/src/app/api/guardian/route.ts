import { connection } from 'next/server';
import { loadSnapshot } from '@/lib/guardian';

export async function GET() {
  await connection();
  try {
    return Response.json(await loadSnapshot());
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 502 });
  }
}

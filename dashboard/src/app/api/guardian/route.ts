import { connection } from 'next/server';
import { CONTRACT_ID, isVaultId } from '@/lib/config';
import { loadSnapshot } from '@/lib/guardian';

export async function GET(request: Request) {
  await connection();
  const vault = new URL(request.url).searchParams.get('vault') ?? CONTRACT_ID;
  if (!isVaultId(vault)) return Response.json({ error: 'not a guardian wallet' }, { status: 400 });
  try {
    return Response.json(await loadSnapshot(vault));
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 502 });
  }
}

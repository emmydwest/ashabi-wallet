import 'server-only';
import { SANDBOX_OWNER, TRIAL_VAULTS } from '@/lib/config';
import { factory } from '@/lib/factory';
import { nearToYocto, viewCall } from '@/lib/near';
import type { WalletStatus } from '@/lib/types';
import { get, put } from './store';

// /try hands each visitor one of a fixed set of sandbox wallets for a day. They were made
// through the factory ahead of time (owner ashabi-sandbox.testnet, 0.3 NEAR a day, asks over
// 0.1), because creating a wallet needs a deposit and this server holds no key that can pay one.

const HOLD_SEC = 24 * 60 * 60;
const MIN_SPENDABLE = nearToYocto('0.1');

export type Sandbox = { vault: string; since: number; shared: boolean };

async function usable(vault: string) {
  try {
    const [info, status] = await Promise.all([
      factory.vault(vault),
      viewCall<WalletStatus>('get_wallet_status', {}, vault),
    ]);
    return (
      info?.state === 'READY' &&
      info.owner_id === SANDBOX_OWNER &&
      !status.frozen &&
      BigInt(status.available_balance) >= MIN_SPENDABLE
    );
  } catch {
    return false;
  }
}

/** The visitor's sandbox wallet: the one they already have, else a free one, else the least recently handed out. */
export async function sandboxFor(visitor: string): Promise<Sandbox | null> {
  const mine = await get<Sandbox>(`sandbox-of:${visitor}`);
  if (mine) return mine;

  const holds = await Promise.all(TRIAL_VAULTS.map(async (vault) => ({ vault, since: await get<number>(`sandbox:${vault}`) })));
  const free = holds.filter((h) => h.since === undefined);
  const order = free.length ? free : [...holds].sort((a, b) => (a.since ?? 0) - (b.since ?? 0));
  for (const { vault } of order) {
    if (!(await usable(vault))) continue;
    const sandbox: Sandbox = { vault, since: Date.now(), shared: free.length === 0 };
    await put(`sandbox:${vault}`, sandbox.since, HOLD_SEC);
    await put(`sandbox-of:${visitor}`, sandbox, HOLD_SEC);
    return sandbox;
  }
  return null;
}

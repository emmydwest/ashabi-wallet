import 'server-only';
import { CHALLENGE_VAULT } from '@/lib/config';
import { viewCall } from '@/lib/near';
import type { PaymentRecord, WalletStatus } from '@/lib/types';
import { get, put } from './store';

// The challenge scoreboard. Attempts and how the model reacted live in the runtime cache
// (approximate: per region, not atomic). Refusals and payouts are read from the chain.

const KEEP_SEC = 30 * 24 * 60 * 60;
const RECENT = 15;
/** Model calls the challenge may make per UTC day, across everyone, to stay inside free tiers. */
export const DAILY_ATTEMPTS = 300;

export type Attempt = {
  at: number;
  model: string;
  /** failed: the model ignored the injection. blocked / breached: it fell for it and this is how it ended. */
  outcome: 'failed' | 'blocked' | 'breached' | 'error';
  verdict: string | null;
  txHash?: string;
};

type Tally = { attempts: number; tricked: number; resisted: number };

const day = () => new Date().toISOString().slice(0, 10);

export async function attemptsToday() {
  return (await get<number>(`challenge:day:${day()}`)) ?? 0;
}

export async function recordAttempt(attempt: Attempt) {
  const [tally, recent, today] = await Promise.all([
    get<Tally>('challenge:tally'),
    get<Attempt[]>('challenge:recent'),
    attemptsToday(),
  ]);
  const next: Tally = tally ?? { attempts: 0, tricked: 0, resisted: 0 };
  next.attempts += 1;
  if (attempt.outcome === 'failed') next.resisted += 1;
  if (attempt.outcome === 'blocked' || attempt.outcome === 'breached') next.tricked += 1;
  await Promise.all([
    put('challenge:tally', next, KEEP_SEC),
    put('challenge:recent', [attempt, ...(recent ?? [])].slice(0, RECENT), KEEP_SEC),
    put(`challenge:day:${day()}`, today + 1, 2 * 24 * 60 * 60),
  ]);
}

export async function scoreboard() {
  const [tally, recent, status, history] = await Promise.all([
    get<Tally>('challenge:tally'),
    get<Attempt[]>('challenge:recent'),
    viewCall<WalletStatus>('get_wallet_status', {}, CHALLENGE_VAULT),
    viewCall<PaymentRecord[]>('get_payment_history', { limit: 100 }, CHALLENGE_VAULT),
  ]);
  // Anything that left the vault for an account its owner never approved. Zero by design.
  const leaked = history.filter(
    (r) => r.status === 'COMPLETED' && !status.approved_payees.includes(r.receiver_id),
  ).length;
  return {
    vault: CHALLENGE_VAULT,
    tally: tally ?? { attempts: 0, tricked: 0, resisted: 0 },
    chain: {
      refused: status.blocked_count,
      payments: status.payment_count,
      paid_to_unapproved: leaked,
      approved_payees: status.approved_payees,
      strikes: status.strikes,
      trips_after: status.guards.breaker_strikes,
      cooldown_minutes: status.guards.breaker_cooldown_minutes,
      breaker_until: status.breaker_until,
      frozen: status.frozen,
      balance: status.available_balance,
    },
    recent: recent ?? [],
    today: await attemptsToday(),
    daily_cap: DAILY_ATTEMPTS,
    fetchedAt: new Date().toISOString(),
  };
}

export type Scoreboard = Awaited<ReturnType<typeof scoreboard>>;

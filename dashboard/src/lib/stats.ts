import { nearToYocto } from '@guardian-wallet/sdk';
import type { FeedItem, WalletStatus } from './types';

/** The contract's budget day starts at 00:00 UTC, which is 1:00 AM in Lagos. */
export const BUDGET_RESET = 'resets 00:00 UTC (1:00 AM WAT)';

// One way to talk about the day's budget everywhere: spent (including payments waiting for the
// owner, which the contract already reserves) of the limit, and what's left.
export function budgetToday(status: WalletStatus) {
  const limit = BigInt(status.daily_limit);
  const reserved = BigInt(status.reserved);
  const used = BigInt(status.spent_today) + reserved;
  const remaining = BigInt(status.remaining_today);
  return {
    used: used.toString(),
    reserved: reserved > 0n ? reserved.toString() : null,
    limit: limit.toString(),
    remaining: remaining.toString(),
    percent: limit > 0n ? Math.min(100, Number((used * 100n) / limit)) : 0,
    canAfford: (near: string) => remaining >= nearToYocto(near),
  };
}

/**
 * What the contract's breaker actually counts: payments blocked for going to an account that
 * isn't approved, in a row. Any accepted request clears it; other blocks (budget, velocity)
 * neither add to it nor clear it.
 */
export function killSwitch(status: WalletStatus) {
  const max = status.guards.breaker_strikes;
  if (max === 0) return { on: false, text: 'Kill-switch off' };
  if (status.breaker_until) return { on: true, text: 'Kill-switch on: payments paused' };
  return {
    on: false,
    text: `Kill-switch: ${status.strikes} of ${max} blocked payments to unknown accounts in a row`,
    detail: 'Trips at the last one. The next accepted request resets the count.',
  };
}

type Payment = Extract<FeedItem, { kind: 'payment' }>;
type Blocked = Extract<FeedItem, { kind: 'blocked' }>;

/** The newest real example of each thing the demo proves, from the contract's own records. */
export function latestProof(feed: FeedItem[]) {
  const newest = [...feed].sort((a, b) => b.at - a.at);
  const paid = newest.find(
    (i): i is Payment => i.kind === 'payment' && i.record.status === 'COMPLETED' && !i.record.approved_by_owner,
  );
  const blocked = newest.find((i): i is Blocked => i.kind === 'blocked' && i.attempt.status === 'BLOCKED_RECIPIENT');
  const approved = newest.find((i): i is Payment => i.kind === 'payment' && i.record.approved_by_owner);
  return { paid, blocked, approved };
}

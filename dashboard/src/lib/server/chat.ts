import 'server-only';

import type { WalletStatus } from '@/lib/types';
import { CATALOG } from '@/vendor/catalog';

// Whole NEAR amounts read as "5", prices keep their decimals.
export function nearLabel(yocto: string) {
  const n = Number(BigInt(yocto) / 10n ** 21n) / 1000;
  return n.toLocaleString('en-US', { maximumFractionDigits: 3, minimumFractionDigits: 0 });
}

export function paymentMessage(
  verdict: string | null,
  reason: string | undefined,
  status: WalletStatus,
  opts?: { amount?: string; sku?: string; receiver?: string },
) {
  const daily = nearLabel(status.daily_limit);
  const remaining = nearLabel(status.remaining_today);
  const threshold = nearLabel(status.approval_threshold);
  const item = opts?.sku ? (CATALOG.find((i) => i.sku === opts.sku)?.name ?? opts.sku) : undefined;

  if (verdict === 'APPROVED') {
    if (item && opts?.amount) return `Done. I paid ${opts.amount} NEAR for the ${item}.`;
    if (opts?.amount) return `Done. I paid ${opts.amount} NEAR.`;
    return 'Done. Paid.';
  }
  if (verdict === 'PENDING_APPROVAL') {
    return `That one is over the ${threshold} NEAR auto-approve limit, so I asked the owner first. Nothing has moved yet.`;
  }
  if (verdict === 'BLOCKED_BUDGET') {
    if (BigInt(status.remaining_today) === 0n) {
      return `I can't buy that right now — today's ${daily} NEAR budget is used up. It resets at 1:00 AM WAT. Nothing was spent.`;
    }
    return `I can't buy that right now — it would go over today's ${daily} NEAR budget (${remaining} NEAR left). It resets at 1:00 AM WAT. Nothing was spent.`;
  }
  if (verdict === 'BLOCKED_RECIPIENT') {
    const who = opts?.receiver || 'that account';
    return `I can't send that — ${who} isn't on the approved list. The contract blocked it, and nothing was spent.`;
  }
  if (verdict === 'BLOCKED_VELOCITY') {
    return `I can't send that many payments so quickly — the vault's speed limit kicked in. Nothing was spent.`;
  }
  if (verdict === 'FROZEN') {
    return status.frozen
      ? `I can't pay anyone right now — the owner has frozen the vault. Nothing was spent.`
      : `I can't pay anyone right now — the kill-switch is on after repeated suspicious requests. Nothing was spent.`;
  }
  if (verdict === 'INSUFFICIENT_FUNDS' || verdict === 'BLOCKED_INSUFFICIENT_FUNDS') {
    return `There isn't enough spendable NEAR in the vault for that. Nothing was spent.`;
  }
  if (verdict) {
    return `I couldn't complete that. The contract refused the payment. Nothing was spent.`;
  }
  return reason
    ? `I couldn't complete that purchase. Nothing was spent.`
    : `I didn't go through with a payment. If you wanted me to buy something, tell me which item, and I'll ask the contract.`;
}

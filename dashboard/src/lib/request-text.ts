import { nsToDate, toNear } from './near';
import type { PaymentRecord, WalletStatus } from './types';

const TAG = /^(sku|nonce|intent):/;

// Turns a payment request into words: what it's for, why, and who gets paid.
export function describeRequest(record: Pick<PaymentRecord, 'memo' | 'receiver_id' | 'amount'>) {
  const parts = record.memo.split(' | ').map((p) => p.trim());
  const sku = parts.find((p) => p.startsWith('sku:'))?.slice(4);
  const reason = parts.filter((p) => p && !TAG.test(p)).join(' · ');
  return {
    amount: toNear(record.amount),
    what: sku ? sku.replaceAll('-', ' ') : `a payment to ${record.receiver_id}`,
    reason,
    payee: record.receiver_id,
  };
}

/** When an unapproved request stops counting, or null if the wallet never expires them. */
export function expiresAt(record: Pick<PaymentRecord, 'created_at'>, status: WalletStatus) {
  const ttl = status.pending_rules?.pending_ttl_minutes ?? 0;
  if (!ttl) return null;
  return new Date(nsToDate(record.created_at).getTime() + ttl * 60_000);
}

export const requestPath = (vaultId: string, recordId: number) => `/vault/${vaultId}/request/${recordId}`;

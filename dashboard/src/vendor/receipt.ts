import { CONTRACT_ID, VENDOR_ID } from '@/lib/config';
import { nearToYocto, viewCall } from '@/lib/near';
import type { PaymentRecord } from '@/lib/types';
import { CATALOG } from './catalog';

// A completed payment works as a 24-hour receipt for its item. Checking the
// on-chain record on every request means the vendor needs no database.
const RECEIPT_TTL_MS = 24 * 60 * 60 * 1000;

export async function receiptProblem(sku: string, recordId: number, vaultId = CONTRACT_ID): Promise<string | null> {
  const item = CATALOG.find((i) => i.sku === sku);
  if (!item) return `unknown sku ${sku}`;
  const record = await viewCall<PaymentRecord | null>('get_payment', { record_id: recordId }, vaultId);
  if (!record) return `no payment record ${recordId}`;
  if (record.status !== 'COMPLETED') return `payment ${recordId} is ${record.status}, not COMPLETED`;
  if (record.receiver_id !== VENDOR_ID) return `payment ${recordId} was not made to ${VENDOR_ID}`;
  if (BigInt(record.amount) < nearToYocto(item.price_near))
    return `payment ${recordId} is below the ${item.price_near} NEAR price`;
  if (!record.memo.startsWith(`sku:${sku}`)) return `payment ${recordId} is not for ${sku}`;
  if (Date.now() - record.updated_at / 1e6 > RECEIPT_TTL_MS) return `receipt ${recordId} has expired`;
  return null;
}

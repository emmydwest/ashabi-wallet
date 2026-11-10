import { CONTRACT_ID, VENDOR_ID } from '@/lib/config';
import { CATALOG } from '@/vendor/catalog';

export function GET() {
  return Response.json({
    vendor: VENDOR_ID,
    guardian_contract: CONTRACT_ID,
    items: CATALOG,
    how_to_pay: 'Pay through the guardian contract with memo "sku:<sku>", then GET /data/<sku>?record_id=<id>.',
  });
}

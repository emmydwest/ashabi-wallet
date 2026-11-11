import { connection, type NextRequest } from 'next/server';
import { deliver, itemFor } from '@/vendor/catalog';
import { challenge, RECEIPT_HEADER, SIGNER_HEADER, verifyReceipt } from '@/vendor/x402';

// GET /api/vendor/<sku>, or /api/vendor/weather for the basic plan. Unpaid: 402 with a price
// and nonce. Paid: retry with the request_payment transaction hash in X-NEAR-Receipt-Tx.
export async function GET(request: NextRequest, { params }: { params: Promise<{ sku: string }> }) {
  await connection();
  const { sku } = await params;
  const item = itemFor(sku === 'weather' ? 'weather-basic' : sku);
  if (!item) return Response.json({ error: `unknown sku ${sku}` }, { status: 404 });

  const headers = { 'cache-control': 'no-store' };
  const receipt = request.headers.get(RECEIPT_HEADER)?.trim();
  if (!receipt) return Response.json(challenge(item), { status: 402, headers });

  const result = await verifyReceipt(receipt, item, request.headers.get(SIGNER_HEADER));
  if (!result.ok)
    return Response.json(
      {
        error: result.status === 409 ? 'receipt_used' : 'payment_required',
        detail: result.problem,
        checks: result.checks,
      },
      { status: result.status, headers },
    );
  return Response.json(
    {
      sku: item.sku,
      receipt: { tx: receipt, record_id: result.recordId, checks: result.checks },
      data: deliver(item.sku),
    },
    { headers },
  );
}

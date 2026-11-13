import { connection, type NextRequest } from 'next/server';
import { deliverOpenData } from '@/vendor/open-data';
import { OPEN_DATA_CATALOG } from '@/vendor/providers';
import { challenge, RECEIPT_HEADER, SIGNER_HEADER, verifyReceipt } from '@/vendor/x402';

export const maxDuration = 30;

// GET /api/open-data/<sku>: Open Data Desk's paid endpoint, the same 402 loop as SkyCast but
// paid to its own account. Unpaid: 402 with a price and nonce. Paid: retry with the receipt.
export async function GET(request: NextRequest, { params }: { params: Promise<{ sku: string }> }) {
  await connection();
  const { sku } = await params;
  const item = OPEN_DATA_CATALOG.find((i) => i.sku === sku);
  if (!item) return Response.json({ error: `unknown sku ${sku}` }, { status: 404 });

  const headers = { 'cache-control': 'no-store' };
  const receipt = request.headers.get(RECEIPT_HEADER)?.trim();
  if (!receipt) return Response.json(challenge(item), { status: 402, headers });

  // Fetch the data first: if the upstream source is down, the receipt is not used up.
  let data: unknown;
  try {
    data = await deliverOpenData(item.sku);
  } catch (e) {
    return Response.json(
      { error: 'source_unavailable', detail: `${(e as Error).message}. Your receipt was not used; retry shortly.` },
      { status: 503, headers },
    );
  }

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
    { sku: item.sku, provider: item.payee, receipt: { tx: receipt, record_id: result.recordId, checks: result.checks }, data },
    { headers },
  );
}

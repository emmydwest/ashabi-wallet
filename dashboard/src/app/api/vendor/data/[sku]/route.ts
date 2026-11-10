import { connection, type NextRequest } from 'next/server';
import { forecast } from '@/vendor/catalog';
import { receiptProblem } from '@/vendor/receipt';

export async function GET(request: NextRequest, { params }: { params: Promise<{ sku: string }> }) {
  await connection();
  const { sku } = await params;
  const recordId = Number(request.nextUrl.searchParams.get('record_id'));
  if (!Number.isInteger(recordId) || recordId < 0) {
    return Response.json({ error: 'record_id is required' }, { status: 400 });
  }
  const problem = await receiptProblem(sku, recordId);
  if (problem) return Response.json({ error: 'payment required', detail: problem }, { status: 402 });
  return Response.json({ paid_with_record: recordId, data: forecast(sku) });
}

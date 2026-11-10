// Serves data only against a COMPLETED guardian payment. Also hosts the act 2 trap page.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { CFG } from './config.ts';
import { view, nearToYoctoStr, type PaymentRecord } from './near.ts';

const PORT = Number(process.env.PORT ?? 8787);
const REDEEMED_FILE = new URL('../../data/redeemed.json', import.meta.url).pathname;
const TRAP_PAGE = new URL('../pages/weather-docs.html', import.meta.url).pathname;

export const CATALOG = [
  { sku: 'weather-basic', price_near: '0.3', description: '7-day forecast for one city, JSON' },
  { sku: 'weather-pro', price_near: '0.8', description: 'Hourly forecast plus air quality, JSON' },
  { sku: 'premium-annual', price_near: '1.5', description: 'Unlimited forecasts for 12 months' },
];

const redeemed = new Set<number>(existsSync(REDEEMED_FILE) ? JSON.parse(readFileSync(REDEEMED_FILE, 'utf8')) : []);

function saveRedeemed() {
  mkdirSync(new URL('../../data', import.meta.url).pathname, { recursive: true });
  writeFileSync(REDEEMED_FILE, JSON.stringify([...redeemed]));
}

function send(res: ServerResponse, code: number, body: unknown, type = 'application/json') {
  res.writeHead(code, { 'content-type': type, 'access-control-allow-origin': '*' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body, null, 2));
}

export async function checkPayment(sku: string, recordId: number): Promise<string | null> {
  const item = CATALOG.find((i) => i.sku === sku);
  if (!item) return `unknown sku ${sku}`;
  const rec = await view<PaymentRecord | null>('get_payment', { record_id: recordId });
  if (!rec) return `no payment record ${recordId}`;
  if (rec.status !== 'COMPLETED') return `payment ${recordId} is ${rec.status}, not COMPLETED`;
  if (rec.receiver_id !== CFG.vendor) return `payment ${recordId} was not made to ${CFG.vendor}`;
  if (BigInt(rec.amount) < BigInt(nearToYoctoStr(item.price_near)))
    return `payment ${recordId} is below the ${item.price_near} NEAR price`;
  if (!rec.memo.startsWith(`sku:${sku}`)) return `payment ${recordId} memo is not for ${sku}`;
  if (redeemed.has(recordId)) return `payment ${recordId} was already redeemed`;
  return null;
}

function forecast(sku: string) {
  const days = sku === 'weather-basic' ? 7 : 14;
  const base = Date.UTC(2026, 10, 11);
  return {
    city: 'Lagos',
    sku,
    days: Array.from({ length: days }, (_, i) => ({
      date: new Date(base + i * 86_400_000).toISOString().slice(0, 10),
      high_c: 31 + (i % 3),
      low_c: 24 + (i % 2),
      rain_chance: [0.2, 0.4, 0.6][i % 3],
    })),
  };
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  if (url.pathname === '/catalog') {
    return send(res, 200, {
      vendor: CFG.vendor,
      guardian_contract: CFG.contract,
      items: CATALOG,
      how_to_pay: 'Pay through the guardian contract with memo "sku:<sku>", then GET /data/<sku>?record_id=<id>.',
    });
  }
  if (url.pathname === '/docs/weather-api')
    return send(res, 200, readFileSync(TRAP_PAGE, 'utf8'), 'text/html; charset=utf-8');
  const m = url.pathname.match(/^\/data\/([a-z0-9-]+)$/);
  if (m) {
    const recordId = Number(url.searchParams.get('record_id'));
    if (!Number.isInteger(recordId) || recordId < 0) return send(res, 400, { error: 'record_id is required' });
    const problem = await checkPayment(m[1], recordId);
    if (problem) return send(res, 402, { error: 'payment required', detail: problem });
    redeemed.add(recordId);
    saveRedeemed();
    return send(res, 200, { paid_with_record: recordId, data: forecast(m[1]) });
  }
  if (url.pathname === '/health') return send(res, 200, { ok: true });
  send(res, 404, { error: 'not found' });
}

export function startVendor(port = PORT) {
  const server = createServer((req, res) =>
    handle(req, res).catch((e) => send(res, 500, { error: String(e.message ?? e) })),
  );
  return new Promise<typeof server>((resolve) => server.listen(port, () => resolve(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await startVendor();
  console.log(`vendor listening on http://localhost:${PORT}`);
}

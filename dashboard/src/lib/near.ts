import { CONTRACT_ID, RPC_URL } from './config';

export async function viewCall<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: method,
      method: 'query',
      params: {
        request_type: 'call_function',
        finality: 'final',
        account_id: CONTRACT_ID,
        method_name: method,
        args_base64: btoa(JSON.stringify(args)),
      },
    }),
  });
  const body = await res.json();
  if (body.error || body.result?.error)
    throw new Error(`${method}: ${JSON.stringify(body.error ?? body.result.error)}`);
  return JSON.parse(new TextDecoder().decode(new Uint8Array(body.result.result)));
}

const YOCTO_PER_MILLI = 10n ** 21n;

export function toNear(yocto: string | bigint, digits = 2): string {
  const milli = Number(BigInt(yocto) / YOCTO_PER_MILLI) / 1000;
  return milli.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 3) });
}

export const nearNumber = (yocto: string | bigint) => Number(BigInt(yocto) / YOCTO_PER_MILLI) / 1000;

export const nsToDate = (ns: number | string) => new Date(Number(BigInt(ns) / 1_000_000n));

export function nearToYocto(near: string): bigint {
  const [whole, fraction = ''] = near.split('.');
  return BigInt(whole || '0') * 10n ** 24n + BigInt((fraction + '0'.repeat(24)).slice(0, 24));
}

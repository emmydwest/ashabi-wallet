// The intent hash ties an on-chain payment to the exact reasoning behind it. The run log is
// hashed here (in the browser or on the server, same code), and the first 16 hex characters
// go into the payment memo, so anyone holding the log can check it against the chain.

export type IntentLog = {
  task: string;
  model: string;
  reasoning: string;
  sku: string;
  amount_near: string;
  payee: string;
  installments: number;
  timestamp: string;
};

export const INTENT_PREFIX_LENGTH = 16;

// JSON with sorted keys, so the same log always hashes the same way.
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export const intentHash = (log: IntentLog) => sha256Hex(canonical(log));

export const memoIntent = (memo: string) => memo.match(/intent:([0-9a-f]{16})/)?.[1] ?? null;

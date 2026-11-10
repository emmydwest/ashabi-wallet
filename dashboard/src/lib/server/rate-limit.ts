import 'server-only';

// Per-instance memory is enough here: the contract's daily budget is the real limit,
// this just keeps one visitor from draining it or the agent key's gas allowance.
const WINDOW_MS = 10 * 60 * 1000;
const PER_IP = 5;
const PER_INSTANCE = 60;

const hits = new Map<string, number[]>();
let everyone: number[] = [];

const recent = (times: number[], now: number) => times.filter((t) => now - t < WINDOW_MS);

export function takeRun(ip: string): { ok: true } | { ok: false; retryInSec: number } {
  const now = Date.now();
  const mine = recent(hits.get(ip) ?? [], now);
  everyone = recent(everyone, now);
  if (mine.length >= PER_IP || everyone.length >= PER_INSTANCE) {
    const oldest = (mine.length >= PER_IP ? mine : everyone)[0];
    return { ok: false, retryInSec: Math.ceil((WINDOW_MS - (now - oldest)) / 1000) };
  }
  mine.push(now);
  everyone.push(now);
  hits.set(ip, mine);
  return { ok: true };
}

export const clientIp = (headers: Headers) =>
  headers.get('x-real-ip') ?? headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

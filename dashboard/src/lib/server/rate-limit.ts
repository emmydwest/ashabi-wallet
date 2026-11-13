import 'server-only';

// Per-instance memory is enough here: the contract's daily budget is the real limit,
// this just keeps one visitor from draining it or the agent key's gas allowance.
const WINDOW_MS = 10 * 60 * 1000;
const PER_IP = 5;
const PER_INSTANCE = 60;

const hits = new Map<string, number[]>();
let everyone: number[] = [];

const recent = (times: number[], now: number) => times.filter((t) => now - t < WINDOW_MS);

export const RUNS_PER_WINDOW = PER_IP;

export function runsLeft(ip: string) {
  return Math.max(0, PER_IP - recent(hits.get(ip) ?? [], Date.now()).length);
}

export function takeRun(ip: string): { ok: true; left: number } | { ok: false; retryInSec: number } {
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
  return { ok: true, left: PER_IP - mine.length };
}

export const clientIp = (headers: Headers) =>
  headers.get('x-real-ip') ?? headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

// Conversation replies are cheap (no payment), but still capped so one IP cannot
// hammer the RPC or the model fallback.
const CHAT_PER_IP = 30;
const CHAT_PER_INSTANCE = 200;
const chatHits = new Map<string, number[]>();
let chatEveryone: number[] = [];

export const CHATS_PER_WINDOW = CHAT_PER_IP;

export function takeChat(ip: string): { ok: true } | { ok: false; retryInSec: number } {
  const now = Date.now();
  const mine = recent(chatHits.get(ip) ?? [], now);
  chatEveryone = recent(chatEveryone, now);
  if (mine.length >= CHAT_PER_IP || chatEveryone.length >= CHAT_PER_INSTANCE) {
    const oldest = (mine.length >= CHAT_PER_IP ? mine : chatEveryone)[0];
    return { ok: false, retryInSec: Math.ceil((WINDOW_MS - (now - oldest)) / 1000) };
  }
  mine.push(now);
  chatEveryone.push(now);
  chatHits.set(ip, mine);
  return { ok: true };
}

// The open challenge costs a model call per attempt on free tiers, so it gets its own, tighter cap.
const CHALLENGE_PER_IP = 3;
const CHALLENGE_PER_INSTANCE = 40;
const challengeHits = new Map<string, number[]>();
let challengeEveryone: number[] = [];

export const CHALLENGES_PER_WINDOW = CHALLENGE_PER_IP;

export function takeChallenge(ip: string): { ok: true; left: number } | { ok: false; retryInSec: number } {
  const now = Date.now();
  const mine = recent(challengeHits.get(ip) ?? [], now);
  challengeEveryone = recent(challengeEveryone, now);
  if (mine.length >= CHALLENGE_PER_IP || challengeEveryone.length >= CHALLENGE_PER_INSTANCE) {
    const oldest = (mine.length >= CHALLENGE_PER_IP ? mine : challengeEveryone)[0];
    return { ok: false, retryInSec: Math.ceil((WINDOW_MS - (now - oldest)) / 1000) };
  }
  mine.push(now);
  challengeEveryone.push(now);
  challengeHits.set(ip, mine);
  return { ok: true, left: CHALLENGE_PER_IP - mine.length };
}

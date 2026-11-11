import { viewCall, toNear } from '@/lib/near';
import { LIMITS, reviewProposal, sanitizeProposal } from '@/lib/policy';
import { askModel } from '@/lib/server/models';
import { clientIp } from '@/lib/server/rate-limit';
import type { WalletStatus } from '@/lib/types';

export const maxDuration = 30;

const MAX_TEXT = 500;
const WINDOW_MS = 10 * 60 * 1000;
const PER_IP = 8;
const drafts = new Map<string, number[]>();

const SYSTEM = `You turn a wallet owner's plain-English request into a policy change for an AI agent's spending contract on NEAR testnet.
Return JSON with only the fields the owner asked to change:
{"daily_limit_near": string|null, "approval_threshold_near": string|null, "add_payees": string[], "remove_payees": string[],
 "guards": {"max_auto_payments"?: int, "velocity_window_minutes"?: int, "breaker_strikes"?: int, "breaker_cooldown_minutes"?: int} | null,
 "summary": "one sentence describing the change"}
Amounts are NEAR as decimal strings. Payees are full NEAR account ids. Use null or [] for anything not mentioned.
Never invent accounts or numbers the owner did not give. If the request is unclear, change nothing and say so in summary.`;

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const now = Date.now();
  const mine = (drafts.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (mine.length >= PER_IP)
    return Response.json({ error: 'Too many drafts for now. Try again in a few minutes.' }, { status: 429 });
  drafts.set(ip, [...mine, now]);

  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const text = String(body?.text ?? '').trim();
  if (!text) return Response.json({ error: 'Describe the change you want.' }, { status: 400 });
  if (text.length > MAX_TEXT) return Response.json({ error: `Keep it under ${MAX_TEXT} characters.` }, { status: 400 });

  const status = await viewCall<WalletStatus>('get_wallet_status');
  const current = {
    daily_limit_near: toNear(status.daily_limit, 3),
    approval_threshold_near: toNear(status.approval_threshold, 3),
    approved_payees: status.approved_payees,
    guards: status.guards,
    bounds: LIMITS,
  };
  const reply = await askModel<unknown>('main', SYSTEM, `Current policy: ${JSON.stringify(current)}\n\nOwner: ${text}`);
  if (!reply.data) return Response.json({ error: 'No free model answered. Try again in a moment.' }, { status: 503 });

  const proposal = sanitizeProposal(reply.data);
  return Response.json(
    { proposal, review: reviewProposal(proposal, status), model: `${reply.provider} · ${reply.model}` },
    { headers: { 'cache-control': 'no-store' } },
  );
}

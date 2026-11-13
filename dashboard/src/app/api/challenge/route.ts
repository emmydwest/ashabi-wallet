import { CUSTOM_ATTACK_ID } from '@/lib/agent/attacks';
import { CUSTOM_MAX, type AgentEvent } from '@/lib/agent/types';
import { CHALLENGE_VAULT } from '@/lib/config';
import { agentFor } from '@/lib/server/agent-key';
import { attemptsToday, DAILY_ATTEMPTS, recordAttempt, scoreboard, type Attempt } from '@/lib/server/challenge';
import { clientIp, takeChallenge } from '@/lib/server/rate-limit';
import { runAgent } from '@/lib/server/run-agent';

export const maxDuration = 60;

export async function GET() {
  try {
    return Response.json(await scoreboard(), { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}

// Anyone's injection text goes into the agent's docs page, on the challenge wallet. The agent
// never buys anything in attack mode; a tricked request goes to the contract, which decides.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { text?: unknown; model?: unknown } | null;
  const text = String(body?.text ?? '').trim();
  if (text.length < 8) return Response.json({ error: 'Write an injection of at least a few words.' }, { status: 400 });
  if (text.length > CUSTOM_MAX)
    return Response.json({ error: `Keep it under ${CUSTOM_MAX} characters.` }, { status: 400 });
  const model = body?.model === 'main' ? 'main' : 'small';

  if ((await attemptsToday()) >= DAILY_ATTEMPTS)
    return Response.json(
      { error: 'The challenge has used today’s free model budget. It reopens at 1:00 AM WAT (00:00 UTC).' },
      { status: 429 },
    );
  const slot = takeChallenge(clientIp(request.headers));
  if (!slot.ok)
    return Response.json(
      { error: `Three attempts per 10 minutes each. Try again in about ${Math.ceil(slot.retryInSec / 60)} min.` },
      { status: 429, headers: { 'retry-after': String(slot.retryInSec) } },
    );

  let agent;
  try {
    agent = await agentFor(CHALLENGE_VAULT);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 503 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let modelName = 'unknown';
      let attempt: Attempt | null = null;
      const emit = (event: AgentEvent) => {
        if (event.type === 'step' && event.kind === 'model' && event.model) modelName = event.model;
        if (event.type === 'summary')
          attempt = {
            at: Date.now(),
            model: modelName,
            outcome: event.outcome ?? 'error',
            verdict: event.verdict,
            txHash: event.txHash,
          };
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        emit({ type: 'quota', left: slot.left, limit: 3 });
        await runAgent({ mode: 'attack', attackId: CUSTOM_ATTACK_ID, custom: text, model }, emit, {
          origin: new URL(request.url).origin,
          agent,
        });
      } catch (e) {
        emit({ type: 'step', kind: 'error', title: 'The run stopped unexpectedly', body: String((e as Error).message) });
      }
      await recordAttempt(attempt ?? { at: Date.now(), model: modelName, outcome: 'error', verdict: null }).catch(() => {});
      emit({ type: 'done' });
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' },
  });
}

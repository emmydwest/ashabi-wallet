import { ATTACKS, CUSTOM_ATTACK_ID } from '@/lib/agent/attacks';
import { CUSTOM_MAX, TASK_MAX, type AgentEvent, type RunRequest } from '@/lib/agent/types';
import { agentConfigured } from '@/lib/server/agent-key';
import { clientIp, RUNS_PER_WINDOW, runsLeft, takeRun } from '@/lib/server/rate-limit';
import { runAgent } from '@/lib/server/run-agent';

export const maxDuration = 60;

function parse(body: unknown): RunRequest | string {
  const b = (body ?? {}) as Record<string, unknown>;
  if (b.mode === 'task') {
    const task = String(b.task ?? '').trim();
    if (!task) return 'Tell the agent what to buy.';
    if (task.length > TASK_MAX) return `Keep the task under ${TASK_MAX} characters.`;
    return { mode: 'task', task };
  }
  if (b.mode === 'hijack') return { mode: 'hijack' };
  if (b.mode === 'attack') {
    const attackId = String(b.attackId ?? '');
    const custom = String(b.custom ?? '').trim();
    if (attackId === CUSTOM_ATTACK_ID && !custom) return 'Write an injection first.';
    if (custom.length > CUSTOM_MAX) return `Keep the injection under ${CUSTOM_MAX} characters.`;
    if (attackId !== CUSTOM_ATTACK_ID && !ATTACKS.some((a) => a.id === attackId)) return 'Unknown attack.';
    return { mode: 'attack', attackId, custom, model: b.model === 'main' ? 'main' : 'small' };
  }
  return 'Unknown mode.';
}

export async function GET(request: Request) {
  return Response.json(
    { left: runsLeft(clientIp(request.headers)), limit: RUNS_PER_WINDOW },
    { headers: { 'cache-control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const input = parse(await request.json().catch(() => null));
  if (typeof input === 'string') return Response.json({ error: input }, { status: 400 });
  if (!agentConfigured()) return Response.json({ error: 'The agent is not configured here.' }, { status: 503 });

  const slot = takeRun(clientIp(request.headers));
  if (!slot.ok) {
    const minutes = Math.ceil(slot.retryInSec / 60);
    return Response.json(
      { error: `You have used your 5 runs for now. Try again in about ${minutes} min.` },
      { status: 429, headers: { 'retry-after': String(slot.retryInSec) } },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: AgentEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      emit({ type: 'quota', left: slot.left, limit: RUNS_PER_WINDOW });
      try {
        await runAgent(input, emit);
      } catch (e) {
        emit({
          type: 'step',
          kind: 'error',
          title: 'The run stopped unexpectedly',
          body: String((e as Error).message),
        });
      }
      emit({ type: 'done' });
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' },
  });
}

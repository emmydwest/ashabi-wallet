import { ATTACKS, CUSTOM_ATTACK_ID } from '@/lib/agent/attacks';
import { CUSTOM_MAX, TASK_MAX, type AgentEvent, type RunRequest } from '@/lib/agent/types';
import { CONTRACT_ID, isVaultId } from '@/lib/config';
import { classifyIntent, replyForChat } from '@/lib/server/chat';
import { agentConfigured, agentFor } from '@/lib/server/agent-key';
import { clientIp, RUNS_PER_WINDOW, runsLeft, takeChat, takeRun } from '@/lib/server/rate-limit';
import { runAgent } from '@/lib/server/run-agent';
import type { WalletStatus } from '@/lib/types';

export const maxDuration = 60;

function parse(body: unknown): RunRequest | string {
  const b = (body ?? {}) as Record<string, unknown>;
  if (b.mode === 'task') {
    const task = String(b.task ?? '').trim();
    if (!task) return 'Tell the agent what to buy.';
    if (task.length > TASK_MAX) return `Keep the task under ${TASK_MAX} characters.`;
    return { mode: 'task', task, surface: b.surface === 'chat' ? 'chat' : undefined };
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

function stream(write: (emit: (event: AgentEvent) => void) => Promise<void>) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const emit = (event: AgentEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        await write(emit);
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
}

const ndjson = (body: ReadableStream) =>
  new Response(body, {
    headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' },
  });

export async function GET(request: Request) {
  return Response.json(
    { left: runsLeft(clientIp(request.headers)), limit: RUNS_PER_WINDOW },
    { headers: { 'cache-control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = parse(body);
  if (typeof input === 'string') return Response.json({ error: input }, { status: 400 });
  if (!agentConfigured()) return Response.json({ error: 'The agent is not configured here.' }, { status: 503 });

  // Real jobs can run against any guardian wallet; attacks only ever target the demo wallet.
  const vault = String((body as { vault?: unknown })?.vault ?? CONTRACT_ID).trim();
  if (!isVaultId(vault)) return Response.json({ error: 'That is not a guardian wallet.' }, { status: 400 });
  if (vault !== CONTRACT_ID && input.mode !== 'task')
    return Response.json({ error: 'Attacks only run against the demo wallet.' }, { status: 400 });
  let agent;
  try {
    agent = await agentFor(vault);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 409 });
  }

  const ip = clientIp(request.headers);

  // Chat questions never spend a purchase run or call request_payment.
  if (input.mode === 'task' && input.surface === 'chat' && classifyIntent(input.task).kind === 'chat') {
    const slot = takeChat(ip);
    if (!slot.ok) {
      const minutes = Math.ceil(slot.retryInSec / 60);
      return Response.json(
        { error: `That's a lot of chat for now. Try again in about ${minutes} min.` },
        { status: 429, headers: { 'retry-after': String(slot.retryInSec) } },
      );
    }
    let status: WalletStatus | null = null;
    try {
      status = (await agent.getStatus()) as WalletStatus;
    } catch {
      status = null;
    }
    const reply = await replyForChat(input.task, status);
    return ndjson(
      stream(async (emit) => {
        emit({ type: 'quota', left: runsLeft(ip), limit: RUNS_PER_WINDOW });
        if (reply) emit({ type: 'reply', text: reply.text, mood: reply.mood });
      }),
    );
  }

  const slot = takeRun(ip);
  if (!slot.ok) {
    const minutes = Math.ceil(slot.retryInSec / 60);
    return Response.json(
      { error: `You have used your 5 purchase runs for now. Try again in about ${minutes} min.` },
      { status: 429, headers: { 'retry-after': String(slot.retryInSec) } },
    );
  }

  return ndjson(
    stream(async (emit) => {
      emit({ type: 'quota', left: slot.left, limit: RUNS_PER_WINDOW });
      await runAgent(input, emit, { origin: new URL(request.url).origin, agent });
    }),
  );
}

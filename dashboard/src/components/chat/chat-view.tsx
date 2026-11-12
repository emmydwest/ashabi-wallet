'use client';

import { ArrowUp, LoaderCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@/components/approve/wallet';
import { DeliveryCard } from '@/components/agent/delivery-card';
import { ExplorerLink } from '@/components/explorer-link';
import { Mascot, type Mood } from '@/components/mascot/mascot';
import type { AgentEvent, PendingRequest } from '@/lib/agent/types';
import { TASK_MAX } from '@/lib/agent/types';
import { CONTRACT_ID, isVaultId } from '@/lib/config';
import { factory, vaultName } from '@/lib/factory';
import { viewCall } from '@/lib/near';
import { describeRequest, requestPath } from '@/lib/request-text';
import type { PaymentRecord } from '@/lib/types';

type Step = Extract<AgentEvent, { type: 'step' }>;
type Summary = Extract<AgentEvent, { type: 'summary' }>;
type Message =
  | { role: 'user'; text: string }
  | {
      role: 'assistant';
      vault: string;
      steps: Step[];
      summary?: Summary;
      reply?: string;
      mood?: Mood;
      error?: string;
      done: boolean;
    };

const IDEAS = [
  "What's my budget?",
  'What can you buy?',
  "Buy me today's weather report",
  "Get me this morning's news digest",
  'Buy a small icon pack',
];

export function ChatView() {
  const params = useSearchParams();
  const { accountId } = useWallet();
  const [mine, setMine] = useState<string[]>([]);
  const [vault, setVault] = useState(() => {
    const asked = params.get('vault');
    return asked && isVaultId(asked) ? asked : CONTRACT_ID;
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/agent/run')
      .then((r) => r.json())
      .then((d) => typeof d.left === 'number' && setLeft(d.left))
      .catch(() => {});
  }, []);

  // A signed-in owner pays from their own wallet unless the link picked one.
  useEffect(() => {
    if (!accountId) return setMine([]);
    factory.vaultsOf(accountId).then(
      (list) => {
        const ready = list.filter((v) => v.state === 'READY').map((v) => v.vault_id);
        setMine(ready);
        if (ready.length && !params.get('vault')) setVault(ready[0]);
      },
      () => setMine([]),
    );
  }, [accountId, params]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const priorTurns = () => {
    const turns: { role: 'user' | 'assistant'; text: string }[] = [];
    for (const m of messages) {
      if (m.role === 'user') turns.push({ role: 'user', text: m.text });
      else {
        const text = m.reply ?? m.summary?.message ?? '';
        if (text) turns.push({ role: 'assistant', text });
      }
    }
    return turns.slice(-12);
  };

  async function ask(task: string) {
    const trimmed = task.trim();
    if (!trimmed || running) return;
    const history = priorTurns();
    setText('');
    setRunning(true);
    const index = messages.length + 1;
    setMessages((m) => [...m, { role: 'user', text: trimmed }, { role: 'assistant', vault, steps: [], done: false }]);
    const update = (fn: (m: Extract<Message, { role: 'assistant' }>) => Partial<Message>) =>
      setMessages((all) =>
        all.map((m, i) => (i === index && m.role === 'assistant' ? ({ ...m, ...fn(m) } as Message) : m)),
      );

    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'task', surface: 'chat', task: trimmed, vault, history }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `I couldn't start just now (${res.status}).`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as AgentEvent;
          if (event.type === 'step') update((m) => ({ steps: [...m.steps, event] }));
          if (event.type === 'summary') update(() => ({ summary: event }));
          if (event.type === 'delta') update((m) => ({ reply: (m.reply ?? '') + event.text }));
          if (event.type === 'reply') update(() => ({ reply: event.text, mood: event.mood }));
          if (event.type === 'quota') setLeft(event.left);
        }
      }
      update(() => ({ done: true }));
    } catch (e) {
      update(() => ({ done: true, error: (e as Error).message }));
    } finally {
      setRunning(false);
    }
  }

  const options = [...new Set([...mine, vault, CONTRACT_ID])];

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      <div className="flex-1 space-y-4 pb-44">
        {messages.length === 0 && (
          <div className="pt-6 text-center">
            <div className="relative mx-auto w-fit">
              <div aria-hidden className="animate-glow absolute inset-4 rounded-full bg-emerald-400/25 blur-2xl" />
              <Mascot size={148} priority decorative className="animate-float relative" />
            </div>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">Hi, I’m Guardian.</h1>
            <p className="mx-auto mt-2 max-w-sm text-zinc-400">
              I’m a shopping assistant with my own NEAR testnet wallet, limited by a smart contract. Ask me about my
              budget, or tell me what to buy — I can only spend what the contract allows.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              {IDEAS.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => ask(idea)}
                  className="glass flex min-w-0 items-center gap-3 rounded-xl px-4 py-3 text-left text-[15px] text-zinc-200 transition hover:border-emerald-400/30"
                >
                  <Sparkles className="size-4 shrink-0 text-emerald-300" aria-hidden />
                  <span className="min-w-0 text-pretty">{idea}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex scroll-mt-20 justify-end">
              <p className="max-w-[85%] wrap-ids text-pretty rounded-2xl rounded-br-md bg-white/[0.09] px-4 py-2.5 text-[15px] text-white">
                {m.text}
              </p>
            </div>
          ) : (
            <Reply key={i} message={m} />
          ),
        )}
        <div ref={end} />
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-white/[0.06] bg-black px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-zinc-500">
          <label className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0">Paying from</span>
            <select
              value={vault}
              onChange={(e) => setVault(e.target.value)}
              className="min-w-0 max-w-[14rem] truncate rounded-md border border-white/10 bg-black/40 px-1.5 py-1 text-zinc-200"
            >
              {options.map((id) => (
                <option key={id} value={id}>
                  {id === CONTRACT_ID ? 'Demo wallet' : vaultName(id)}
                </option>
              ))}
            </select>
          </label>
          {left !== null && <span className="shrink-0">{left} purchase runs left</span>}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(text);
          }}
          className="flex min-w-0 gap-2"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={TASK_MAX}
            placeholder="Ask me something, or tell me what to buy…"
            className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-base text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/60"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={running || !text.trim()}
            className="btn-brand grid size-12 shrink-0 place-items-center rounded-full disabled:opacity-40 disabled:shadow-none"
          >
            {running ? <LoaderCircle className="size-5 animate-spin" /> : <ArrowUp className="size-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}

function Reply({ message }: { message: Extract<Message, { role: 'assistant' }> }) {
  const { steps, summary, reply, error, done, vault } = message;
  const delivery = steps.find((s) => s.kind === 'delivery' && s.status === 'DELIVERED');
  const last = steps.at(-1);

  return (
    <div className="flex max-w-[94%] scroll-mt-20 items-start gap-2.5">
      <Mascot mood={replyMood(message)} size={36} decorative className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="rounded-2xl rounded-tl-md border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-[15px] text-pretty text-zinc-200">
          {!done && !summary && !reply && (
            <span className="flex items-center gap-2 text-zinc-400" role="status">
              <span className="size-2 animate-pulse rounded-full bg-brand" />
              {last ? last.title : 'Thinking…'}
            </span>
          )}
          {error && <span className="text-danger">{error}</span>}
          {reply && (
            <span className="wrap-ids">
              {reply}
              {summary?.txHash && (
                <span className="ml-2 inline-block align-middle">
                  <ExplorerLink txHash={summary.txHash} />
                </span>
              )}
            </span>
          )}
          {!reply && summary && <SummaryText summary={summary} delivered={Boolean(delivery)} />}
          {done && !summary && !reply && !error && (
            <span>I’m here — ask me about my budget, what I can buy, or tell me what you’d like me to get.</span>
          )}
        </div>

        {delivery?.data != null && <Delivered data={delivery.data} />}
        {summary?.pending && <PendingChip vault={vault} pending={summary.pending} />}

        {steps.some((s) => s.kind !== 'model') && (
          <details className="px-1 text-xs text-zinc-500">
            <summary className="cursor-pointer select-none hover:text-zinc-300">
              What happened ({steps.length} {steps.length === 1 ? 'step' : 'steps'})
            </summary>
            <ol className="mt-2 space-y-1.5 border-l border-white/10 pl-3">
              {steps.map((s, i) => (
                <li key={i} className="wrap-ids text-zinc-400">
                  {s.title}
                  {s.txHash && (
                    <span className="ml-2 inline-block align-middle">
                      <ExplorerLink txHash={s.txHash} />
                    </span>
                  )}
                  {s.kind === 'verdict' && s.body && <span className="mt-0.5 block text-zinc-500">{s.body}</span>}
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </div>
  );
}

function replyMood(message: Extract<Message, { role: 'assistant' }>): Mood {
  if (message.mood) return message.mood;
  const { summary, error, done } = message;
  if (summary?.pending) return 'alert';
  if (summary?.verdict === 'APPROVED') return 'approved';
  if (summary?.verdict) return 'blocked';
  if (error) return 'alert';
  return done ? 'happy' : 'thinking';
}

function SummaryText({ summary, delivered }: { summary: Summary; delivered: boolean }) {
  if (summary.message) {
    return (
      <span className="wrap-ids">
        {delivered && summary.verdict === 'APPROVED' ? `${summary.message} Here it is.` : summary.message}
        {summary.txHash && (
          <span className="ml-2 inline-block align-middle">
            <ExplorerLink txHash={summary.txHash} />
          </span>
        )}
      </span>
    );
  }
  if (summary.pending) return <>That one is over your auto-approve limit, so I asked you first.</>;
  if (summary.verdict === 'APPROVED')
    return (
      <span className="flex flex-wrap items-center gap-2">
        {delivered ? 'Done. Paid and delivered:' : 'Paid.'}
        {summary.txHash && <ExplorerLink txHash={summary.txHash} />}
      </span>
    );
  if (summary.verdict)
    return (
      <>
        I couldn’t complete that. The contract refused the payment.{' '}
        <span className="text-zinc-400">Nothing was spent.</span>
      </>
    );
  return <>I didn’t go through with a payment. If you wanted me to buy something, tell me which item.</>;
}

function Delivered({ data }: { data: unknown }) {
  return <DeliveryCard data={data} />;
}

// Follows the request on-chain, so the chat updates when it's approved from another device.
function PendingChip({ vault, pending }: { vault: string; pending: PendingRequest }) {
  const [status, setStatus] = useState<string>('PENDING_APPROVAL');
  const { amount, what } = describeRequest({
    memo: pending.memo,
    receiver_id: pending.receiverId,
    amount: pending.amount,
  });

  useEffect(() => {
    if (status !== 'PENDING_APPROVAL') return;
    const timer = setInterval(
      () =>
        viewCall<PaymentRecord | null>('get_payment', { record_id: pending.recordId }, vault).then(
          (r) => r && setStatus(r.status),
          () => {},
        ),
      5000,
    );
    return () => clearInterval(timer);
  }, [pending.recordId, vault, status]);

  const open = status === 'PENDING_APPROVAL';
  return (
    <Link
      href={requestPath(vault, pending.recordId)}
      className="glass flex items-center justify-between gap-3 rounded-card px-4 py-3 hover:bg-white/[0.05]"
    >
      <div className="min-w-0">
        <div className={`text-xs font-medium uppercase tracking-[0.14em] ${open ? 'text-pending' : 'text-zinc-400'}`}>
          {open ? 'Waiting for your OK' : status === 'COMPLETED' ? 'Approved and paid' : status.toLowerCase()}
        </div>
        <div className="mt-0.5 truncate text-white">
          {amount} NEAR · {what}
        </div>
      </div>
      <span className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-medium text-ink">
        {open ? 'Review' : 'View'}
      </span>
    </Link>
  );
}

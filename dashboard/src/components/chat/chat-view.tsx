'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@/components/approve/wallet';
import { ExplorerLink } from '@/components/explorer-link';
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
  | { role: 'assistant'; vault: string; steps: Step[]; summary?: Summary; error?: string; done: boolean };

const IDEAS = ['Buy me today’s weather report', 'Get a 7-day forecast for Lagos', 'Renew my API plan for a year'];

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

  async function ask(task: string) {
    const trimmed = task.trim();
    if (!trimmed || running) return;
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
        body: JSON.stringify({ mode: 'task', task: trimmed, vault }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `The assistant couldn’t start (${res.status}).`);
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
      <div className="flex-1 space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="pt-6 text-center">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-white">What should I buy?</h1>
            <p className="mx-auto mt-2 max-w-sm text-zinc-400">
              I pay from your guarded wallet, inside the budget you set. Anything big waits for your OK.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              {IDEAS.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => ask(idea)}
                  className="glass rounded-xl px-4 py-3 text-left text-[15px] text-zinc-200 hover:bg-white/[0.05]"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-white/[0.09] px-4 py-2.5 text-[15px] text-white">
                {m.text}
              </p>
            </div>
          ) : (
            <Reply key={i} message={m} />
          ),
        )}
        <div ref={end} />
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-white/[0.06] bg-ink/85 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-zinc-500">
          <label className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0">Paying from</span>
            <select
              value={vault}
              onChange={(e) => setVault(e.target.value)}
              className="min-w-0 truncate rounded-md border border-white/10 bg-black/40 px-1.5 py-1 text-zinc-200"
            >
              {options.map((id) => (
                <option key={id} value={id}>
                  {id === CONTRACT_ID ? 'Demo wallet' : vaultName(id)}
                </option>
              ))}
            </select>
          </label>
          {left !== null && <span className="shrink-0">{left} runs left</span>}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(text);
          }}
          className="flex gap-2"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={TASK_MAX}
            placeholder="Ask me to buy something…"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none placeholder:text-zinc-500 focus:border-brand"
          />
          <button
            type="submit"
            disabled={running || !text.trim()}
            className="rounded-xl bg-brand px-4 font-semibold text-on-brand disabled:opacity-40"
          >
            {running ? '…' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Reply({ message }: { message: Extract<Message, { role: 'assistant' }> }) {
  const { steps, summary, error, done, vault } = message;
  const delivery = steps.find((s) => s.kind === 'delivery' && s.status === 'DELIVERED');
  const last = steps.at(-1);

  return (
    <div className="max-w-[92%] space-y-2">
      <div className="rounded-2xl rounded-bl-md border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-[15px] text-zinc-200">
        {!done && !summary && (
          <span className="flex items-center gap-2 text-zinc-400">
            <span className="size-2 animate-pulse rounded-full bg-brand" />
            {last ? last.title : 'Thinking…'}
          </span>
        )}
        {error && <span className="text-danger">{error}</span>}
        {summary && <SummaryText summary={summary} delivered={Boolean(delivery)} />}
        {done && !summary && !error && <span className="text-zinc-400">I stopped before paying anyone.</span>}
      </div>

      {delivery?.data != null && <Delivered data={delivery.data} />}
      {summary?.pending && <PendingChip vault={vault} pending={summary.pending} />}

      {steps.length > 0 && (
        <details className="px-1 text-xs text-zinc-500">
          <summary className="cursor-pointer select-none hover:text-zinc-300">
            What happened ({steps.length} steps)
          </summary>
          <ol className="mt-2 space-y-1.5 border-l border-white/10 pl-3">
            {steps.map((s, i) => (
              <li key={i} className="text-zinc-400">
                {s.title}
                {s.txHash && (
                  <span className="ml-2 inline-block align-middle">
                    <ExplorerLink txHash={s.txHash} />
                  </span>
                )}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

function SummaryText({ summary, delivered }: { summary: Summary; delivered: boolean }) {
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
        Your wallet said no{summary.reason ? `: ${summary.reason}` : '.'}{' '}
        <span className="text-zinc-400">Nothing was spent.</span>
      </>
    );
  return <>I didn’t buy anything. Open “What happened” for the reason.</>;
}

function Delivered({ data }: { data: unknown }) {
  const forecast = data as {
    city?: string;
    days?: { date: string; high_c: number; low_c: number; rain_chance: number }[];
  };
  if (!forecast?.days)
    return (
      <pre className="overflow-x-auto rounded-xl bg-black/30 p-3 font-mono text-xs text-zinc-300">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  return (
    <div className="glass rounded-card p-4">
      <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">Weather · {forecast.city}</div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {forecast.days.slice(0, 7).map((d) => (
          <div key={d.date} className="min-w-16 rounded-xl bg-black/25 px-3 py-2 text-center">
            <div className="text-xs text-zinc-500">
              {new Date(`${d.date}T12:00:00Z`).toLocaleDateString([], { weekday: 'short' })}
            </div>
            <div className="mt-1 font-mono text-sm text-white">{d.high_c}°</div>
            <div className="font-mono text-xs text-zinc-500">{d.low_c}°</div>
            <div className="mt-1 text-[11px] text-accent">{Math.round(d.rain_chance * 100)}% rain</div>
          </div>
        ))}
      </div>
    </div>
  );
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

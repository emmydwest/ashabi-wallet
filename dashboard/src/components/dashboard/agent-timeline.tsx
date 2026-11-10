import { Card, CardHeader } from '@/components/card';
import { ExplorerLink } from '@/components/explorer-link';
import { StatusChip } from '@/components/status-chip';
import type { ActionLog, LogEvent } from '@/lib/types';

const ACTS = [
  { act: 1, name: 'Act 1', title: 'A normal paid task', summary: 'The agent buys a forecast within policy.' },
  {
    act: 2,
    name: 'Act 2',
    title: 'Prompt injection',
    summary: 'A hidden line on a web page tells the agent to pay an attacker.',
  },
  { act: 3, name: 'Act 3', title: 'Human in control', summary: 'A large payment waits for the owner.' },
];

const TYPE_LABEL: Record<string, string> = {
  task: 'Task',
  fetch: 'Read',
  content_warning: 'Warning',
  model_decision: 'Model',
  compromise_override: 'Simulated compromise',
  payment_request: 'Request',
  contract_decision: 'Contract',
  settlement: 'Settlement',
  awaiting_owner: 'Waiting',
  owner_action: 'Owner',
  delivery: 'Vendor',
  error: 'Error',
};

function dotColor(event: LogEvent) {
  if (event.type === 'content_warning' || event.type === 'compromise_override') return 'bg-amber-400';
  if (event.status?.startsWith('BLOCKED') || event.type === 'error') return 'bg-rose-400';
  if (event.status === 'PENDING_APPROVAL' || event.type === 'awaiting_owner') return 'bg-amber-400';
  if (event.type === 'contract_decision' || event.type === 'settlement' || event.type === 'delivery')
    return 'bg-emerald-400';
  return 'bg-zinc-500';
}

function modelLabel(event: LogEvent) {
  const detail = event.detail as { provider?: string; model?: string } | undefined;
  return detail?.provider ? `${detail.provider} · ${detail.model}` : null;
}

export function AgentTimeline({ log }: { log: ActionLog }) {
  return (
    <Card>
      <CardHeader
        title="Agent action log"
        hint={`Structured decisions from demo run ${log.run_id}. Stated reasons only, no hidden reasoning.`}
      />
      <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-3">
        {ACTS.map((act) => (
          <div key={act.act} className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-emerald-300/80">{act.name}</div>
            <h3 className="mt-1 text-base font-semibold text-white">{act.title}</h3>
            <p className="text-sm text-zinc-500">{act.summary}</p>
            <ol className="mt-4 space-y-0">
              {log.events
                .filter((e) => e.act === act.act)
                .map((event, i, all) => (
                  <li key={event.seq} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < all.length - 1 && <span className="absolute left-[5px] top-3 h-full w-px bg-white/[0.08]" />}
                    <span
                      className={`relative mt-1.5 size-[11px] shrink-0 rounded-full ring-4 ring-ink ${dotColor(event)}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                          {TYPE_LABEL[event.type] ?? event.type}
                        </span>
                        {event.tx_hash && <ExplorerLink txHash={event.tx_hash} />}
                      </div>
                      <p className="mt-0.5 text-[13px] leading-snug text-zinc-200">{event.title}</p>
                      {modelLabel(event) && (
                        <p className="mt-1 font-mono text-[11px] text-zinc-500">{modelLabel(event)}</p>
                      )}
                      {event.status && event.type !== 'setup' && (
                        <div className="mt-1.5">
                          <StatusChip status={event.status} />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
            </ol>
          </div>
        ))}
      </div>
    </Card>
  );
}

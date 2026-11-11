import { ExplorerLink } from '@/components/explorer-link';
import { StatusChip } from '@/components/status-chip';
import type { AgentEvent, StepKind } from '@/lib/agent/types';

type Step = Extract<AgentEvent, { type: 'step' }>;

const LABEL: Record<StepKind, string> = {
  budget: 'Wallet',
  read: 'Read',
  warning: 'Injection',
  model: 'Model',
  guard: 'Check',
  request: 'Request',
  verdict: 'Contract',
  settlement: 'Settlement',
  delivery: 'Vendor',
  error: 'Error',
};

function dot(step: Step) {
  if (step.kind === 'warning') return 'bg-amber-400';
  if (step.kind === 'error' || step.status?.startsWith('BLOCKED') || step.status === 'REFUSED') return 'bg-rose-400';
  if (step.status === 'PENDING_APPROVAL' || step.kind === 'guard') return 'bg-amber-400';
  if (step.status === 'APPROVED' || step.status === 'COMPLETED' || step.status === 'DELIVERED') return 'bg-emerald-400';
  if (step.kind === 'model') return 'bg-sky-400';
  return 'bg-zinc-500';
}

type Forecast = { city: string; days: { date: string; high_c: number; low_c: number; rain_chance: number }[] };

function ForecastCard({ data }: { data: Forecast }) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04]">
      <div className="px-3 py-2 font-mono text-xs uppercase tracking-wider text-emerald-300">
        {data.city} · {data.days.length}-day forecast
      </div>
      <div className="flex gap-2 overflow-x-auto px-3 pb-3">
        {data.days.map((d) => (
          <div
            key={d.date}
            className="min-w-[4.5rem] rounded-lg border border-white/[0.06] bg-black/30 px-2.5 py-2 text-center"
          >
            <div className="font-mono text-xs text-zinc-400">{d.date.slice(5)}</div>
            <div className="mt-1 text-sm font-semibold text-white">{d.high_c}°</div>
            <div className="text-xs text-zinc-400">{d.low_c}°</div>
            <div className="mt-1 text-xs text-sky-300">{Math.round(d.rain_chance * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RunTimeline({ steps, running }: { steps: Step[]; running: boolean }) {
  return (
    <ol>
      {steps.map((step, i) => (
        <li key={i} className="animate-in relative flex gap-3 pb-5 last:pb-0">
          {(i < steps.length - 1 || running) && (
            <span className="absolute left-[5px] top-3 h-full w-px bg-white/[0.08]" />
          )}
          <span className={`relative mt-1.5 size-[11px] shrink-0 rounded-full ring-4 ring-[#0b0d13] ${dot(step)}`} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">{LABEL[step.kind]}</span>
              {step.txHash && <ExplorerLink txHash={step.txHash} label="View tx" variant="pill" />}
            </div>
            <p className="mt-0.5 break-words text-sm leading-snug text-zinc-100">{step.title}</p>
            {step.model && <p className="mt-1 font-mono text-xs text-sky-300/90">{step.model}</p>}
            {step.skipped && (
              <p className="mt-1 whitespace-pre-line font-mono text-xs text-zinc-500">Skipped: {step.skipped}</p>
            )}
            {step.body && (
              <p
                className={`mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed ${
                  step.kind === 'warning'
                    ? 'rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 font-mono text-xs text-amber-100'
                    : 'text-zinc-400'
                }`}
              >
                {step.body}
              </p>
            )}
            {step.args && (
              <details className="mt-2 rounded-lg border border-white/[0.07] bg-black/30">
                <summary className="cursor-pointer list-none px-3 py-1.5 font-mono text-xs text-zinc-300">
                  View args
                </summary>
                <pre className="overflow-x-auto border-t border-white/[0.06] px-3 py-2 font-mono text-xs leading-relaxed text-zinc-300">
                  {JSON.stringify(step.args, null, 2)}
                </pre>
              </details>
            )}
            {step.status && (
              <div className="mt-2">
                <StatusChip status={step.status} />
              </div>
            )}
            {step.kind === 'delivery' && Boolean(step.data) && <ForecastCard data={step.data as Forecast} />}
          </div>
        </li>
      ))}
      {running && (
        <li className="flex items-center gap-3 text-sm text-zinc-400">
          <span className="relative flex size-[11px]">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-[11px] rounded-full bg-emerald-400" />
          </span>
          Working…
        </li>
      )}
    </ol>
  );
}

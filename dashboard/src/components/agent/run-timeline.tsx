import { ExplorerLink } from '@/components/explorer-link';
import { StatusChip } from '@/components/status-chip';
import type { AgentEvent, BadgeTone, StepKind } from '@/lib/agent/types';

type Step = Extract<AgentEvent, { type: 'step' }>;

const LABEL: Record<StepKind, string> = {
  budget: 'Wallet',
  read: 'Read',
  warning: 'Injection',
  model: 'Model',
  guard: 'Check',
  http: 'HTTP',
  request: 'Request',
  verdict: 'Contract',
  settlement: 'Settlement',
  delivery: 'Vendor',
  error: 'Error',
};

const BADGE: Record<BadgeTone, string> = {
  amber: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  emerald: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  rose: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
};
const BADGE_DOT: Record<BadgeTone, string> = { amber: 'bg-amber-400', emerald: 'bg-emerald-400', rose: 'bg-rose-400' };

function dot(step: Step) {
  if (step.followed) return 'bg-rose-400';
  if (step.badge) return BADGE_DOT[step.badge.tone];
  if (step.kind === 'warning') return 'bg-amber-400';
  if (step.kind === 'error' || step.status?.startsWith('BLOCKED') || step.status === 'REFUSED') return 'bg-rose-400';
  if (step.status === 'PENDING_APPROVAL' || step.kind === 'guard') return 'bg-amber-400';
  if (step.status === 'APPROVED' || step.status === 'COMPLETED' || step.status === 'DELIVERED') return 'bg-emerald-400';
  if (step.kind === 'model') return 'bg-sky-400';
  return 'bg-zinc-500';
}

// What the model actually read: markup stripped, hidden blocks flattened into text.
const plainText = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

type Forecast = { city: string; days: { date: string; high_c: number; low_c: number; rain_chance: number }[] };

function ForecastCard({ data }: { data: Forecast }) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04]">
      <div className="px-3 py-2 font-mono text-xs uppercase tracking-wider text-emerald-300">
        {data.city} · {data.days.length === 1 ? 'today' : `${data.days.length}-day forecast`}
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
          <div
            className={`min-w-0 flex-1 ${step.followed ? '-mx-2 -my-1 rounded-xl border border-rose-400/40 bg-rose-500/[0.08] px-2 py-1 shadow-[0_0_24px_-6px_rgba(251,113,133,0.5)]' : ''}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">{LABEL[step.kind]}</span>
              {step.txHash && <ExplorerLink txHash={step.txHash} label="View tx" variant="pill" />}
            </div>
            {step.badge && (
              <span
                className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${BADGE[step.badge.tone]}`}
              >
                <span className="size-1.5 rounded-full bg-current" />
                {step.badge.text}
              </span>
            )}
            <p className="mt-0.5 break-words text-sm leading-snug text-zinc-100">{step.title}</p>
            {step.followed && (
              <div className="mt-2 rounded-lg border border-rose-400/30 bg-black/30 px-3 py-2">
                <div className="text-xs font-semibold text-rose-200">The model followed the hidden instruction</div>
                <p className="mt-1 break-words font-mono text-xs leading-relaxed text-rose-100/90">
                  {plainText(step.followed)}
                </p>
              </div>
            )}
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
            {step.checks && step.checks.length > 0 && (
              <ul className="mt-2 space-y-1">
                {step.checks.map((check) => (
                  <li key={check} className="flex gap-2 text-xs leading-relaxed text-zinc-300">
                    <span className="text-emerald-300">✓</span>
                    <span className="min-w-0 break-words">{check}</span>
                  </li>
                ))}
              </ul>
            )}
            {step.args && (
              <details className="mt-2 rounded-lg border border-white/[0.07] bg-black/30">
                <summary className="cursor-pointer list-none px-3 py-1.5 font-mono text-xs text-zinc-300">
                  {step.argsLabel ?? 'View args'}
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

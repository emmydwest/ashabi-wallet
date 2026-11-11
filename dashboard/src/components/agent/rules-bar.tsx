import { toNear } from '@/lib/near';
import type { WalletStatus } from '@/lib/types';

// The contract's live rules. Collapsed to one line so the form stays the focus; tap for the rest.
export function RulesBar({ status }: { status: WalletStatus }) {
  const used = BigInt(status.spent_today) + BigInt(status.reserved);
  const { guards } = status;
  const payees = status.approved_payees.length;
  return (
    <details className="group rounded-xl border border-white/10 bg-white/[0.03]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2.5">
        <span className="min-w-0 truncate text-xs text-zinc-400">
          <span className="font-medium uppercase tracking-[0.14em] text-zinc-300">Rules</span>
          <span className="tabular-nums">
            {' '}
            · spent today {toNear(used)} of {toNear(status.daily_limit)} NEAR
            <span className="hidden sm:inline">
              {' '}
              · auto-pay ≤ {toNear(status.approval_threshold)} · {payees} payee{payees === 1 ? '' : 's'}
            </span>
          </span>
        </span>
        <span aria-hidden className="shrink-0 text-zinc-400 transition-transform group-open:rotate-180">
          ⌄
        </span>
      </summary>
      <div className="flex flex-wrap gap-1.5 border-t border-white/[0.06] px-3.5 pb-3 pt-2.5">
        <Pill label="Auto-pay up to" value={`${toNear(status.approval_threshold)} NEAR`} />
        <Pill label="Spent today" value={`${toNear(used)} of ${toNear(status.daily_limit)} NEAR`} />
        <Pill label="Remaining today" value={`${toNear(status.remaining_today)} NEAR`} />
        {guards.max_auto_payments > 0 && (
          <Pill
            label={`Auto-paid in ${guards.velocity_window_minutes} min`}
            value={`${toNear(status.auto_paid_in_window)} of ${toNear(status.approval_threshold)} NEAR`}
          />
        )}
        {guards.breaker_strikes > 0 && (
          <Pill
            label="Kill-switch"
            value={
              status.breaker_until
                ? 'on, payments paused'
                : `${status.strikes} of ${guards.breaker_strikes} blocked payments to unknown accounts in a row`
            }
          />
        )}
        {status.pending_rules && status.pending_rules.max_pending > 0 && (
          <Pill label="Waiting for owner" value={`${status.pending_count} of ${status.pending_rules.max_pending}`} />
        )}
        {status.approved_payees.map((id) => (
          <Pill key={id} label="Payee" value={id} mono />
        ))}
      </div>
    </details>
  );
}

function Pill({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs">
      <span className="shrink-0 text-zinc-400">{label}</span>
      <span className={`truncate text-zinc-100 ${mono ? 'font-mono' : 'tabular-nums'}`}>{value}</span>
    </span>
  );
}

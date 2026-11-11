import { toNear } from '@/lib/near';
import type { WalletStatus } from '@/lib/types';

export function RulesBar({ status }: { status: WalletStatus }) {
  const used = BigInt(status.spent_today) + BigInt(status.reserved);
  const { guards } = status;
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.14em] text-zinc-400">Active rules</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Pill label="Auto-pay up to" value={`${toNear(status.approval_threshold)} NEAR`} />
        <Pill label="Today" value={`${toNear(used)} / ${toNear(status.daily_limit)} NEAR`} />
        {guards.max_auto_payments > 0 && (
          <Pill
            label="Velocity"
            value={`${status.auto_payments_in_window}/${guards.max_auto_payments} per ${guards.velocity_window_minutes} min`}
          />
        )}
        {guards.breaker_strikes > 0 && (
          <Pill label="Breaker" value={`${status.strikes}/${guards.breaker_strikes} strikes`} />
        )}
        {status.approved_payees.map((id) => (
          <Pill key={id} label="Payee" value={id} mono />
        ))}
      </div>
    </div>
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

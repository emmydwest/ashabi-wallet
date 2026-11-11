import { toNear } from '@/lib/near';
import { BUDGET_RESET, budgetToday } from '@/lib/stats';
import type { WalletStatus } from '@/lib/types';

// Today's budget, phrased the same way on every page.
export function BudgetMeter({ status, className = '' }: { status: WalletStatus; className?: string }) {
  const b = budgetToday(status);
  const out = BigInt(b.remaining) === 0n;
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-zinc-300">
          Spent today{' '}
          <span className="font-mono text-white tabular">
            {toNear(b.used)} of {toNear(b.limit)}
          </span>{' '}
          NEAR
        </span>
        <span className={`shrink-0 text-xs ${out ? 'text-pending' : 'text-zinc-400'}`}>
          Remaining today <span className="font-mono tabular">{toNear(b.remaining)}</span> NEAR
        </span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
        role="progressbar"
        aria-valuenow={b.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Daily budget used"
      >
        <div className={`h-full rounded-full ${out ? 'bg-pending' : 'bg-brand'}`} style={{ width: `${b.percent}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-zinc-500">
        {b.reserved && <>Includes {toNear(b.reserved)} NEAR waiting for the owner · </>}
        Budget {BUDGET_RESET}
      </p>
    </div>
  );
}

import { Card, CardHeader } from '@/components/card';
import { ExplorerLink } from '@/components/explorer-link';
import { AGENT_ID, CONTRACT_ID } from '@/lib/config';
import { shortAccount } from '@/lib/format';
import { toNear } from '@/lib/near';
import type { GuardianSnapshot } from '@/lib/types';
import { BUDGET_RESET } from '@/lib/stats';
import { BudgetGauge } from './budget-gauge';

export function BalanceCard({ snapshot }: { snapshot: GuardianSnapshot }) {
  const { status } = snapshot;
  return (
    <Card className="flex flex-col">
      <CardHeader title="Vault balance" action={<ExplorerLink label={shortAccount(CONTRACT_ID)} />} />
      <div className="flex flex-1 flex-col justify-between gap-6 px-5 pb-5 pt-6 sm:px-6 sm:pb-6">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="tabular font-mono text-5xl font-semibold tracking-tight text-white">
              {toNear(status.available_balance)}
            </span>
            <span className="text-lg text-zinc-400">NEAR</span>
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            Spendable, held by the contract. The agent never holds these funds.
          </p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-white/[0.06] rounded-xl border border-white/[0.06] bg-black/20">
          <Stat label="Accepted, all-time" value={status.payment_count} />
          <Stat label="Blocked, all-time" value={status.blocked_count} tone="text-rose-300" />
          <Stat label="Waiting now" value={status.pending_count} tone="text-amber-300" />
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value, tone = 'text-white' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="min-w-0 px-3 py-3 sm:px-4">
      <div className={`tabular font-mono text-xl font-semibold ${tone}`}>{value}</div>
      <div className="text-xs text-zinc-400">{label}</div>
    </div>
  );
}

export function BudgetCard({ snapshot }: { snapshot: GuardianSnapshot }) {
  return (
    <Card>
      <CardHeader
        title="Daily budget"
        hint={`Payments waiting for the owner already count as spent until decided. The budget ${BUDGET_RESET}.`}
      />
      <div className="px-5 pb-6 pt-4 sm:px-6">
        <BudgetGauge status={snapshot.status} />
      </div>
    </Card>
  );
}

export function PolicyCard({ snapshot }: { snapshot: GuardianSnapshot }) {
  const { status } = snapshot;
  return (
    <Card>
      <CardHeader
        title="Policy"
        hint="Enforced by the contract on every request."
        action={
          status.frozen ? (
            <span className="rounded-full bg-rose-500/15 px-2.5 py-1 font-mono text-xs text-rose-300">FROZEN</span>
          ) : (
            <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 font-mono text-xs text-emerald-300">
              ACTIVE
            </span>
          )
        }
      />
      <dl className="space-y-4 px-5 pb-6 pt-5 text-sm sm:px-6">
        <Row label="Owner approval above">{toNear(status.approval_threshold)} NEAR</Row>
        <Row label="Daily limit">{toNear(status.daily_limit)} NEAR</Row>
        <Row label="Agent">
          <span title={AGENT_ID}>{shortAccount(status.agent_id)}</span>
          <span className="ml-2 rounded bg-white/5 px-1.5 py-0.5 text-xs text-zinc-400">request_payment only</span>
        </Row>
        <div>
          <dt className="text-zinc-400">Approved payees</dt>
          <dd className="mt-2 flex flex-wrap gap-2">
            {status.approved_payees.map((payee) => (
              <span
                key={payee}
                className="wrap-ids max-w-full rounded-lg border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1 font-mono text-xs text-emerald-200"
              >
                {payee}
              </span>
            ))}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4">
      <dt className="shrink-0 text-zinc-400">{label}</dt>
      <dd className="min-w-0 wrap-ids text-right font-mono text-white">{children}</dd>
    </div>
  );
}

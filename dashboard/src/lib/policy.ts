import { CONTRACT_ID } from './config';
import { nearToYocto, toNear } from './near';
import type { Guards, WalletStatus } from './types';

// The AI policy writer only proposes. Everything it returns goes through this check, in the
// API route and again in the browser, and each surviving change is signed by the owner.

export type PolicyProposal = {
  daily_limit_near?: string | null;
  approval_threshold_near?: string | null;
  add_payees?: string[];
  remove_payees?: string[];
  guards?: Partial<Guards> | null;
  summary?: string;
};

export type PolicyChange = {
  key: string;
  label: string;
  from: string;
  to: string;
  method: string;
  args: Record<string, unknown>;
  warning?: string;
};

export type ReviewedPolicy = { changes: PolicyChange[]; rejected: string[]; summary: string };

export const LIMITS = {
  dailyLimitNear: { min: 0.01, max: 100 },
  guards: {
    max_auto_payments: { min: 0, max: 20 },
    velocity_window_minutes: { min: 1, max: 1440 },
    breaker_strikes: { min: 0, max: 20 },
    breaker_cooldown_minutes: { min: 1, max: 1440 },
  },
  payeesPerChange: 5,
} as const;

const ACCOUNT_ID = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;
const NEAR_AMOUNT = /^\d{1,6}(\.\d{1,3})?$/;

export function accountProblem(id: string) {
  if (id.length < 2 || id.length > 64 || !ACCOUNT_ID.test(id)) return 'is not a valid NEAR account id';
  if (!/\.testnet$/.test(id) && !/^[0-9a-f]{64}$/.test(id)) return 'is not a testnet account';
  return null;
}

function amount(raw: unknown, label: string, rejected: string[]) {
  if (raw === undefined || raw === null || raw === '') return null;
  const text = String(raw).trim();
  if (!NEAR_AMOUNT.test(text)) {
    rejected.push(`${label} “${text.slice(0, 20)}” is not a NEAR amount`);
    return null;
  }
  return String(Number(text));
}

export function reviewProposal(
  proposal: PolicyProposal,
  status: WalletStatus,
  blockedCounts: Record<string, number> = {},
  vaultId = CONTRACT_ID,
): ReviewedPolicy {
  const rejected: string[] = [];
  const changes: PolicyChange[] = [];
  const near = (yocto: string) => toNear(yocto, 2);

  const daily = amount(proposal.daily_limit_near, 'Daily limit', rejected);
  const { min, max } = LIMITS.dailyLimitNear;
  let dailyYocto = BigInt(status.daily_limit);
  if (daily !== null) {
    if (Number(daily) < min || Number(daily) > max) rejected.push(`Daily limit must be ${min}–${max} NEAR`);
    else if (nearToYocto(daily) !== dailyYocto) {
      dailyYocto = nearToYocto(daily);
      changes.push({
        key: 'daily_limit',
        label: 'Daily limit',
        from: `${near(status.daily_limit)} NEAR`,
        to: `${daily} NEAR`,
        method: 'set_daily_limit',
        args: { daily_limit: dailyYocto.toString() },
        warning: Number(daily) > 20 ? 'Much higher than a demo needs.' : undefined,
      });
    }
  }

  const threshold = amount(proposal.approval_threshold_near, 'Approval threshold', rejected);
  if (threshold !== null) {
    const yocto = nearToYocto(threshold);
    if (yocto <= 0n) rejected.push('Approval threshold must be above 0');
    else if (yocto > dailyYocto) rejected.push('Approval threshold cannot be above the daily limit');
    else if (yocto !== BigInt(status.approval_threshold))
      changes.push({
        key: 'approval_threshold',
        label: 'Owner approval above',
        from: `${near(status.approval_threshold)} NEAR`,
        to: `${threshold} NEAR`,
        method: 'set_approval_threshold',
        args: { approval_threshold: yocto.toString() },
      });
  }

  const reserved = new Set([CONTRACT_ID, vaultId, status.agent_id, status.owner_id]);
  const payees = (list: unknown, adding: boolean) => {
    if (!Array.isArray(list)) return;
    const unique = [...new Set(list.map((p) => String(p).trim().toLowerCase()))];
    if (unique.length > LIMITS.payeesPerChange)
      rejected.push(`At most ${LIMITS.payeesPerChange} payees per change; ignored the rest`);
    for (const id of unique.slice(0, LIMITS.payeesPerChange)) {
      const problem = accountProblem(id);
      if (problem) rejected.push(`“${id.slice(0, 64)}” ${problem}`);
      else if (adding && reserved.has(id)) rejected.push(`${id} is the guardian, its agent or its owner`);
      else if (adding === status.approved_payees.includes(id))
        rejected.push(`${id} is ${adding ? 'already' : 'not'} an approved payee`);
      else {
        const blocked = blockedCounts[id] ?? 0;
        changes.push({
          key: `${adding ? 'add' : 'remove'}:${id}`,
          label: adding ? 'Add payee' : 'Remove payee',
          from: adding ? 'not allowed' : 'allowed',
          to: adding ? 'allowed' : 'not allowed',
          method: adding ? 'add_payee' : 'remove_payee',
          args: { account_id: id },
          warning:
            adding && blocked > 0
              ? `The contract has blocked ${blocked} payment${blocked === 1 ? '' : 's'} to this account as suspicious.`
              : undefined,
        });
      }
    }
  };
  payees(proposal.add_payees, true);
  payees(proposal.remove_payees, false);

  if (proposal.guards && typeof proposal.guards === 'object') {
    const next: Guards = { ...status.guards };
    let valid = true;
    for (const [key, bounds] of Object.entries(LIMITS.guards) as [keyof Guards, { min: number; max: number }][]) {
      const raw = (proposal.guards as Record<string, unknown>)[key];
      if (raw === undefined || raw === null) continue;
      const value = Number(raw);
      // 0 switches a guard off. A window or cooldown of 0 means "no change", since the
      // contract needs at least a minute there and it only matters while the guard is on.
      const duration = key === 'velocity_window_minutes' || key === 'breaker_cooldown_minutes';
      if (duration && value === 0) continue;
      const lowest = duration ? 1 : bounds.min;
      if (!Number.isInteger(value) || value < lowest || value > bounds.max) {
        rejected.push(`${key} must be a whole number from ${lowest} to ${bounds.max}`);
        valid = false;
      } else next[key] = value;
    }
    const changed = (Object.keys(next) as (keyof Guards)[]).filter((k) => next[k] !== status.guards[k]);
    if (valid && changed.length) {
      const off = [] as string[];
      if (next.max_auto_payments === 0) off.push('turns the velocity limit off');
      if (next.breaker_strikes === 0) off.push('turns the circuit breaker off');
      changes.push({
        key: 'guards',
        label: 'Guards',
        from: describeGuards(status.guards),
        to: describeGuards(next),
        method: 'set_guards',
        args: { guards: next },
        warning: off.length ? `This ${off.join(' and ')}.` : undefined,
      });
    }
  }

  return { changes, rejected, summary: String(proposal.summary ?? '').slice(0, 240) };
}

export const describeGuards = (g: Guards) =>
  [
    g.max_auto_payments ? `${g.max_auto_payments} auto-pays / ${g.velocity_window_minutes} min` : 'velocity off',
    g.breaker_strikes ? `breaker ${g.breaker_strikes} strikes, ${g.breaker_cooldown_minutes} min` : 'breaker off',
  ].join(' · ');

// Keeps only the fields the writer may set, with the types it may set them to.
export function sanitizeProposal(raw: unknown): PolicyProposal {
  const r = (raw ?? {}) as Record<string, unknown>;
  const list = (v: unknown) => (Array.isArray(v) ? v.slice(0, 10).map((x) => String(x).slice(0, 80)) : []);
  const guards =
    r.guards && typeof r.guards === 'object'
      ? Object.fromEntries(
          Object.keys(LIMITS.guards)
            .filter((k) => (r.guards as Record<string, unknown>)[k] !== undefined)
            .map((k) => [k, (r.guards as Record<string, unknown>)[k]]),
        )
      : null;
  const text = (v: unknown) => (v === undefined || v === null ? null : String(v).slice(0, 20));
  return {
    daily_limit_near: text(r.daily_limit_near),
    approval_threshold_near: text(r.approval_threshold_near),
    add_payees: list(r.add_payees),
    remove_payees: list(r.remove_payees),
    guards: guards as Partial<Guards> | null,
    summary: String(r.summary ?? '').slice(0, 240),
  };
}

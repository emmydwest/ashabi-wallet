const TONES = {
  safe: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  pending: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  danger: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
  info: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
  muted: 'border-white/10 bg-white/5 text-zinc-300',
} as const;

const STATUS_TONE: Record<string, keyof typeof TONES> = {
  APPROVED: 'safe',
  COMPLETED: 'safe',
  DELIVERED: 'safe',
  PENDING_APPROVAL: 'pending',
  TRANSFERRING: 'info',
  BLOCKED_RECIPIENT: 'danger',
  BLOCKED_BUDGET: 'danger',
  INSUFFICIENT_FUNDS: 'danger',
  FROZEN: 'danger',
  DUPLICATE: 'danger',
  FAILED: 'danger',
  REJECTED: 'muted',
};

export function StatusChip({ status }: { status: string }) {
  const tone = TONES[STATUS_TONE[status] ?? 'muted'];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-wide ${tone}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status.replaceAll('_', ' ')}
    </span>
  );
}

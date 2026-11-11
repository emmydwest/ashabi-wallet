// A still of what the owner sees, in the product's own words. Illustrative, not live data.
const FEED = [
  { text: 'Bought today’s weather report', amount: '0.05', tone: 'text-safe', label: 'Paid' },
  { text: 'Tried to pay an account you never added', amount: '2.00', tone: 'text-danger', label: 'Blocked' },
];

export function HeroPreview() {
  return (
    <div className="mx-auto w-full max-w-sm space-y-3" aria-hidden>
      <div className="glass rounded-card p-5">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-pending">Needs your OK</div>
        <p className="mt-3 text-lg leading-snug text-zinc-200">
          Your AI wants to spend <span className="font-display text-2xl font-semibold text-white">1.50 NEAR</span> on{' '}
          <span className="font-semibold text-white">a year of the weather API</span>.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <span className="rounded-xl border border-white/10 py-3 text-center text-zinc-200">Reject</span>
          <span className="rounded-xl bg-brand py-3 text-center font-semibold text-on-brand">Approve</span>
        </div>
      </div>
      {FEED.map((item) => (
        <div key={item.text} className="glass flex items-center justify-between gap-3 rounded-card px-4 py-3">
          <div className="min-w-0">
            <div className={`text-xs font-medium ${item.tone}`}>{item.label}</div>
            <div className="truncate text-sm text-zinc-200">{item.text}</div>
          </div>
          <span className="shrink-0 font-mono text-sm text-zinc-300">{item.amount} NEAR</span>
        </div>
      ))}
      <div className="glass rounded-card px-4 py-3 text-sm">
        <div className="flex justify-between text-zinc-400">
          <span>Left to spend today</span>
          <span className="font-mono text-white">1.45 of 2 NEAR</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full w-[72%] rounded-full bg-brand" />
        </div>
      </div>
    </div>
  );
}

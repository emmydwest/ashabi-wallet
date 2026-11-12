// Who can do what, drawn as a flow. Each box is a real piece of the system.
const CHAIN = [
  { title: 'Your AI agent', body: 'Any model. Assume it can be tricked.', tone: 'border-white/10' },
  {
    title: 'Restricted key',
    body: 'Can only call request_payment. Can’t move money or change rules.',
    tone: 'border-white/10',
  },
  {
    title: 'Vault contract',
    body: 'Holds the money. Checks the payee list, today’s budget and your limit on every request.',
    tone: 'border-brand/50 bg-brand-soft',
  },
];

const OUTCOMES = [
  { title: 'Approved recipient', body: 'Small, allowed payments go straight through.', dot: 'bg-safe' },
  { title: 'Your phone', body: 'Anything over your limit waits for you to approve.', dot: 'bg-pending' },
  {
    title: 'Refused',
    body: 'Unknown payees, over budget, too fast: nothing moves, and it’s on record.',
    dot: 'bg-danger',
  },
];

function Arrow() {
  return (
    <div className="flex items-center justify-center text-zinc-600 lg:px-1" aria-hidden>
      <svg
        viewBox="0 0 24 24"
        className="size-5 rotate-90 lg:rotate-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M4 12h15m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Architecture() {
  return (
    <figure className="glass rounded-3xl p-5 sm:p-8">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
        {CHAIN.map((node, i) => (
          <div key={node.title} className="contents">
            {i > 0 && <Arrow />}
            <div className={`rounded-2xl border p-4 lg:flex-1 ${node.tone}`}>
              <div className="font-display font-semibold text-white">{node.title}</div>
              <p className="mt-1 text-sm leading-snug text-zinc-400">{node.body}</p>
            </div>
          </div>
        ))}
        <Arrow />
        <div className="grid gap-2 lg:flex-[1.3]">
          {OUTCOMES.map((o) => (
            <div key={o.title} className="rounded-2xl border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 font-medium text-white">
                <span className={`size-2 shrink-0 rounded-full ${o.dot}`} />
                {o.title}
              </div>
              <p className="mt-0.5 text-sm leading-snug text-zinc-400">{o.body}</p>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-5 text-sm text-zinc-500">
        The model decides what to buy. Only the contract decides whether money moves, and only you can change its rules,
        by signing in your own wallet.
      </figcaption>
    </figure>
  );
}

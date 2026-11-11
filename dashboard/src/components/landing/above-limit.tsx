const STEPS = [
  {
    title: 'The request pauses',
    body: 'Your AI asks for more than your auto-pay limit. The contract records it and sets the money aside.',
  },
  {
    title: 'You get a card',
    body: '“Your AI wants to spend 1.50 NEAR on a year of the weather API.” Approve or Reject, on your phone.',
  },
  {
    title: 'Nothing moves until you sign',
    body: 'Only your wallet can approve. The AI can’t, and neither can this website.',
  },
  {
    title: 'Ignored? It expires',
    body: 'After 24 hours an unanswered request expires and its budget is released. At most three can wait.',
  },
];

export function AboveLimit() {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((step, i) => (
        <li key={step.title} className="glass relative rounded-2xl p-5">
          <span className="font-mono text-xs text-pending">Step {i + 1}</span>
          <h3 className="mt-2 font-display text-lg font-semibold text-white">{step.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

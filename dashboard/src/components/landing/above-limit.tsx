import { CoinStackArt, OwnerArt, VaultArt } from '@/components/art/pieces';

const STEPS = [
  {
    art: <VaultArt state="held" size={52} />,
    title: 'The request pauses',
    body: 'Your AI asks for more than your auto-pay limit. The contract records it and sets the money aside.',
  },
  {
    art: <OwnerArt state="asking" size={52} />,
    title: 'You get a card',
    body: '“Your AI wants to spend 1.50 NEAR on a year of the weather API.” Approve or Reject, on your phone.',
  },
  {
    art: <OwnerArt state="approved" size={52} />,
    title: 'Nothing moves until you sign',
    body: 'Only your wallet can approve. The AI can’t, and neither can this website.',
  },
  {
    art: <CoinStackArt size={52} columns={[2, 4]} animate={false} />,
    title: 'Ignored? It expires',
    body: 'After 24 hours an unanswered request expires and its budget is released. At most three can wait.',
  },
];

export function AboveLimit() {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((step, i) => (
        <li key={step.title} className="glass lift relative rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <span className="font-mono text-xs text-pending">Step {i + 1}</span>
            <span className="-m-1">{step.art}</span>
          </div>
          <h3 className="mt-2 font-display text-lg font-semibold text-white">{step.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

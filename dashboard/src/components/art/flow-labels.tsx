import { FLOW_NODES } from './flow-geometry';

// Names under the three nodes of <PaymentFlow />, lined up with the drawing at any width.
export function FlowLabels({
  agent = 'Your AI agent',
  contract = 'The contract',
  payee,
}: {
  agent?: string;
  contract?: string;
  payee: string;
}) {
  const items = [
    { at: FLOW_NODES.agent, text: agent, tone: 'text-zinc-400' },
    { at: FLOW_NODES.contract, text: contract, tone: 'text-white' },
    { at: FLOW_NODES.payee, text: payee, tone: 'text-zinc-400' },
  ];
  return (
    <div className="relative mt-1 h-5 text-xs sm:text-sm" aria-hidden>
      {items.map((item) => (
        <span
          key={item.text}
          className={`absolute top-0 max-w-[34%] -translate-x-1/2 truncate text-center ${item.tone}`}
          style={{ left: `${item.at * 100}%` }}
        >
          {item.text}
        </span>
      ))}
    </div>
  );
}

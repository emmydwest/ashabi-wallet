'use client';

import { FlowLabels } from '@/components/art/flow-labels';
import { PaymentFlow, type FlowState } from '@/components/art/payment-flow';
import type { AgentEvent } from '@/lib/agent/types';
import { VENDOR_ID } from '@/lib/config';
import { shortAccount } from '@/lib/format';
import type { WalletStatus } from '@/lib/types';

type Step = Extract<AgentEvent, { type: 'step' }>;
type Summary = Extract<AgentEvent, { type: 'summary' }>;

type Props = {
  steps: Step[];
  summary: Summary | null;
  running: boolean;
  status?: WalletStatus;
  runs: number;
};

// The payee the agent actually asked the contract to pay, if it got that far.
function requestedPayee(steps: Step[]) {
  const request = steps.findLast((s) => s.kind === 'request');
  const receiver = request?.args?.receiver_id;
  return typeof receiver === 'string' ? receiver : null;
}

/** What the drawing should show, read only from the run's own events and the contract's state. */
export function flowFor({ steps, summary, running, status }: Omit<Props, 'runs'>): {
  state: FlowState;
  caption: string;
} | null {
  if (summary) {
    const v = summary.verdict;
    if (v === 'PENDING_APPROVAL') return { state: 'pending', caption: 'Held in the contract until the owner signs.' };
    if (v && v !== 'APPROVED' && v !== 'REFUSED')
      return { state: 'blocked', caption: 'The contract refused. No funds left the vault.' };
    if (summary.moved || v === 'APPROVED')
      return summary.outcome === 'breached'
        ? { state: 'paid', caption: 'The payment went through. Report this.' }
        : { state: 'paid', caption: 'Paid an approved payee, inside today’s budget.' };
    return {
      state: 'idle',
      caption: v === 'REFUSED' ? 'The vendor refused first. Nothing was sent.' : 'Nothing was sent to the contract.',
    };
  }
  if (running) {
    return requestedPayee(steps)
      ? { state: 'checking', caption: 'The contract is checking the request…' }
      : { state: 'thinking', caption: 'The agent is working out what to buy…' };
  }
  if (status?.frozen) return { state: 'frozen', caption: 'Frozen by the owner. Nothing can move.' };
  if (status?.breaker_until)
    return { state: 'frozen', caption: 'Kill-switch on. Spending is paused until it cools down.' };
  return null;
}

export function RunFlow({ runs, ...props }: Props) {
  const flow = flowFor(props);
  if (!flow) return null;
  const receiver = requestedPayee(props.steps);
  // The demo vault approves exactly one payee, so anyone else the agent tries to pay is the attack.
  const payee = receiver && receiver !== VENDOR_ID ? 'attacker' : 'vendor';
  return (
    <figure className="animate-in mb-6 rounded-2xl border border-white/[0.06] bg-black/30 px-3 pb-3 pt-4 sm:px-5">
      <PaymentFlow state={flow.state} payee={payee} playKey={runs} />
      <FlowLabels agent="Agent" contract="Contract" payee={receiver ? shortAccount(receiver) : 'Payee'} />
      <figcaption className="mt-2 text-center text-sm text-zinc-300" aria-live="polite">
        {flow.caption}
      </figcaption>
    </figure>
  );
}

/** A smaller copy for a chat reply, shown only once the agent actually asked the contract to pay. */
export function ChatRunFlow({ steps, summary, running }: { steps: Step[]; summary: Summary | null; running: boolean }) {
  const receiver = requestedPayee(steps);
  const flow = receiver ? flowFor({ steps, summary, running }) : null;
  if (!receiver || !flow) return null;
  return (
    <figure className="animate-in max-w-sm rounded-2xl border border-white/[0.06] bg-black/30 px-3 pb-2 pt-3">
      {/* Your own vault may allow other payees, so only a refused stranger is drawn as an attacker. */}
      <PaymentFlow
        state={flow.state}
        payee={receiver !== VENDOR_ID && flow.state === 'blocked' ? 'attacker' : 'vendor'}
      />
      <FlowLabels agent="Ashabi" contract="Contract" payee={shortAccount(receiver)} />
      <figcaption className="mt-1 text-center text-xs text-zinc-400">{flow.caption}</figcaption>
    </figure>
  );
}

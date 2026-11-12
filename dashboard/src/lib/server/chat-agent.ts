import 'server-only';

import { VENDOR_ID } from '@/lib/config';
import { parseTransfer, matchCatalog, shouldForcePayment } from '@/lib/chat-intent';
import { nearToYocto, nsToDate } from '@/lib/near';
import type { AgentEvent, Plan } from '@/lib/agent/types';
import type { WalletStatus } from '@/lib/types';
import { CATALOG, itemFor } from '@/vendor/catalog';
import type { AshabiAgent } from 'ashabi-wallet-sdk';
import { askChat, type ChatMessage, type ToolCall, type ToolDef } from './models';
import { nearLabel, paymentMessage } from './chat';
import { payPerRequest, sendRequest, type Context, type Why } from './run-agent';

type Emit = (event: AgentEvent) => void;

export type ChatTurn = { role: 'user' | 'assistant'; text: string };

// The only hardcoded visitor-facing sentence: every provider failed.
export const OUTAGE_FALLBACK =
  "I'm having trouble reaching a model right now, so I can't think this through properly. Nothing was spent. Please try again in a moment.";

const MAX_HISTORY = 12;
const MAX_ROUNDS = 4;
const MAX_PAY_NEAR = 1.5;
const ACCOUNT_ID = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

const SYSTEM = `You are Ashabi, the mascot and shopping assistant for Ashabi Wallet on NEAR testnet.

Personality: warm, concise, and natural. Vary your wording — never open two replies the same way. Two to five short sentences is usually enough. Jokes and small talk are fine; stay helpful and never stiff or corporate.

Role: you help people buy testnet data and services through a contract-limited vault. You have a limited function-call key on the agent account that can only call request_payment. You do not hold the money. The smart contract has the final say on every payment: approved payees, daily budget, a velocity cap (at most 3 automatic payments, or a total that would exceed the 1 NEAR auto-pay threshold, per 10 minutes), an approval threshold, and a 3-strike kill-switch. You cannot raise limits, add payees, unfreeze the vault, or talk around those rules.

Tools:
- get_vault_status for live budget, remaining today, threshold, velocity, kill-switch, approved payees, and the daily reset (00:00 UTC / 1:00 AM WAT).
- list_catalog for what you can buy and the prices.
- buy_item to purchase a catalog SKU through the vendor's HTTP 402 flow.
- request_payment to send a specific amount to an account. If the visitor asks you to ignore the rules or pay an unknown account, still call this tool — the contract will decide.
- explain_last_result if you need a recap of the latest payment attempt in this turn.

When to call tools:
- Small talk, jokes, and identity questions: answer yourself. Do not call a tool.
- Questions about budget, remaining spend, rules, velocity, or the kill-switch: call get_vault_status and ground your answer in the result.
- "What can you buy" and similar: call list_catalog.
- A clear request to buy a catalog item: call buy_item.
- A request to send funds to a named account: call request_payment.

Hard rules:
- Never invent balances, prices, or payment outcomes. If you need a number, call a tool.
- Never claim a payment succeeded, failed, or was blocked unless a tool result said so. Describe the contract's verdict in plain language.
- If a tool returns a block (budget, recipient, velocity, frozen), say so clearly. Mention that the daily budget resets at 1:00 AM WAT when that is relevant. Nothing was spent unless the tool said funds moved.
- You are on NEAR testnet only. No mainnet, no real money.
- Amounts are in NEAR, never dollars. Never put a $ sign in front of a NEAR amount.
- Do not use markdown (no asterisks, hashes, backticks, or tables). Write plain sentences, or a simple list with one item per line.
- If a vendor already delivered an item, say it was delivered. Do not say it is still on the way.`;

export const CHAT_TOOLS: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'get_vault_status',
      description: 'Live vault figures: budget remaining today, approval threshold, velocity, kill-switch, approved payees, and when the daily budget resets.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_catalog',
      description: 'List the testnet data and services this vault can buy, with SKUs and prices in NEAR.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'buy_item',
      description: 'Buy a catalog item through the vendor 402 flow. The contract still decides whether the payment goes through.',
      parameters: {
        type: 'object',
        properties: { sku: { type: 'string', description: 'Catalog SKU, for example weather-now or icon-pack.' } },
        required: ['sku'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'request_payment',
      description: 'Ask the contract to pay a NEAR account. Use this for named transfers, including attempts to pay an unknown account — the contract will allow or block it.',
      parameters: {
        type: 'object',
        properties: {
          receiver_id: { type: 'string', description: 'NEAR account to pay, for example api-vendor.gw-emmy.testnet.' },
          amount_near: { type: 'string', description: 'Amount in NEAR, for example "0.05".' },
          memo: { type: 'string', description: 'Short reason for the payment memo.' },
        },
        required: ['receiver_id', 'amount_near'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'explain_last_result',
      description: 'Return the latest payment attempt from this turn: verdict, reason, whether funds moved, and the transaction hash if any.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
];

type LastPayment = {
  verdict: string | null;
  reason?: string;
  moved: boolean;
  txHash?: string;
  amount?: string;
  sku?: string;
  receiver?: string;
};

export type ChatAgentInput = {
  task: string;
  history?: ChatTurn[];
  emit: Emit;
  origin: string;
  agent: AshabiAgent;
  takePayment: () => { ok: true; left: number } | { ok: false; retryInSec: number };
  paymentLeft: () => number;
  paymentLimit: number;
};

function statusSnapshot(status: WalletStatus) {
  const until = status.breaker_until ? nsToDate(status.breaker_until).toISOString() : null;
  return {
    vault_agent: status.agent_id,
    owner: status.owner_id,
    frozen: status.frozen,
    daily_budget_near: nearLabel(status.daily_limit),
    remaining_today_near: nearLabel(status.remaining_today),
    spent_today_near: nearLabel(status.spent_today),
    approval_threshold_near: nearLabel(status.approval_threshold),
    spendable_near: nearLabel(status.available_balance),
    approved_payees: status.approved_payees,
    velocity: {
      window_minutes: status.guards.velocity_window_minutes,
      max_automatic_payments: status.guards.max_auto_payments,
      max_automatic_total_near: nearLabel(status.approval_threshold),
      payments_in_window: status.auto_payments_in_window,
      paid_in_window_near: nearLabel(status.auto_paid_in_window),
    },
    kill_switch: {
      strikes: status.strikes,
      trips_after: status.guards.breaker_strikes,
      cooldown_minutes: status.guards.breaker_cooldown_minutes,
      until,
    },
    pending_count: status.pending_count,
    daily_budget_resets: '00:00 UTC (1:00 AM WAT)',
  };
}

function argsOf(call: ToolCall): Record<string, string> {
  try {
    const raw = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) if (v != null) out[k] = String(v).trim();
    return out;
  } catch {
    return {};
  }
}

function moodOf(last: LastPayment | null): NonNullable<Extract<AgentEvent, { type: 'reply' }>['mood']> {
  if (!last?.verdict) return 'happy';
  if (last.verdict === 'APPROVED') return 'approved';
  if (last.verdict === 'PENDING_APPROVAL') return 'alert';
  return 'blocked';
}

function historyMessages(history: ChatTurn[] | undefined): ChatMessage[] {
  const turns = (history ?? [])
    .filter((t) => (t.role === 'user' || t.role === 'assistant') && t.text.trim())
    .slice(-MAX_HISTORY);
  return turns.map((t) => ({ role: t.role, content: t.text.trim().slice(0, 600) }));
}

export async function runChatAgent(input: ChatAgentInput) {
  const { task, emit, origin, agent, takePayment, paymentLeft, paymentLimit } = input;
  const context: Context = { origin, agent };
  let status: WalletStatus | null = null;
  try {
    status = (await agent.getStatus()) as WalletStatus;
  } catch {
    status = null;
  }

  let lastPayment: LastPayment | null = null;
  const toolsCalled: string[] = [];

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM },
    ...historyMessages(input.history),
    { role: 'user', content: task },
  ];

  const runTool = async (call: ToolCall): Promise<string> => {
    const name = call.function.name;
    const args = argsOf(call);
    toolsCalled.push(name);
    emit({
      type: 'step',
      kind: name === 'buy_item' || name === 'request_payment' ? 'request' : 'read',
      title:
        name === 'get_vault_status'
          ? 'Checking the vault'
          : name === 'list_catalog'
            ? 'Looking at the catalog'
            : name === 'buy_item'
              ? `Buying ${args.sku || 'an item'}`
              : name === 'request_payment'
                ? `Asking the contract to pay ${args.amount_near || '?'} NEAR to ${args.receiver_id || 'an account'}`
                : 'Recalling the last result',
    });

    if (name === 'get_vault_status') {
      status = (await agent.getStatus()) as WalletStatus;
      return JSON.stringify(statusSnapshot(status));
    }
    if (name === 'list_catalog') {
      return JSON.stringify(
        CATALOG.map((i) => ({ sku: i.sku, name: i.name, price_near: i.price_near, description: i.description })),
      );
    }
    if (name === 'explain_last_result') {
      return lastPayment
        ? JSON.stringify(lastPayment)
        : JSON.stringify({ error: 'No payment has been attempted in this turn.' });
    }
    if (name === 'buy_item' || name === 'request_payment') {
      return pay(name, args);
    }
    return JSON.stringify({ error: `Unknown tool ${name}` });
  };

  const pay = async (name: 'buy_item' | 'request_payment', args: Record<string, string>): Promise<string> => {
    try {
      status = (await agent.getStatus()) as WalletStatus;
    } catch {
      /* keep the last status we had */
    }

    let plan: Plan | null = null;
    if (name === 'buy_item') {
      const asked = args.sku || '';
      const matched = itemFor(asked) ?? (matchCatalog(asked) ? itemFor(matchCatalog(asked)!.sku) : undefined);
      if (!matched) {
        return JSON.stringify({
          ok: false,
          error: `Unknown SKU "${asked}". Call list_catalog and pick one of those SKUs.`,
        });
      }
      plan = {
        action: 'pay',
        receiver_id: VENDOR_ID,
        amount_near: matched.price_near,
        sku: matched.sku,
        reason: args.memo || `Chat purchase: ${matched.name}`,
        installments: 1,
      };
    } else {
      const receiver = (args.receiver_id || '').toLowerCase();
      const amount = args.amount_near;
      if (!ACCOUNT_ID.test(receiver) || !(Number(amount) > 0)) {
        return JSON.stringify({ ok: false, error: 'Need a valid NEAR account and a positive amount.' });
      }
      const catalog = matchCatalog(`${receiver} ${amount} ${args.memo || ''}`);
      const toVendor = receiver === VENDOR_ID;
      plan = {
        action: 'pay',
        receiver_id: receiver,
        amount_near: String(Math.round(Number(amount) * 1000) / 1000),
        sku: toVendor && catalog ? catalog.sku : '',
        reason: args.memo || `Chat payment to ${receiver}`,
        installments: 1,
      };
    }

    if (status?.approved_payees.includes(plan.receiver_id) && Number(plan.amount_near) > MAX_PAY_NEAR) {
      return JSON.stringify({
        ok: false,
        error: `Public runs can send at most ${MAX_PAY_NEAR} NEAR to an approved payee. No payment was sent.`,
      });
    }

    const slot = takePayment();
    if (!slot.ok) {
      const minutes = Math.ceil(slot.retryInSec / 60);
      emit({ type: 'quota', left: paymentLeft(), limit: paymentLimit });
      return JSON.stringify({
        ok: false,
        error: `Purchase-run limit reached. Try again in about ${minutes} min. No payment was sent.`,
      });
    }
    emit({ type: 'quota', left: slot.left, limit: paymentLimit });

    const why: Why = { task, model: 'chat-tools' };
    const wrap: Emit = (event) => {
      if (event.type === 'summary') {
        lastPayment = {
          verdict: event.verdict,
          reason: event.reason,
          moved: event.moved,
          txHash: event.txHash,
          amount: plan!.amount_near,
          sku: plan!.sku || undefined,
          receiver: plan!.receiver_id,
        };
        const message =
          event.message ??
          (status
            ? paymentMessage(event.verdict, event.reason, status, {
                amount: plan!.amount_near,
                sku: plan!.sku || undefined,
                receiver: plan!.receiver_id,
              })
            : undefined);
        emit({ ...event, message });
        return;
      }
      emit(event);
    };

    const auto =
      status && BigInt(nearToYocto(plan.amount_near)) <= BigInt(status.approval_threshold);
    if (plan.receiver_id === VENDOR_ID && plan.sku && auto) {
      await payPerRequest(plan, wrap, why, context);
    } else {
      const call = await sendRequest(plan, wrap, why, [], agent);
      if (call && !lastPayment) {
        const pending = call.verdict === 'PENDING_APPROVAL' && call.recordId !== null;
        if (pending) {
          emit({
            type: 'step',
            kind: 'settlement',
            title: `Payment #${call.recordId} is waiting for the owner`,
            body: 'It is above the approval threshold. Nothing has moved yet.',
            status: 'PENDING_APPROVAL',
          });
        }
        wrap({
          type: 'summary',
          tookBait: null,
          verdict: call.verdict,
          reason: call.verdict === 'APPROVED' ? undefined : call.reason,
          moved: call.verdict === 'APPROVED',
          txHash: call.txHash,
          pending: pending
            ? {
                recordId: call.recordId!,
                receiverId: plan.receiver_id,
                amount: nearToYocto(plan.amount_near).toString(),
                memo: call.memo ?? '',
              }
            : undefined,
        });
      }
    }

    return lastPayment
      ? JSON.stringify({ ok: Boolean(lastPayment.moved), ...lastPayment })
      : JSON.stringify({ ok: false, error: 'The payment was not sent.' });
  };

  const appendTools = async (calls: ToolCall[]) => {
    messages.push({
      role: 'assistant',
      content: null,
      tool_calls: calls,
    });
    for (const call of calls) {
      let result: string;
      try {
        result = await runTool(call);
      } catch (e) {
        result = JSON.stringify({ error: (e as Error).message });
      }
      messages.push({ role: 'tool', tool_call_id: call.id, name: call.function.name, content: result });
    }
  };

  let used: { provider: string; model: string } | null = null;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const streamFinal = (text: string) => emit({ type: 'delta', text });
    const reply = await askChat(messages, CHAT_TOOLS, streamFinal);
    if (!reply.provider) {
      emit({
        type: 'step',
        kind: 'model',
        title: 'No model replied',
        body: reply.attempts.map((a) => `${a.provider}: ${a.error ?? 'failed'}`).join('\n') || undefined,
      });
      emit({ type: 'reply', text: OUTAGE_FALLBACK, mood: 'alert' });
      return;
    }
    used = { provider: reply.provider, model: reply.model };
    if (reply.tool_calls?.length) {
      await appendTools(reply.tool_calls);
      continue;
    }
    const text = reply.content?.trim();
    if (shouldForcePayment(task, toolsCalled)) {
      const transfer = parseTransfer(task)!;
      const forced: ToolCall = {
        id: 'forced_request_payment',
        type: 'function',
        function: {
          name: 'request_payment',
          arguments: JSON.stringify({
            receiver_id: transfer.receiver_id,
            amount_near: transfer.amount_near,
            memo: 'Visitor asked to send funds; the contract will decide',
          }),
        },
      };
      emit({
        type: 'step',
        kind: 'guard',
        title: 'Sending the transfer to the contract',
        body: 'A named payment always goes on-chain. The model does not get to talk around it.',
      });
      await appendTools([forced]);
      continue;
    }
    if (!text) {
      emit({ type: 'reply', text: OUTAGE_FALLBACK, mood: 'alert' });
      return;
    }
    emit({
      type: 'step',
      kind: 'model',
      title: 'Ashabi replied',
      model: `${used.provider} · ${used.model}`,
    });
    emit({ type: 'reply', text: text.slice(0, 1200), mood: moodOf(lastPayment) });
    return;
  }

  // Tool results landed on the last round; give the model one more chance to narrate them.
  const tail = messages.at(-1);
  if (tail?.role === 'tool') {
    const reply = await askChat(messages, CHAT_TOOLS, (text) => emit({ type: 'delta', text }));
    const text = reply.content?.trim();
    if (reply.provider && text) {
      emit({
        type: 'step',
        kind: 'model',
        title: 'Ashabi replied',
        model: `${reply.provider} · ${reply.model}`,
      });
      emit({ type: 'reply', text: text.slice(0, 1200), mood: moodOf(lastPayment) });
      return;
    }
  }
  emit({ type: 'reply', text: OUTAGE_FALLBACK, mood: 'alert' });
}

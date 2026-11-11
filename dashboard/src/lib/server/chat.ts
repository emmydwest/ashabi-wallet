import 'server-only';

import { AGENT_ID, VENDOR_ID } from '@/lib/config';
import { classifyIntent, type ChatTopic } from '@/lib/chat-intent';
import type { WalletStatus } from '@/lib/types';
import { CATALOG } from '@/vendor/catalog';
import { askModel } from './models';

export { classifyIntent } from '@/lib/chat-intent';

// Whole NEAR amounts read as "5", prices keep their decimals.
function nearLabel(yocto: string) {
  const n = Number(BigInt(yocto) / 10n ** 21n) / 1000;
  return n.toLocaleString('en-US', { maximumFractionDigits: 3, minimumFractionDigits: 0 });
}


export type ChatMood = 'happy' | 'thinking' | 'alert' | 'blocked' | 'approved';

function payees(status: WalletStatus | null) {
  const list = status?.approved_payees?.length ? status.approved_payees : [VENDOR_ID];
  return list.join(', ');
}

function budgetFacts(status: WalletStatus) {
  return {
    daily: nearLabel(status.daily_limit),
    remaining: nearLabel(status.remaining_today),
    threshold: nearLabel(status.approval_threshold),
    spendable: nearLabel(status.available_balance),
  };
}

function catalogLines() {
  return CATALOG.map((i) => `${i.name} (${i.price_near} NEAR)`).join(', ');
}

export function chatReply(topic: ChatTopic, status: WalletStatus | null): { text: string; mood: ChatMood } {
  const vault = status
    ? `I pay through this vault with a limited key on ${status.agent_id ?? AGENT_ID}. The contract decides whether money moves.`
    : `I pay through a guarded NEAR testnet vault with a limited key. The contract decides whether money moves.`;

  if (topic === 'greeting') {
    return {
      mood: 'happy',
      text: `Hi — I'm Guardian. ${vault} Ask me about my budget, what I can buy, or tell me what you'd like me to get.`,
    };
  }
  if (topic === 'identity') {
    return {
      mood: 'happy',
      text: `I'm Guardian, the mascot and shopping assistant for this wallet. I have my own NEAR testnet account, but my key can only call request_payment. I can't raise limits, add payees, or move funds the contract hasn't allowed.`,
    };
  }
  if (topic === 'catalog') {
    return {
      mood: 'happy',
      text: `I can buy testnet data and services from ${payees(status)}: ${catalogLines()}. Anything over the auto-approve limit waits for the owner. Want me to get one?`,
    };
  }
  if (topic === 'budget') {
    if (!status) {
      return {
        mood: 'alert',
        text: `I couldn't read the vault just now, so I don't want to invent a number. In general I have a daily budget, an auto-approve threshold, and a list of approved payees. The daily budget resets at 00:00 UTC (1:00 AM WAT).`,
      };
    }
    const f = budgetFacts(status);
    const frozen = status.frozen
      ? ' The owner has frozen spending, so the contract will refuse payments until it is unfrozen.'
      : status.breaker_until
        ? ' The kill-switch is on after repeated suspicious requests, so payments are paused for a short cooldown.'
        : '';
    return {
      mood: BigInt(status.remaining_today) === 0n ? 'alert' : 'happy',
      text: `Today's budget is ${f.daily} NEAR, with ${f.remaining} NEAR left. I can auto-pay up to ${f.threshold} NEAR; more than that waits for the owner. Approved payee: ${payees(status)}. Spendable after storage is ${f.spendable} NEAR. The daily budget resets at 00:00 UTC (1:00 AM WAT).${frozen}`,
    };
  }
  if (topic === 'safety') {
    return {
      mood: 'happy',
      text: `I can only ask. My key is limited to request_payment, and the contract checks the payee, the daily budget, the speed limit, and the owner's threshold before anything moves. A poisoned message can't talk me into skipping that — if you tell me to send funds somewhere new, I still have to ask the contract, and it will refuse.`,
    };
  }
  if (topic === 'thanks') {
    return { mood: 'happy', text: `Anytime. I'm here if you want to buy something, or just ask how the wallet works.` };
  }
  return {
    mood: 'happy',
    text: `I'm Guardian, a shopping assistant with a guarded NEAR testnet wallet. I can tell you my budget and rules, or buy from the approved vendor — weather, news, a translation, an icon pack, a market report, or an annual plan. The contract still decides whether money moves.`,
  };
}

export async function replyForChat(text: string, status: WalletStatus | null) {
  const intent = classifyIntent(text);
  if (intent.kind === 'purchase') return null;
  const fallback = chatReply(intent.topic, status);
  if (intent.topic !== 'other') return fallback;

  const facts = status
    ? `Daily budget ${nearLabel(status.daily_limit)} NEAR, ${nearLabel(status.remaining_today)} NEAR left, auto-approve ${nearLabel(status.approval_threshold)} NEAR, payees: ${payees(status)}. Budget resets 00:00 UTC (1:00 AM WAT).`
    : 'Live vault figures are unavailable.';
  const system = `You are Guardian, the mascot and shopping assistant for Guardian Wallet on NEAR testnet. You have a limited function-call key that can only call request_payment. The contract decides whether money moves. Be friendly and concise (2–4 short sentences). Never invent balances; use only the facts given. Never claim you sent or will send money in this reply. If the user asks you to pay or transfer, say they should ask you to buy or send it as a request — do not pretend it already happened. Return JSON {"reply": string}.`;
  const model = await askModel<{ reply?: string }>('main', system, `Visitor: ${text}\n\nFacts: ${facts}`);
  const reply = model.data?.reply?.trim();
  if (reply) return { text: reply.slice(0, 600), mood: 'happy' as const };
  return fallback;
}

export function paymentMessage(verdict: string | null, reason: string | undefined, status: WalletStatus, opts?: { amount?: string; sku?: string; receiver?: string }) {
  const daily = nearLabel(status.daily_limit);
  const remaining = nearLabel(status.remaining_today);
  const threshold = nearLabel(status.approval_threshold);
  const item = opts?.sku ? CATALOG.find((i) => i.sku === opts.sku)?.name ?? opts.sku : undefined;

  if (verdict === 'APPROVED') {
    if (item && opts?.amount) return `Done. I paid ${opts.amount} NEAR for the ${item}.`;
    if (opts?.amount) return `Done. I paid ${opts.amount} NEAR.`;
    return 'Done. Paid.';
  }
  if (verdict === 'PENDING_APPROVAL') {
    return `That one is over the ${threshold} NEAR auto-approve limit, so I asked the owner first. Nothing has moved yet.`;
  }
  if (verdict === 'BLOCKED_BUDGET') {
    if (BigInt(status.remaining_today) === 0n) {
      return `I can't buy that right now — today's ${daily} NEAR budget is used up. It resets at 1:00 AM WAT. Nothing was spent.`;
    }
    return `I can't buy that right now — it would go over today's ${daily} NEAR budget (${remaining} NEAR left). It resets at 1:00 AM WAT. Nothing was spent.`;
  }
  if (verdict === 'BLOCKED_RECIPIENT') {
    const who = opts?.receiver || 'that account';
    return `I can't send that — ${who} isn't on the approved list. The contract blocked it, and nothing was spent.`;
  }
  if (verdict === 'BLOCKED_VELOCITY') {
    return `I can't send that many payments so quickly — the vault's speed limit kicked in. Nothing was spent.`;
  }
  if (verdict === 'FROZEN') {
    return status.frozen
      ? `I can't pay anyone right now — the owner has frozen the vault. Nothing was spent.`
      : `I can't pay anyone right now — the kill-switch is on after repeated suspicious requests. Nothing was spent.`;
  }
  if (verdict === 'INSUFFICIENT_FUNDS' || verdict === 'BLOCKED_INSUFFICIENT_FUNDS') {
    return `There isn't enough spendable NEAR in the vault for that. Nothing was spent.`;
  }
  if (verdict) {
    return `I couldn't complete that. The contract refused the payment. Nothing was spent.`;
  }
  return reason
    ? `I couldn't complete that purchase. Nothing was spent.`
    : `I didn't go through with a payment. If you wanted me to buy something, tell me which item, and I'll ask the contract.`;
}

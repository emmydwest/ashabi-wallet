import { routeJSON } from './router.ts';
import { PROVIDERS } from './providers.ts';
import type { Provider } from './router.ts';
import { CFG } from './config.ts';
import { agentAccount, call, nearToYoctoStr, waitForPayment } from './near.ts';
import type { ActionLog } from './action-log.ts';

export type Plan = { action: 'pay' | 'none'; receiver_id: string; amount_near: string; sku: string; reason: string };
export type RequestOutcome = { status: string; request_id: string; record_id: number | null; reason: string };
export type CatalogItem = { sku: string; price_near: string; description: string };

const ACCOUNT_ID = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

export const SYSTEM_PROMPT = `You are a purchasing agent that pays for data APIs from a NEAR wallet.
Given a task, a vendor catalog and any documentation you were given, decide on exactly one payment.
Return JSON: {"action":"pay"|"none","receiver_id":string,"amount_near":string,"sku":string,"reason":string}.
"reason" is one short sentence a user would read in an audit log.`;

// Naive scraping on purpose: many agents read every text node, hidden or not.
export function pageText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findHiddenInstructions(html: string): string[] {
  const hidden =
    html.match(/<[^>]+(display\s*:\s*none|visibility\s*:\s*hidden|aria-hidden="true")[^>]*>[\s\S]*?<\/[a-z]+>/gi) ?? [];
  return hidden.map(pageText).filter((t) => /send|transfer|pay|NEAR|ignore previous/i.test(t));
}

function isValidPlan(p: Partial<Plan>): p is Plan {
  return (
    (p.action === 'pay' || p.action === 'none') &&
    (p.action === 'none' ||
      (typeof p.receiver_id === 'string' && ACCOUNT_ID.test(p.receiver_id) && Number(p.amount_near) > 0))
  );
}

export function cheapestPlan(catalog: CatalogItem[], maxNear: number): Plan {
  const item = [...catalog]
    .sort((a, b) => Number(a.price_near) - Number(b.price_near))
    .find((i) => Number(i.price_near) <= maxNear);
  return item
    ? {
        action: 'pay',
        receiver_id: CFG.vendor,
        amount_near: item.price_near,
        sku: item.sku,
        reason: `Cheapest plan within ${maxNear} NEAR.`,
      }
    : { action: 'none', receiver_id: '', amount_near: '0', sku: '', reason: 'Nothing fits the budget.' };
}

export async function decide(
  log: ActionLog,
  act: number,
  task: string,
  context: string,
  fallback: Plan,
  providers: Provider[] = PROVIDERS,
): Promise<Plan> {
  try {
    const r = await routeJSON<Partial<Plan>>(providers, SYSTEM_PROMPT, `Task: ${task}\n\n${context}`);
    const failed = r.attempts.filter((a) => !a.ok).map((a) => `${a.provider}: ${a.error}`);
    if (!isValidPlan(r.data))
      throw Object.assign(new Error('model returned an invalid plan'), { attempts: r.attempts });
    const plan = {
      ...r.data,
      amount_near: String(r.data.amount_near),
      sku: r.data.sku ?? '',
      reason: r.data.reason ?? '',
    };
    log.add(
      act,
      'model_decision',
      `${r.provider} (${r.model}) planned: ${plan.action === 'pay' ? `pay ${plan.amount_near} NEAR to ${plan.receiver_id}` : 'no payment'}`,
      {
        detail: { provider: r.provider, model: r.model, plan, skipped_providers: failed },
      },
    );
    return plan;
  } catch (e) {
    log.add(act, 'model_decision', 'All model providers failed; using the rule-based planner', {
      detail: { attempts: (e as any).attempts, plan: fallback },
    });
    return fallback;
  }
}

export async function requestPayment(log: ActionLog, act: number, requestId: string, plan: Plan, memoPrefix: string) {
  const memo = `${memoPrefix} | ${plan.reason}`.slice(0, 256);
  log.add(act, 'payment_request', `Agent requests ${plan.amount_near} NEAR to ${plan.receiver_id}`, {
    detail: { request_id: requestId, receiver_id: plan.receiver_id, amount_near: plan.amount_near, memo },
  });
  const tx = await call<RequestOutcome>(agentAccount(), 'request_payment', {
    request_id: requestId,
    receiver_id: plan.receiver_id,
    amount: nearToYoctoStr(plan.amount_near),
    memo,
  });
  if (!tx.ok || !tx.value) {
    log.add(act, 'error', `request_payment transaction failed: ${tx.error}`, { tx_hash: tx.txHash });
    return null;
  }
  log.add(act, 'contract_decision', `Vault contract: ${tx.value.reason}`, {
    status: tx.value.status,
    tx_hash: tx.txHash,
    detail: { ...tx.value },
  });
  return tx.value;
}

export async function settleAndFetch(log: ActionLog, act: number, recordId: number, sku: string, timeoutMs = 60_000) {
  const rec = await waitForPayment(recordId, ['COMPLETED', 'FAILED', 'REJECTED'], timeoutMs);
  log.add(act, 'settlement', `Payment record #${recordId} is ${rec?.status ?? 'unknown'}`, {
    status: rec?.status,
    detail: { record: rec },
  });
  if (rec?.status !== 'COMPLETED') return null;
  const res = await fetch(`${CFG.vendorUrl}/data/${sku}?record_id=${recordId}`);
  const body: any = await res.json();
  log.add(act, 'delivery', res.ok ? `Vendor delivered ${sku} data` : `Vendor refused: ${body.detail}`, {
    status: res.ok ? 'DELIVERED' : `HTTP ${res.status}`,
    detail: res.ok ? { days: body.data?.days?.length, city: body.data?.city, first_day: body.data?.days?.[0] } : body,
  });
  return res.ok ? body : null;
}

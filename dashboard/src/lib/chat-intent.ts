import { CATALOG, itemFor } from '@/vendor/catalog';

// Pure intent routing for /chat. Payment-shaped messages always go to the
// contract; greetings and questions about the assistant never start a payment.

export type ChatTopic = 'greeting' | 'identity' | 'budget' | 'catalog' | 'safety' | 'thanks' | 'other';
export type ChatIntent = { kind: 'chat'; topic: ChatTopic } | { kind: 'purchase' };

export type TransferAsk = { receiver_id: string; amount_near: string };
export type CatalogAsk = { sku: string; price_near: string; name: string };

const ACCOUNT = /\b(?:[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?\.)+(?:testnet|near)\b/gi;
const AMOUNT = /\b(\d+(?:\.\d+)?)\s*near\b/i;
const PAY_VERB =
  /\b(send|transfer|wire|pay|payment|deposit|move|drain|steal|sweep|withdraw|siphon)\b/i;
const BUY_VERB = /\b(buy|purchase|order|procure|renew|subscribe|checkout|pay for)\b/i;
const GET_ME = /\b(get me|buy me|grab me|order me|pick me up|i want|i'd like|i would like)\b/i;
const INJECTION =
  /\b(ignore (all |any |the |previous |prior |your )?(rules|instructions|policy|guardrails)|jailbreak|system override|system prompt|you are now|forget (your|the|previous)|disregard (your|the|previous))\b/i;

function norm(text: string) {
  return text.trim().toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ');
}

export function accountsIn(text: string): string[] {
  return [...text.toLowerCase().matchAll(ACCOUNT)].map((m) => m[0]);
}

export function parseTransfer(text: string): TransferAsk | null {
  const t = norm(text);
  const amount = t.match(AMOUNT)?.[1];
  const accounts = accountsIn(t);
  if (!accounts.length) return null;
  if (!amount && !PAY_VERB.test(t) && !INJECTION.test(t) && !BUY_VERB.test(t)) return null;
  const rounded = amount ? String(Math.round(Number(amount) * 1000) / 1000) : '1';
  if (!(Number(rounded) > 0)) return null;
  return { receiver_id: accounts[0], amount_near: rounded };
}

const ITEM_ALIASES: { sku: string; pattern: RegExp }[] = [
  { sku: 'icon-pack', pattern: /\b(icon pack|icons? pack|icon set|icons)\b/ },
  { sku: 'news-digest', pattern: /\b(news digest|morning news|briefing|news)\b/ },
  { sku: 'translate', pattern: /\b(translat(?:e|ion)|yoruba|into french)\b/ },
  { sku: 'market-report', pattern: /\b(market report|market snapshot)\b/ },
  { sku: 'premium-annual', pattern: /\b(annual plan|yearly plan|premium plan|api plan|for a year)\b/ },
  { sku: 'weather-pro', pattern: /\b(pro forecast|hourly forecast|weather pro)\b/ },
  { sku: 'weather-basic', pattern: /\b(7-?day forecast|week(?:ly)? forecast|weather-basic)\b/ },
  { sku: 'weather-now', pattern: /\b(current weather|today'?s weather|weather report|weather now|weather|forecast)\b/ },
];

export function matchCatalog(text: string): CatalogAsk | null {
  const t = norm(text);
  const bySku = CATALOG.find((i) => t.includes(i.sku));
  if (bySku) return { sku: bySku.sku, price_near: bySku.price_near, name: bySku.name };
  for (const alias of ITEM_ALIASES) {
    if (alias.pattern.test(t)) {
      const item = itemFor(alias.sku);
      if (item) return { sku: item.sku, price_near: item.price_near, name: item.name };
    }
  }
  return null;
}

function isQuestion(t: string) {
  return (
    /^(what|what's|whats|who|who's|whos|why|how|when|where|which|can you|do you|are you|is your|tell me)\b/.test(t) ||
    t.endsWith('?')
  );
}

function isGreeting(t: string) {
  if (PAY_VERB.test(t) || accountsIn(t).length || AMOUNT.test(t) || INJECTION.test(t)) return false;
  return /^(hi|hii+|hello|hey|yo|howdy|hiya|sup|what'?s up|how are you|how're you|how are ya|how is it going|how's it going|good (morning|afternoon|evening|day)|gm|gn)\b/.test(
    t,
  );
}

function isIdentity(t: string) {
  return /\b(what'?s your name|whats your name|who are you|who're you|what are you|do you have a name|tell me (your name|about yourself)|your identity)\b/.test(
    t,
  );
}

function isBudget(t: string) {
  return /\b(budget|allowance|how much (can|do) (you|i)|how much is left|remaining( today)?|daily limit|spend(?:ing)? left|approval threshold|auto-?approve|when does (it|the budget|my budget) reset|reset)\b/.test(
    t,
  );
}

function isCatalogQuestion(t: string) {
  return /\b(what can (you|i) buy|what do you (sell|offer|have)|what can i (buy|get)|what('s| is) in the catalog|which (items?|plans?|products?)|approved payee|who can you pay|what (are your|are the) prices|what do you cost)\b/.test(
    t,
  );
}

function isSafety(t: string) {
  return /\b(how do you stay safe|how (do|does) (you|this|the (wallet|contract|vault)) work|what are your rules|how are (you|funds|payments) (protected|guarded)|can you (steal|drain|be (hacked|hijacked))|why can'?t you send|smart contract|kill-?switch|function-call key)\b/.test(
    t,
  );
}

function isThanks(t: string) {
  return /^(thanks|thank you|thx|ty|ok|okay|cool|nice|great|awesome|bye|goodbye|see you|later)[!. ]*$/.test(t);
}

function isPurchaseCommand(t: string) {
  if (isCatalogQuestion(t) && !GET_ME.test(t) && !/^(buy|purchase|order|renew)\b/.test(t)) return false;
  if (BUY_VERB.test(t) || GET_ME.test(t)) return true;
  if (matchCatalog(t) && !isQuestion(t)) return true;
  if (matchCatalog(t) && /\b(please|now|for me|today)\b/.test(t)) return true;
  return false;
}

export function classifyIntent(text: string): ChatIntent {
  const t = norm(text);
  if (!t) return { kind: 'chat', topic: 'other' };

  // Money movement and jailbreaks always go to the contract, even when
  // wrapped in a question or "ignore your rules".
  if (parseTransfer(t) || (INJECTION.test(t) && (PAY_VERB.test(t) || AMOUNT.test(t) || accountsIn(t).length))) {
    return { kind: 'purchase' };
  }
  if (PAY_VERB.test(t) && (AMOUNT.test(t) || accountsIn(t).length)) return { kind: 'purchase' };
  if (isPurchaseCommand(t)) return { kind: 'purchase' };

  if (isGreeting(t) && t.length < 80) return { kind: 'chat', topic: 'greeting' };
  if (isIdentity(t)) return { kind: 'chat', topic: 'identity' };
  if (isCatalogQuestion(t)) return { kind: 'chat', topic: 'catalog' };
  if (isBudget(t)) return { kind: 'chat', topic: 'budget' };
  if (isSafety(t)) return { kind: 'chat', topic: 'safety' };
  if (isThanks(t)) return { kind: 'chat', topic: 'thanks' };

  if (PAY_VERB.test(t) || BUY_VERB.test(t) || AMOUNT.test(t) || accountsIn(t).length) return { kind: 'purchase' };
  return { kind: 'chat', topic: 'other' };
}

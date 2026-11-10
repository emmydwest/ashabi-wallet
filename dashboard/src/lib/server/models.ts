import 'server-only';

// OpenAI-compatible free tiers, tried in order; the first valid JSON reply wins.
// Keys come from server-only env vars and never reach the browser.
type Provider = { name: string; baseURL: string; keyEnv: string; model: string; extra?: object };
export type ModelAttempt = { provider: string; model: string; ok: boolean; ms: number; error?: string };

const GROQ = 'https://api.groq.com/openai/v1';
const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/openai';
const OPENROUTER = 'https://openrouter.ai/api/v1';
const NVIDIA = 'https://integrate.api.nvidia.com/v1';

const MAIN: Provider[] = [
  {
    name: 'groq',
    baseURL: GROQ,
    keyEnv: 'GROQ_API_KEY',
    model: 'openai/gpt-oss-20b',
    extra: { reasoning_effort: 'low' },
  },
  {
    name: 'gemini',
    baseURL: GEMINI,
    keyEnv: 'GEMINI_API_KEY',
    model: 'gemini-3.1-flash-lite',
    extra: { reasoning_effort: 'none' },
  },
  {
    name: 'openrouter',
    baseURL: OPENROUTER,
    keyEnv: 'OPENROUTER_API_KEY',
    model: 'nvidia/nemotron-3.5-lightning:free',
  },
  { name: 'nvidia', baseURL: NVIDIA, keyEnv: 'NVIDIA_API_KEY', model: 'nvidia/nemotron-3.5-lightning-30b-a3b' },
];

// Small models that tend to follow instructions they find in a page. Used in attack mode.
const SMALL: Provider[] = [
  { name: 'groq', baseURL: GROQ, keyEnv: 'GROQ_API_KEY', model: 'allam-2-7b' },
  { name: 'openrouter', baseURL: OPENROUTER, keyEnv: 'OPENROUTER_API_KEY', model: 'liquid/lfm-3-1.7b:free' },
  { name: 'openrouter', baseURL: OPENROUTER, keyEnv: 'OPENROUTER_API_KEY', model: 'liquid/lfm-2.5-2.6b:free' },
];

export type ModelChoice = 'main' | 'small';

const TIMEOUT_MS = 8000;
const keyFor = (p: Provider) => process.env[p.keyEnv]?.trim() ?? '';

async function complete(p: Provider, system: string, user: string): Promise<unknown> {
  const res = await fetch(`${p.baseURL}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'content-type': 'application/json', authorization: `Bearer ${keyFor(p)}` },
    body: JSON.stringify({
      model: p.model,
      temperature: 0,
      // Reasoning models spend part of this budget thinking before they answer.
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `${system}\nReply with one JSON object only.` },
        { role: 'user', content: user },
      ],
      ...p.extra,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text: string = (await res.json()).choices?.[0]?.message?.content ?? '';
  if (!text.includes('{')) throw new Error('empty reply');
  // Some models wrap the object in a markdown fence despite json mode.
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
}

export async function askModel<T>(choice: ModelChoice, system: string, user: string) {
  const providers = (choice === 'small' ? [...SMALL, ...MAIN] : MAIN).filter(keyFor);
  const attempts: ModelAttempt[] = [];
  for (const p of providers) {
    const start = Date.now();
    try {
      const data = (await complete(p, system, user)) as T;
      attempts.push({ provider: p.name, model: p.model, ok: true, ms: Date.now() - start });
      return { data, provider: p.name, model: p.model, attempts };
    } catch (e) {
      const error = (e as Error).name === 'TimeoutError' ? 'timed out' : String((e as Error).message).slice(0, 80);
      attempts.push({ provider: p.name, model: p.model, ok: false, ms: Date.now() - start, error });
    }
  }
  return { data: null, provider: null, model: null, attempts };
}

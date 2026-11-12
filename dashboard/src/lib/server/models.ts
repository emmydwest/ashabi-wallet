import 'server-only';

// OpenAI-compatible free tiers, tried in order. Keys are server-only env vars
// and never reach the browser.
type Provider = { name: string; baseURL: string; keyEnv: string; model: string; extra?: object };
export type ModelAttempt = { provider: string; model: string; ok: boolean; ms: number; error?: string };

const GROQ = 'https://api.groq.com/openai/v1';
const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/openai';
const OPENROUTER = 'https://openrouter.ai/api/v1';
const NVIDIA = 'https://integrate.api.nvidia.com/v1';
const GITHUB = 'https://models.github.ai/inference';

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

// Tried after NVIDIA for /chat tool-calling. Some networks get a plain "OK" stub
// instead of a completion; that attempt is skipped.
const GITHUB_MODELS: Provider = {
  name: 'github-models',
  baseURL: GITHUB,
  keyEnv: 'GITHUB_MODELS_TOKEN',
  model: 'openai/gpt-4o-mini',
};

// For the naive agent in attack mode: light models that tend to do what a page tells them.
const SMALL: Provider[] = [
  MAIN[1],
  { name: 'groq', baseURL: GROQ, keyEnv: 'GROQ_API_KEY', model: 'allam-2-7b' },
  { name: 'openrouter', baseURL: OPENROUTER, keyEnv: 'OPENROUTER_API_KEY', model: 'liquid/lfm-3-1.7b:free' },
  { name: 'openrouter', baseURL: OPENROUTER, keyEnv: 'OPENROUTER_API_KEY', model: 'liquid/lfm-2.5-2.6b:free' },
];

export type ModelChoice = 'main' | 'small';

const JSON_TIMEOUT_MS = 8000;
const CHAT_TIMEOUT_MS = 25_000;
const keyFor = (p: Provider) => process.env[p.keyEnv]?.trim() ?? '';

function headers(p: Provider) {
  const h: Record<string, string> = {
    'content-type': 'application/json',
    authorization: `Bearer ${keyFor(p)}`,
  };
  if (p.name === 'openrouter') {
    h['HTTP-Referer'] = 'https://guardian-wallet.vercel.app';
    h['X-Title'] = 'Guardian Wallet';
  }
  return h;
}

async function complete(p: Provider, system: string, user: string): Promise<unknown> {
  const res = await fetch(`${p.baseURL}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(JSON_TIMEOUT_MS),
    headers: headers(p),
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

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export type ToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

export type ChatMessage = {
  role: ChatRole;
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
};

export type ToolDef = {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export type AssistantTurn = {
  role: 'assistant';
  content: string | null;
  tool_calls?: ToolCall[];
  provider: string;
  model: string;
};

function asToolCalls(raw: unknown): ToolCall[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const calls: ToolCall[] = [];
  for (const [i, item] of raw.entries()) {
    const fn = (item as { function?: { name?: string; arguments?: string }; id?: string })?.function;
    if (!fn?.name) continue;
    calls.push({
      id: String((item as { id?: string }).id || `call_${i}`),
      type: 'function',
      function: { name: fn.name, arguments: typeof fn.arguments === 'string' ? fn.arguments : JSON.stringify(fn.arguments ?? {}) },
    });
  }
  return calls.length ? calls : undefined;
}

function mergeToolDeltas(target: Array<Partial<ToolCall> & { function?: { name?: string; arguments?: string } }>, parts: unknown) {
  if (!Array.isArray(parts)) return;
  for (const part of parts) {
    const p = part as { index?: number; id?: string; function?: { name?: string; arguments?: string } };
    const i = typeof p.index === 'number' ? p.index : target.length;
    const slot = (target[i] ??= { function: { name: '', arguments: '' } });
    if (p.id) slot.id = p.id;
    const name = (slot.function?.name ?? '') + (p.function?.name ?? '');
    const args = (slot.function?.arguments ?? '') + (p.function?.arguments ?? '');
    slot.function = { name, arguments: args };
  }
}

async function readSse(
  res: Response,
  onDelta?: (text: string) => void,
): Promise<{ content: string | null; tool_calls?: ToolCall[] }> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error('empty stream');
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  const rawCalls: Array<Partial<ToolCall> & { function?: { name?: string; arguments?: string } }> = [];
  let sawTools = false;

  const handle = (block: string) => {
    for (const line of block.split('\n')) {
      const data = line.startsWith('data:') ? line.slice(5).trim() : '';
      if (!data || data === '[DONE]') continue;
      let json: { choices?: Array<{ delta?: { content?: string; tool_calls?: unknown } }> };
      try {
        json = JSON.parse(data);
      } catch {
        return;
      }
      const delta = json.choices?.[0]?.delta;
      if (!delta) continue;
      if (delta.tool_calls) {
        sawTools = true;
        mergeToolDeltas(rawCalls, delta.tool_calls);
      }
      if (delta.content) {
        content += delta.content;
        if (!sawTools) onDelta?.(delta.content);
      }
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) handle(part);
  }
  if (buffer.trim()) handle(buffer);

  const tool_calls = asToolCalls(
    rawCalls.map((c, i) => ({
      id: c.id || `call_${i}`,
      type: 'function',
      function: { name: c.function?.name ?? '', arguments: c.function?.arguments ?? '{}' },
    })),
  );
  return { content: content || null, tool_calls };
}

async function completeChat(p: Provider, messages: ChatMessage[], tools: ToolDef[] | undefined, onDelta?: (text: string) => void): Promise<Omit<AssistantTurn, 'provider' | 'model'>> {
  const streamed = Boolean(onDelta);
  const res = await fetch(`${p.baseURL}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
    headers: headers(p),
    body: JSON.stringify({
      model: p.model,
      temperature: 0.7,
      max_tokens: 800,
      messages,
      ...(tools?.length ? { tools, tool_choice: 'auto' } : {}),
      ...(streamed ? { stream: true } : {}),
      ...p.extra,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ctype = res.headers.get('content-type') ?? '';
  if (streamed && (ctype.includes('text/event-stream') || ctype.includes('text/plain'))) {
    // GitHub Models has been seen returning a plain "OK" stub; reject that here.
    const preview = ctype.includes('text/plain') ? await res.clone().text() : '';
    if (preview && !preview.includes('data:') && !preview.includes('{')) throw new Error('not a chat completion');
    if (ctype.includes('text/event-stream') || preview.includes('data:')) {
      const { content, tool_calls } = await readSse(ctype.includes('text/event-stream') ? res : new Response(preview), onDelta);
      return { role: 'assistant', content, tool_calls };
    }
  }
  const raw = await res.text();
  let data: { choices?: Array<{ message?: { content?: string | null; tool_calls?: unknown } }> };
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('not a chat completion');
  }
  const message = data.choices?.[0]?.message;
  if (!message) throw new Error('empty reply');
  const content = message.content ?? null;
  const tool_calls = asToolCalls(message.tool_calls);
  if (!tool_calls && content && onDelta) onDelta(content);
  return { role: 'assistant', content, tool_calls };
}

export async function askChat(messages: ChatMessage[], tools?: ToolDef[], onDelta?: (text: string) => void) {
  const providers = [...MAIN, GITHUB_MODELS].filter(keyFor);
  const attempts: ModelAttempt[] = [];
  for (const p of providers) {
    const start = Date.now();
    try {
      const turn = await completeChat(p, messages, tools, onDelta);
      attempts.push({ provider: p.name, model: p.model, ok: true, ms: Date.now() - start });
      return { ...turn, provider: p.name, model: p.model, attempts } satisfies AssistantTurn & { attempts: ModelAttempt[] };
    } catch (e) {
      const error = (e as Error).name === 'TimeoutError' ? 'timed out' : String((e as Error).message).slice(0, 80);
      attempts.push({ provider: p.name, model: p.model, ok: false, ms: Date.now() - start, error });
    }
  }
  return { role: 'assistant' as const, content: null, provider: null, model: null, attempts };
}

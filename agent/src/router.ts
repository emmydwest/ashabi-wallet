// Tries OpenAI-compatible providers in order; the first valid JSON reply wins.
import { readFileSync, existsSync } from 'node:fs';

export type Provider = { name: string; baseURL: string; keyFile: string; model: string; extra?: object };
export type Attempt = { provider: string; model: string; ok: boolean; ms: number; error?: string };

const SECRETS = process.env.SECRETS_DIR ?? '/home/box/.secrets';
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 6000);
const key = (f: string) => (existsSync(`${SECRETS}/${f}`) ? readFileSync(`${SECRETS}/${f}`, 'utf8').trim() : '');

async function complete(p: Provider, system: string, user: string): Promise<unknown> {
  const res = await fetch(`${p.baseURL}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key(p.keyFile)}` },
    body: JSON.stringify({
      model: p.model,
      temperature: 0,
      max_tokens: 600,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `${system}\nReply with one JSON object only.` },
        { role: 'user', content: user },
      ],
      ...p.extra,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 120).replace(/\s+/g, ' ')}`);
  const text: string = (await res.json()).choices?.[0]?.message?.content ?? '';
  // Some models wrap the object in a markdown fence despite json mode.
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
}

export async function routeJSON<T>(providers: Provider[], system: string, user: string) {
  const attempts: Attempt[] = [];
  for (const p of providers.filter((p) => key(p.keyFile))) {
    const start = Date.now();
    const attempt = { provider: p.name, model: p.model };
    try {
      const data = (await complete(p, system, user)) as T;
      attempts.push({ ...attempt, ok: true, ms: Date.now() - start });
      return { data, ...attempt, attempts };
    } catch (e) {
      attempts.push({
        ...attempt,
        ok: false,
        ms: Date.now() - start,
        error: String((e as Error).message).slice(0, 160),
      });
    }
  }
  throw Object.assign(new Error('all model providers failed'), { attempts });
}

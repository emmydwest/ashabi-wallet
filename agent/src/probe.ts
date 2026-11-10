import { writeFileSync, mkdirSync } from 'node:fs';
import { routeJSON } from './router.ts';
import { PROVIDERS } from './providers.ts';

const only = process.argv.slice(2);
const rows = [];
for (const p of PROVIDERS.filter((p) => !only.length || only.includes(p.name))) {
  try {
    const r = await routeJSON<{ ok: boolean }>([p], 'You are a health check.', 'Return {"ok": true}');
    rows.push({ ...r.attempts[0], reply: r.data });
  } catch (e) {
    const a = (e as any).attempts?.[0];
    rows.push(a ?? { provider: p.name, model: p.model, ok: false, ms: 0, error: 'no key file' });
  }
  console.log(JSON.stringify(rows.at(-1)));
}
mkdirSync('../data', { recursive: true });
writeFileSync('../data/provider-probe.json', JSON.stringify({ at: new Date().toISOString(), rows }, null, 2));

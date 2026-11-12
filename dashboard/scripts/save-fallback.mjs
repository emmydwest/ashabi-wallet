// Saves the live contract state as the fallback the dashboard shows if the RPC is unreachable.
// Usage: npm run save-fallback [-- https://your-deployment.vercel.app]
import { writeFileSync } from 'node:fs';

const site = process.argv[2] ?? 'https://ashabi-wallet.vercel.app';
const res = await fetch(`${site}/api/guardian`, { cache: 'no-store' });
if (!res.ok) throw new Error(`${site} answered ${res.status}`);
const snapshot = await res.json();
if (snapshot.stale) throw new Error('the site is serving a stale snapshot; try again later');
snapshot.feed = snapshot.feed.slice(0, 25);
writeFileSync(new URL('../src/data/snapshot-fallback.json', import.meta.url), `${JSON.stringify(snapshot)}\n`);
console.log(`saved state as of ${snapshot.fetchedAt}`);

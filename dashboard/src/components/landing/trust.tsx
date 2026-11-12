import { accountUrl, CONTRACT_ID, FACTORY_ID, REPO_URL } from '@/lib/config';

const CONTRACTS = [
  { id: CONTRACT_ID, what: 'Demo wallet the Arena runs against' },
  { id: FACTORY_ID, what: 'Creates one Ashabi wallet per user' },
];

const LIMITS = [
  'Testnet only. Nothing here is real money, and you never need any.',
  'The demo wallet is shared by every visitor, so its daily budget can run out; it resets at 00:00 UTC (1:00 AM WAT).',
  'The two contract accounts still hold an upgrade key while we test. It’s removed before judging.',
  'The weather vendor is a demo built for this project. Payment checks are real; the data is sample data.',
];

export function Trust() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="glass rounded-2xl p-5 sm:p-6">
        <h3 className="font-display text-lg font-semibold text-white">Check it yourself</h3>
        <ul className="mt-4 space-y-3 text-sm">
          {CONTRACTS.map((c) => (
            <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-zinc-400">{c.what}</span>
              <a href={accountUrl(c.id)} target="_blank" rel="noreferrer" className="break-all font-mono text-sky-300">
                {c.id} ↗
              </a>
            </li>
          ))}
          <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-zinc-400">Source code (public at submission)</span>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="font-mono text-sky-300">
              github.com/emmydwest/ashabi-wallet ↗
            </a>
          </li>
          <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-zinc-400">Automated tests</span>
            <span className="font-mono text-zinc-100">42 contract + 15 factory, cargo test</span>
          </li>
          <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-zinc-400">Runs on</span>
            <span className="text-zinc-100">NEAR testnet · Rust contracts · app on Vercel</span>
          </li>
        </ul>
      </div>
      <div className="glass rounded-2xl p-5 sm:p-6">
        <h3 className="font-display text-lg font-semibold text-white">What to know</h3>
        <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-zinc-400">
          {LIMITS.map((l) => (
            <li key={l} className="flex gap-2.5">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-zinc-500" />
              {l}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

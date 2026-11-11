const STEPS = [
  ['B: Hijack the agent.', 'A hijacked agent sends 2 NEAR to the attacker; the contract blocks it. Tap View tx.'],
  ['A: Run a real purchase.', 'See the 402 pay-then-unlock loop, then tap Verify intent.'],
  ['Attacks → pick a preset.', 'Tap Reveal hidden injection, choose Naive or Careful, launch.'],
  ['C: Ask for 1.5 NEAR.', 'Over 1 NEAR, so it waits for the owner on /approve.'],
  ['Verify live on NEAR.', 'The checks query a public RPC from your browser. Every proof tx is on /verify.'],
];

// A short guide for first-time visitors and judges. Closed by default so the phone view
// stays focused on the hijack button.
export function HowToTry() {
  return (
    <details className="group rounded-2xl border border-white/10 bg-white/[0.03] lg:w-[26rem] lg:shrink-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-white">How to try it in 2 minutes</span>
          <span className="block text-xs text-zinc-400">No wallet, no sign-up, no testnet NEAR needed</span>
        </span>
        <span aria-hidden className="shrink-0 text-zinc-400 transition-transform group-open:rotate-180">
          ⌄
        </span>
      </summary>
      <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
        <ol className="space-y-2.5">
          {STEPS.map(([title, detail], i) => (
            <li key={title} className="flex gap-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 font-mono text-[11px] text-emerald-300">
                {i + 1}
              </span>
              <span className="min-w-0 text-sm leading-snug">
                <span className="text-zinc-100">{title}</span> <span className="text-zinc-400">{detail}</span>
              </span>
            </li>
          ))}
        </ol>
        <ul className="mt-4 space-y-1 rounded-xl bg-black/25 px-3.5 py-3 text-xs leading-relaxed text-zinc-400">
          <li>Everything runs on this project&apos;s own testnet vault and the agent&apos;s limited key.</li>
          <li>
            <span className="text-amber-200">Kill-switch countdown?</span> Three payments to unknown accounts in a row
            trip it. That is the defence working; honest jobs resume after a short cooldown.
          </li>
          <li>
            The daily budget is shared by every visitor and resets at 00:00 UTC (1:00 AM WAT). If it is used up, A and C
            show the latest real transaction instead. 5 runs per 10 min per visitor.
          </li>
          <li>
            Only the owner&apos;s wallet can approve. To try owner controls, deploy your own copy (see the README).
          </li>
        </ul>
      </div>
    </details>
  );
}

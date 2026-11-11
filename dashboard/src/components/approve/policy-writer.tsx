'use client';

import { useMemo, useState } from 'react';
import { reviewProposal, type PolicyProposal } from '@/lib/policy';
import type { FeedItem, WalletStatus } from '@/lib/types';
import { walletLinkFor } from './wallet-link';

type Props = {
  status: WalletStatus;
  feed: FeedItem[];
  isOwner: boolean;
  busy: string | null;
  run: (key: string, method: string, args: Record<string, unknown>, success: string) => void;
};

const EXAMPLES = [
  'Raise the daily limit to 8 NEAR and ask me for anything over 0.5 NEAR.',
  'Stop paying api-vendor.gw-emmy.testnet.',
  'If the agent tries 2 strange payments in a row, pause it for 30 minutes.',
];

// Plain English in, a reviewed diff out. Nothing is applied until the owner signs each row.
export function PolicyWriter({ status, feed, isOwner, busy, run }: Props) {
  const [text, setText] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ proposal: PolicyProposal; model: string } | null>(null);

  const blockedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of feed)
      if (item.kind === 'blocked') counts[item.attempt.receiver_id] = (counts[item.attempt.receiver_id] ?? 0) + 1;
    return counts;
  }, [feed]);

  // Re-checked here against live on-chain policy, so a signed row drops out of the diff.
  const review = draft ? reviewProposal(draft.proposal, status, blockedCounts) : null;
  const back = typeof window === 'undefined' ? '' : `${window.location.origin}/approve`;

  const submit = async () => {
    setDrafting(true);
    setError(null);
    try {
      const res = await fetch('/api/policy/draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
      setDraft({ proposal: body.proposal, model: body.model });
    } catch (e) {
      setError((e as Error).message);
      setDraft(null);
    } finally {
      setDrafting(false);
    }
  };

  return (
    <section className="glass mt-8 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-white">Policy writer</h2>
        <span className="rounded-full border border-sky-400/25 bg-sky-400/10 px-2.5 py-0.5 text-[11px] font-medium text-sky-200">
          Free model · proposes only
        </span>
      </div>
      <p className="mt-1 text-sm text-zinc-400">
        Say what you want in plain English. You get a diff against the rules on-chain, checked against hard limits, and
        you sign each change in your wallet. Nothing is applied for you.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 500))}
        rows={3}
        placeholder="e.g. Lower the daily limit to 3 NEAR"
        className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 text-base text-white outline-none placeholder:text-zinc-500 focus:border-sky-300/40"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setText(example)}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-left text-xs text-zinc-300 hover:border-sky-300/30 hover:text-white"
          >
            {example}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={drafting || !text.trim()}
        className="mt-3 w-full rounded-xl bg-sky-300 px-4 py-3 text-sm font-semibold text-black disabled:opacity-50"
      >
        {drafting ? 'Drafting the change' : 'Draft the change'}
      </button>
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

      {draft && review && (
        <div className="mt-5">
          {review.summary && <p className="text-sm text-zinc-200">“{review.summary}”</p>}
          <p className="mt-1 font-mono text-[11px] text-zinc-500">{draft.model}</p>

          {review.changes.length === 0 ? (
            <p className="mt-3 rounded-xl bg-black/25 px-3.5 py-3 text-sm text-zinc-300">
              Nothing to change: the proposal matches the rules on-chain.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {review.changes.map((change) => (
                <li key={change.key} className="rounded-xl border border-white/[0.08] bg-black/25 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-zinc-400">{change.label}</div>
                      {change.method.endsWith('_payee') && (
                        <div className="truncate font-mono text-sm text-zinc-100">{String(change.args.account_id)}</div>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-sm">
                        <span className="text-rose-300 line-through decoration-rose-300/60">{change.from}</span>
                        <span className="text-zinc-500">→</span>
                        <span className="text-emerald-300">{change.to}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!isOwner || busy !== null}
                      onClick={() =>
                        run(
                          `policy-${change.key}`,
                          change.method,
                          change.args,
                          `${change.label}: ${change.to}. Signed and applied on-chain.`,
                        )
                      }
                      className="shrink-0 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-black disabled:opacity-40"
                    >
                      {busy === `policy-${change.key}` ? 'Waiting' : 'Sign'}
                    </button>
                  </div>
                  {change.warning && (
                    <p className="mt-2 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-2.5 py-1.5 text-xs text-amber-100">
                      {change.warning}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <code className="min-w-0 break-all font-mono text-[11px] text-zinc-500">
                      {change.method}({JSON.stringify(change.args)})
                    </code>
                    {isOwner && (
                      <a
                        href={walletLinkFor(status.owner_id, change.method, change.args, back)}
                        className="text-[11px] text-sky-300"
                      >
                        MyNearWallet →
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {review.rejected.length > 0 && (
            <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.05] px-3.5 py-3">
              <div className="text-xs font-semibold text-rose-200">Dropped by the safety check</div>
              <ul className="mt-1 space-y-0.5 text-xs text-rose-100/90">
                {review.rejected.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {!isOwner && review.changes.length > 0 && (
            <p className="mt-3 text-xs text-zinc-400">Connect the owner wallet to sign these changes.</p>
          )}
        </div>
      )}
    </section>
  );
}

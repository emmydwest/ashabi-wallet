import { accountUrl, CONTRACT_ID, txUrl } from '@/lib/config';

export function ExplorerLink({ txHash, label }: { txHash?: string; label?: string }) {
  const href = txHash ? txUrl(txHash) : accountUrl(CONTRACT_ID);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs text-zinc-400 transition-colors hover:text-emerald-300"
    >
      {label ?? (txHash ? `${txHash.slice(0, 8)}…` : 'contract')}
      <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M6 3h7v7M13 3 4 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

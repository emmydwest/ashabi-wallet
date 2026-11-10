import { accountUrl, CONTRACT_ID, txUrl } from '@/lib/config';

type Props = { txHash?: string; label?: string; variant?: 'text' | 'pill' };

export function ExplorerLink({ txHash, label, variant = 'text' }: Props) {
  const href = txHash ? txUrl(txHash) : accountUrl(CONTRACT_ID);
  const text = label ?? (txHash ? `${txHash.slice(0, 8)}…` : 'contract');
  const style =
    variant === 'pill'
      ? 'rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-zinc-200 hover:border-emerald-300/40 hover:text-emerald-200'
      : 'text-zinc-300 hover:text-emerald-300';
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={txHash ? `Transaction ${txHash} on NearBlocks` : 'Contract on NearBlocks'}
      className={`inline-flex shrink-0 items-center gap-1 font-mono text-xs transition-colors ${style}`}
    >
      {text}
      <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M6 3h7v7M13 3 4 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

'use client';

import { Info } from 'lucide-react';
import Link from 'next/link';
import { CONTRACT_ID, accountUrl } from '@/lib/config';
import { useOwnedVaults } from './use-owned-vaults';

export function DemoWalletLabel({ className = '' }: { className?: string }) {
  const { primary } = useOwnedVaults();

  return (
    <div className={`flex min-w-0 max-w-full flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 ${className}`}>
      <span className="min-w-0 wrap-ids">
        Public demo wallet ·{' '}
        <a
          href={accountUrl(CONTRACT_ID)}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-emerald-300/90 hover:text-emerald-200"
        >
          {CONTRACT_ID}
        </a>
        <span className="group relative ml-1 inline-flex align-middle">
          <button
            type="button"
            aria-label="About these numbers"
            className="grid size-5 place-items-center rounded-full text-zinc-500 hover:text-zinc-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400/60"
          >
            <Info className="size-3.5" />
          </button>
          <span
            role="tooltip"
            className="pointer-events-none absolute top-full right-0 z-20 mt-1.5 hidden w-56 max-w-[min(14rem,calc(100vw-2rem))] rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-left text-xs leading-relaxed text-zinc-200 shadow-xl group-hover:block group-focus-within:block"
          >
            These numbers are live on the NEAR testnet contract, not mocked.
          </span>
        </span>
      </span>
      {primary && (
        <Link href={`/vault/${primary.vault_id}`} className="text-sky-300 hover:text-sky-200">
          View your vault
        </Link>
      )}
    </div>
  );
}

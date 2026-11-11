'use client';

import { Info } from 'lucide-react';
import Link from 'next/link';
import { CONTRACT_ID, accountUrl } from '@/lib/config';
import { useOwnedVaults } from './use-owned-vaults';

export function DemoWalletLabel({ className = '' }: { className?: string }) {
  const { primary } = useOwnedVaults();

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 ${className}`}>
      <span>
        Public demo wallet ·{' '}
        <span className="whitespace-nowrap">
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
              className="pointer-events-none invisible absolute top-full left-0 z-20 mt-1.5 w-56 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-left text-xs leading-relaxed text-zinc-200 opacity-0 shadow-xl group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
            >
              These numbers are live on the NEAR testnet contract, not mocked.
            </span>
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

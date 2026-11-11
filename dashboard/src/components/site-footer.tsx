import Link from 'next/link';
import { accountUrl, CONTRACT_ID } from '@/lib/config';
import { NearBadge, Wordmark } from './logo';

export function SiteFooter() {
  return (
    <footer className="site-footer border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 text-sm text-zinc-400 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Wordmark />
          <NearBadge label="Powered by NEAR · testnet" />
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/verify" className="hover:text-white">
            Verify
          </Link>
          <Link href="/docs" className="hover:text-white">
            Docs
          </Link>
          <Link href="/dashboard" className="hover:text-white">
            Live dashboard
          </Link>
          <Link href="/approve" className="hover:text-white">
            Demo approvals
          </Link>
          <a
            href={accountUrl(CONTRACT_ID)}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs hover:text-white"
          >
            {CONTRACT_ID} ↗
          </a>
        </nav>
      </div>
    </footer>
  );
}

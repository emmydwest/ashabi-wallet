'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './logo';

const LINKS = [
  { href: '/', label: 'Overview' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/approve', label: 'Approve' },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="hidden text-[15px] font-semibold tracking-tight text-white sm:inline">Guardian Wallet</span>
        </Link>
        <nav className="flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.03] p-1 text-sm">
          {LINKS.map((link) => {
            const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 text-[13px] transition-colors sm:px-4 sm:text-sm ${
                  active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1.5 font-mono text-xs text-emerald-300 md:flex">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          NEAR testnet
        </div>
      </div>
    </header>
  );
}

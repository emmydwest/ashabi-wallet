'use client';

import { ArrowRight, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense, useState } from 'react';
import { NearBadge, Wordmark } from './logo';

const LINKS = [
  { href: '/', label: 'Home', match: [] },
  { href: '/chat', label: 'Live Agent', match: ['/chat'] },
  { href: '/agent', label: 'Attack Demo', match: ['/agent', '/dashboard'] },
  { href: '/wallet', label: 'Wallet', match: ['/wallet', '/vault', '/start', '/approve'] },
  { href: '/docs', label: 'Docs', match: ['/docs'] },
];

function isActive(pathname: string | null, link: (typeof LINKS)[number]) {
  if (pathname === null) return false;
  return link.href === '/' ? pathname === '/' : link.match.some((m) => pathname.startsWith(m));
}

export function SiteHeader() {
  return (
    <Suspense fallback={<Header pathname={null} />}>
      <CurrentHeader />
    </Suspense>
  );
}

// The current path is request data on dynamic routes, so the highlight streams in after the links.
function CurrentHeader() {
  return <Header pathname={usePathname()} />;
}

function Header({ pathname }: { pathname: string | null }) {
  const [openOn, setOpenOn] = useState<string | null | false>(false);
  // The menu closes itself on navigation: it is only open for the path it was opened on.
  const open = openOn !== false && openOn === pathname;

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-black/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
        <Link href="/" aria-label="Guardian Wallet home" className="shrink-0">
          <Wordmark />
        </Link>

        <nav
          aria-label="Main"
          className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1 text-sm lg:flex"
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link) ? 'page' : undefined}
              className={`rounded-full px-4 py-1.5 whitespace-nowrap transition-colors ${
                isActive(pathname, link)
                  ? 'bg-emerald-400/[0.12] text-emerald-200 shadow-[inset_0_0_0_1px_rgb(61_242_166/0.25)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <NearBadge className="max-[380px]:hidden" />
          <Link
            href="/chat"
            className="btn-brand hidden items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-shadow sm:inline-flex"
          >
            Try the Agent
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => setOpenOn(open ? false : pathname)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-200 lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="animate-in border-t border-white/[0.06] bg-black px-4 pb-5 pt-2 lg:hidden"
        >
          <ul className="flex flex-col">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpenOn(false)}
                  aria-current={isActive(pathname, link) ? 'page' : undefined}
                  className={`flex items-center justify-between rounded-xl px-3 py-3.5 text-base ${
                    isActive(pathname, link) ? 'bg-emerald-400/[0.08] text-emerald-200' : 'text-zinc-200'
                  }`}
                >
                  {link.label}
                  <ArrowRight className="size-4 text-zinc-500" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-end gap-3 px-1">
            <Link
              href="/chat"
              onClick={() => setOpenOn(false)}
              className="btn-brand inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"
            >
              Try the Agent
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

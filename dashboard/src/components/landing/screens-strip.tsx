import Image from 'next/image';
import Link from 'next/link';

const SCREENS = [
  {
    src: '/screens/chat-paid.webp',
    alt: 'The assistant buying a weather report and showing the forecast it paid for',
    caption: 'Ask for something; it pays inside your rules',
    href: '/chat',
  },
  {
    src: '/screens/wallet.webp',
    alt: 'A guarded wallet page with today’s spending and the freeze button',
    caption: 'Your wallet: what’s left today, one-tap freeze',
    href: '/wallet',
  },
  {
    src: '/screens/attack-blocked.webp',
    alt: 'The attack demo showing a hijacked agent’s payment refused by the contract',
    caption: 'A hijacked agent, refused on-chain',
    href: '/agent',
  },
];

// Real captures of the current app on an iPhone, not mock-ups.
// The overflow container is a block, not the flex row, so the row can be wider than the
// viewport without stretching the page (a flex item with shrink-0 would otherwise grow it).
export function ScreensStrip() {
  return (
    <div className="-mx-5 min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain px-5 pb-2 sm:mx-0 sm:overflow-visible sm:px-0">
      <div className="flex snap-x snap-mandatory gap-4 sm:grid sm:grid-cols-3">
        {SCREENS.map((s) => (
          <Link key={s.src} href={s.href} className="group w-[72%] shrink-0 snap-center sm:w-auto">
            <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
              <Image
                src={s.src}
                alt={s.alt}
                width={600}
                height={1024}
                className="h-auto w-full transition duration-500 group-hover:scale-[1.02]"
              />
            </div>
            <p className="mt-3 text-center text-sm text-zinc-300">{s.caption}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

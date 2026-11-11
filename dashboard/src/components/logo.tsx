// The nav mark: the shield from the mascot's forehead, lit in the brand mint.
export function Logo({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="logo-fill" x1="6" y1="3" x2="26" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a3fbd8" />
          <stop offset="1" stopColor="#19d98b" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.8 5 6.9v8c0 6.9 4.7 12.3 11 14.3 6.3-2 11-7.4 11-14.3v-8L16 2.8Z"
        fill="#3df2a6"
        fillOpacity="0.12"
        stroke="url(#logo-fill)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m11.2 16 3.4 3.4 6.4-6.8"
        stroke="#cdfee8"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <Logo className="size-7 drop-shadow-[0_0_10px_rgb(61_242_166/0.45)]" />
      <span className="text-[15px] font-semibold tracking-tight text-white">Guardian Wallet</span>
    </span>
  );
}

export function NearBadge({ label = 'Built on NEAR', className = '' }: { label?: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/[0.07] px-3 py-1 text-xs font-medium text-emerald-200 ${className}`}
    >
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
      </span>
      {label}
    </span>
  );
}

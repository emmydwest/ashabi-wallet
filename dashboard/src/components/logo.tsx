export function Logo({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="logo-fill" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6ee7b7" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.5 4.5 6.8v8.4c0 7.1 4.9 12.6 11.5 14.3 6.6-1.7 11.5-7.2 11.5-14.3V6.8L16 2.5Z"
        fill="url(#logo-fill)"
        fillOpacity="0.16"
        stroke="url(#logo-fill)"
        strokeWidth="1.5"
      />
      <path d="m11 16 3.5 3.5L21.5 12" stroke="#d1fae5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

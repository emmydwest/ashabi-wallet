// Gradients, filters and the dot-matrix mask every illustration shares. Rendered once in the
// layout so each drawing can point at them by id instead of carrying its own copy.
export function ArtDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute size-0 overflow-hidden" focusable="false">
      <defs>
        {/* The mascot's glossy white shell, lit from the top left. */}
        <radialGradient id="art-shell" cx="34%" cy="26%" r="80%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#e7ebee" />
          <stop offset="0.85" stopColor="#b9c1c8" />
          <stop offset="1" stopColor="#8d969e" />
        </radialGradient>
        <radialGradient id="art-shell-dark" cx="34%" cy="26%" r="80%">
          <stop offset="0" stopColor="#4a5056" />
          <stop offset="0.6" stopColor="#24282c" />
          <stop offset="1" stopColor="#0d0f11" />
        </radialGradient>
        <linearGradient id="art-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f6f8" />
          <stop offset="0.5" stopColor="#9aa3ab" />
          <stop offset="1" stopColor="#5d666e" />
        </linearGradient>
        <linearGradient id="art-visor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b1f22" />
          <stop offset="0.45" stopColor="#050607" />
          <stop offset="1" stopColor="#000000" />
        </linearGradient>
        <linearGradient id="art-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="art-coin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#d6f7e8" />
          <stop offset="1" stopColor="#7fdcb5" />
        </linearGradient>
        <linearGradient id="art-coin-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5fcf9f" />
          <stop offset="1" stopColor="#1f7a55" />
        </linearGradient>
        <linearGradient id="art-frost" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e0f2fe" stopOpacity="0.75" />
          <stop offset="1" stopColor="#7dd3fc" stopOpacity="0.25" />
        </linearGradient>
        <radialGradient id="art-floor" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#3df2a6" stopOpacity="0.45" />
          <stop offset="1" stopColor="#3df2a6" stopOpacity="0" />
        </radialGradient>

        {/* LED dots: anything drawn under this mask reads as the mascot's dot-matrix display. */}
        <pattern id="art-dot" width="2.6" height="2.6" patternUnits="userSpaceOnUse">
          <circle cx="1.3" cy="1.3" r="1" fill="#fff" />
        </pattern>
        <mask id="art-leds" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="4000" height="4000">
          <rect x="-2000" y="-2000" width="4000" height="4000" fill="url(#art-dot)" />
        </mask>

        {/* In user space: a straight LED line has a zero-height box, which would clip a relative region to nothing. */}
        <filter id="art-glow" filterUnits="userSpaceOnUse" x="-60" y="-60" width="240" height="240">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="art-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
    </svg>
  );
}

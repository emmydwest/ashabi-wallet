'use client';

import { useEffect, useRef, useState } from 'react';

const ease = (t: number) => 1 - (1 - t) ** 3;

// Counts up to a live number the first time it scrolls into view, then rolls to each new value
// as the chain reports it. The real value is in the DOM from the start (screen readers, no-JS,
// reduced motion); only the painted digits animate.
export function CountUp({
  value,
  decimals = 0,
  className = '',
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState<number | null>(null);
  const [bumped, setBumped] = useState(0);
  const from = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = from.current;
    from.current = value;
    if (reduce || start === value) return;

    let frame = 0;
    const roll = (a: number, ms: number) => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / ms);
        setShown(t >= 1 ? null : a + (value - a) * ease(t));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    if (start !== null) {
      // A live update: roll from the old number and give it a brief glow.
      setBumped((n) => n + 1);
      roll(start, 700);
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      roll(0, 1100);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      // Not counted yet, so a remount (Strict Mode, Fast Refresh) should still count up.
      from.current = start;
    };
  }, [value]);

  const text = (shown ?? value).toFixed(decimals);
  return (
    <span ref={ref} className={`tabular ${className}`} aria-label={value.toFixed(decimals)}>
      <span key={bumped} aria-hidden className={bumped ? 'animate-bump' : undefined}>
        {text}
      </span>
    </span>
  );
}

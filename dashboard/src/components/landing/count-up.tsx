'use client';

import { useEffect, useRef, useState } from 'react';

// Counts up to a live number the first time it scrolls into view. The real value is in the DOM
// from the start (screen readers, no-JS, reduced motion); only the painted digits animate.
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
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || done.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      done.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 1100);
        setShown(t >= 1 ? null : value * (1 - (1 - t) ** 3));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  const text = (shown ?? value).toFixed(decimals);
  return (
    <span ref={ref} className={`tabular ${className}`} aria-label={value.toFixed(decimals)}>
      <span aria-hidden>{text}</span>
    </span>
  );
}

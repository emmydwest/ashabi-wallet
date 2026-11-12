'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = { children: ReactNode; className?: string; as?: 'div' | 'section'; id?: string; delay?: number };

/**
 * Fades a section up as it scrolls into view. The server renders it visible, so nothing is
 * hidden without JavaScript; only sections still below the fold get tucked away after load,
 * and only for people who haven't asked for reduced motion.
 */
export function Reveal({ children, className = '', as: Tag = 'div', id, delay = 0 }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<'shown' | 'waiting' | 'in'>('shown');

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
    // Measured after paint, so tucking it away can't flash anything the reader is looking at.
    setState('waiting');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setState('in');
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      id={id}
      data-reveal={state}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={className}
    >
      {children}
    </Tag>
  );
}

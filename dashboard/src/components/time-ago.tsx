'use client';

import { useEffect, useState } from 'react';
import { timeAgo } from '@/lib/format';

// Relative times need a clock, which cannot run during prerender. When `at` is
// given (usually the snapshot time), SSR already has a real label; the client
// refreshes it after mount.
export function TimeAgo({ date, at }: { date: Date; at?: number }) {
  const [now, setNow] = useState(at);
  useEffect(() => {
    const start = window.setTimeout(() => setNow(Date.now()), 0);
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      clearTimeout(start);
      clearInterval(id);
    };
  }, [date]);
  return <span suppressHydrationWarning>{now ? timeAgo(date, now) : '…'}</span>;
}

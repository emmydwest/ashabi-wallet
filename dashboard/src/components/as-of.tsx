import type { GuardianSnapshot } from '@/lib/types';

// Only says something when the numbers are not live, so nobody mistakes old state for new.
export function AsOf({ snapshot, offline }: { snapshot: GuardianSnapshot; offline?: boolean }) {
  if (!snapshot.stale && !offline) return null;
  const at = new Date(snapshot.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-200"
      suppressHydrationWarning
    >
      <span className="size-1.5 rounded-full bg-amber-300" />
      On-chain state as of {at} · testnet RPC is slow, retrying
    </span>
  );
}

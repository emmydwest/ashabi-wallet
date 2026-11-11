import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { Suspense } from 'react';
import { AgentConsole } from '@/components/agent/agent-console';
import { WalletProvider } from '@/components/approve/wallet';
import { loadSnapshot } from '@/lib/guardian';

export const metadata: Metadata = { title: 'Agent · Guardian Wallet' };

async function initialSnapshot() {
  'use cache';
  cacheLife({ stale: 15, revalidate: 15, expire: 120 });
  try {
    return await loadSnapshot();
  } catch {
    return null;
  }
}

// The cached contract state streams in with the first response, so the page paints with
// real numbers instead of waiting for the client to fetch them.
async function Console() {
  return <AgentConsole initial={await initialSnapshot()} />;
}

export default function AgentPage() {
  return (
    <WalletProvider>
      <Suspense fallback={<ConsoleSkeleton />}>
        <Console />
      </Suspense>
    </WalletProvider>
  );
}

function ConsoleSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-8 sm:py-14" aria-hidden>
      <div className="h-4 w-40 rounded bg-white/[0.06]" />
      <div className="mt-4 h-24 max-w-xl rounded-xl bg-white/[0.05]" />
      <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="glass h-20 rounded-2xl" />
        ))}
      </div>
      <div className="glass mt-6 h-96 rounded-2xl" />
    </div>
  );
}

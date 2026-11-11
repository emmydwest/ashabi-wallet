import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AgentConsole } from '@/components/agent/agent-console';
import { WalletProvider } from '@/components/approve/wallet';
import { PageSkeleton } from '@/components/page-skeleton';
import { cachedSnapshot } from '@/lib/server/cached-snapshot';

export const metadata: Metadata = { title: 'Attack Demo' };

async function Console() {
  return <AgentConsole initial={await cachedSnapshot()} />;
}

export default function AgentPage() {
  return (
    <WalletProvider>
      <Suspense fallback={<PageSkeleton />}>
        <Console />
      </Suspense>
    </WalletProvider>
  );
}

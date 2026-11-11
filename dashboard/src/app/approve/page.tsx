import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ApproveView } from '@/components/approve/approve-view';
import { WalletProvider } from '@/components/approve/wallet';
import { PageSkeleton } from '@/components/page-skeleton';
import { cachedSnapshot } from '@/lib/server/cached-snapshot';

export const metadata: Metadata = { title: 'Approve · Guardian Wallet' };

async function Approve() {
  return <ApproveView initial={await cachedSnapshot()} />;
}

export default function ApprovePage() {
  return (
    <WalletProvider>
      <Suspense fallback={<PageSkeleton narrow />}>
        <Approve />
      </Suspense>
    </WalletProvider>
  );
}

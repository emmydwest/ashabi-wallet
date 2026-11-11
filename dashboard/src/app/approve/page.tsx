import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ApproveView } from '@/components/approve/approve-view';
import { PageSkeleton } from '@/components/page-skeleton';
import { cachedSnapshot } from '@/lib/server/cached-snapshot';

export const metadata: Metadata = { title: 'Approve' };

async function Approve() {
  return <ApproveView initial={await cachedSnapshot()} />;
}

export default function ApprovePage() {
  return (
    <Suspense fallback={<PageSkeleton narrow />}>
      <Approve />
    </Suspense>
  );
}

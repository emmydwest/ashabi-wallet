import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { PageSkeleton } from '@/components/page-skeleton';
import actionLog from '@/data/action-log.json';
import { cachedSnapshot } from '@/lib/server/cached-snapshot';
import type { ActionLog } from '@/lib/types';

export const metadata: Metadata = { title: 'Dashboard' };

async function Dashboard() {
  return <DashboardView log={actionLog as ActionLog} initial={await cachedSnapshot()} />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

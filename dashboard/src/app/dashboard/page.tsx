import type { Metadata } from 'next';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import actionLog from '@/data/action-log.json';
import type { ActionLog } from '@/lib/types';

export const metadata: Metadata = { title: 'Dashboard · Guardian Wallet' };

export default function DashboardPage() {
  return <DashboardView log={actionLog as ActionLog} />;
}

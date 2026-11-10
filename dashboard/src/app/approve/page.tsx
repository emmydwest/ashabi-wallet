import type { Metadata } from 'next';
import { ApproveView } from '@/components/approve/approve-view';
import { WalletProvider } from '@/components/approve/wallet';

export const metadata: Metadata = { title: 'Approve · Guardian Wallet' };

export default function ApprovePage() {
  return (
    <WalletProvider>
      <ApproveView />
    </WalletProvider>
  );
}

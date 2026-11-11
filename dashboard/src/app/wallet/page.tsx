import type { Metadata } from 'next';
import { MyWallets } from '@/components/start/my-wallets';

export const metadata: Metadata = { title: 'My wallets' };

export default function WalletPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 pb-16 pt-8">
      <h1 className="mb-5 font-display text-3xl font-semibold tracking-tight text-white">My wallets</h1>
      <MyWallets />
    </main>
  );
}

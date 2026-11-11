import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { WalletProvider } from '@/components/approve/wallet';
import { PageSkeleton } from '@/components/page-skeleton';
import { VaultMissing, VaultView } from '@/components/vault/vault-view';
import { isVaultId } from '@/lib/config';
import { loadSnapshot } from '@/lib/guardian';

export const metadata: Metadata = { title: 'Your wallet · Guardian Wallet' };

async function Vault({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vaultId = decodeURIComponent(id);
  if (!isVaultId(vaultId)) notFound();
  await connection();
  const snapshot = await loadSnapshot(vaultId).catch(() => null);
  if (!snapshot) return <VaultMissing vaultId={vaultId} />;
  return <VaultView vaultId={vaultId} initial={snapshot} />;
}

export default function VaultPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <WalletProvider>
      <Suspense fallback={<PageSkeleton narrow />}>
        <Vault params={params} />
      </Suspense>
    </WalletProvider>
  );
}

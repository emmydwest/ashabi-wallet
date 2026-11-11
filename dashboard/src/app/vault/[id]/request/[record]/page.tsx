import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { WalletProvider } from '@/components/approve/wallet';
import { PageSkeleton } from '@/components/page-skeleton';
import { RequestView } from '@/components/vault/request-view';
import { VaultMissing } from '@/components/vault/vault-view';
import { isVaultId } from '@/lib/config';
import { loadSnapshot } from '@/lib/guardian';

export const metadata: Metadata = { title: 'Approve a payment' };

async function Request({ params }: { params: Promise<{ id: string; record: string }> }) {
  const { id, record } = await params;
  const vaultId = decodeURIComponent(id);
  const recordId = Number(record);
  if (!isVaultId(vaultId) || !Number.isInteger(recordId) || recordId < 0) notFound();
  await connection();
  const snapshot = await loadSnapshot(vaultId).catch(() => null);
  if (!snapshot) return <VaultMissing vaultId={vaultId} />;
  return <RequestView vaultId={vaultId} recordId={recordId} initial={snapshot} />;
}

export default function RequestPage({ params }: { params: Promise<{ id: string; record: string }> }) {
  return (
    <WalletProvider>
      <Suspense fallback={<PageSkeleton narrow />}>
        <Request params={params} />
      </Suspense>
    </WalletProvider>
  );
}

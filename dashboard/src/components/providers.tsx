'use client';

import type { ReactNode } from 'react';
import { WalletProvider } from '@/components/approve/wallet';
import { MotionProvider } from '@/components/motion-provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionProvider>
      <WalletProvider>{children}</WalletProvider>
    </MotionProvider>
  );
}

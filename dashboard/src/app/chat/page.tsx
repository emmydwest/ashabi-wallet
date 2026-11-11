import type { Metadata } from 'next';
import { Suspense } from 'react';
import { WalletProvider } from '@/components/approve/wallet';
import { ChatView } from '@/components/chat/chat-view';

export const metadata: Metadata = {
  title: 'Assistant · Guardian Wallet',
  description: 'Ask an AI assistant to buy something. It pays from a guarded wallet, inside your rules.',
};

export default function ChatPage() {
  return (
    <WalletProvider>
      <main className="mx-auto w-full max-w-xl px-4">
        <Suspense fallback={<div className="pt-16 text-center text-zinc-500">Loading…</div>}>
          <ChatView />
        </Suspense>
      </main>
    </WalletProvider>
  );
}

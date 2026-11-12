import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ChatView } from '@/components/chat/chat-view';
import { PageSkeleton } from '@/components/page-skeleton';

export const metadata: Metadata = {
  title: 'Chat with Ashabi',
  description: 'Chat with Ashabi, a tool-calling shopping assistant whose NEAR testnet wallet is limited by a smart contract.',
};

export default function ChatPage() {
  return (
    <main className="chat-page mx-auto w-full max-w-xl px-4">
      <Suspense fallback={<PageSkeleton narrow />}>
        <ChatView />
      </Suspense>
    </main>
  );
}

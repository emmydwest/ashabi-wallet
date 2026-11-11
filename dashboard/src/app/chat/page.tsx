import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ChatView } from '@/components/chat/chat-view';
import { PageSkeleton } from '@/components/page-skeleton';

export const metadata: Metadata = {
  title: 'Live Agent',
  description: 'Ask an AI assistant to buy something. It pays from a guarded wallet, inside your rules.',
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

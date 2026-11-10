import type { Metadata } from 'next';
import { AgentConsole } from '@/components/agent/agent-console';

export const metadata: Metadata = { title: 'Agent · Guardian Wallet' };

export default function AgentPage() {
  return <AgentConsole />;
}

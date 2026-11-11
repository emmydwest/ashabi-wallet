import type { Metadata } from 'next';
import { Mascot } from '@/components/mascot/mascot';
import { StartFlow } from '@/components/start/start-flow';

export const metadata: Metadata = {
  title: 'Create your guarded wallet',
  description: 'Give your AI agent a budget it can spend, and keep the final say on anything big.',
};

export default function StartPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 pb-16 pt-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white">
            Create your guarded wallet
          </h1>
          <p className="mt-2 text-zinc-400">
            Your AI gets an allowance. You keep the keys, the limits, and the last word.
          </p>
        </div>
        <Mascot size={72} decorative className="shrink-0" />
      </div>
      <div className="mt-6">
        <StartFlow />
      </div>
    </main>
  );
}

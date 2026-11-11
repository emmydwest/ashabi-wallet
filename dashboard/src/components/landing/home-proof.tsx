import { ProofFlow } from '@/components/proof/proof-flow';
import { cachedSnapshot } from '@/lib/server/cached-snapshot';

export async function HomeProof() {
  return <ProofFlow snapshot={await cachedSnapshot()} />;
}

export function HomeProofSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="glass h-72 animate-pulse rounded-card" />
      ))}
    </div>
  );
}

import { Mascot } from './mascot/mascot';

export function PageSkeleton({ narrow = false }: { narrow?: boolean }) {
  return (
    <div className={`mx-auto px-4 py-10 sm:px-8 ${narrow ? 'max-w-md' : 'max-w-7xl'}`} role="status">
      <div className="flex items-center gap-3 text-sm text-zinc-400">
        <Mascot mood="thinking" size={48} decorative />
        Reading the wallet from NEAR…
      </div>
      <div className="animate-pulse" aria-hidden>
        <div className="mt-6 h-4 w-40 rounded bg-white/[0.06]" />
        <div className="mt-4 h-20 max-w-xl rounded-xl bg-white/[0.05]" />
        <div className={`mt-8 grid gap-3 ${narrow ? 'grid-cols-1' : 'grid-cols-3'}`}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass h-20 rounded-2xl" />
          ))}
        </div>
        <div className="glass mt-6 h-96 rounded-2xl" />
      </div>
    </div>
  );
}

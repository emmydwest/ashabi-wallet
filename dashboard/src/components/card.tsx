import type { ReactNode } from 'react';

type CardProps = { children: ReactNode; className?: string };

export function Card({ children, className = '' }: CardProps) {
  return <section className={`glass rounded-2xl ${className}`}>{children}</section>;
}

export function CardHeader({ title, hint, action }: { title: string; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
      <div>
        <h2 className="text-[13px] font-medium uppercase tracking-[0.14em] text-zinc-400">{title}</h2>
        {hint && <p className="mt-1 text-sm text-zinc-500">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

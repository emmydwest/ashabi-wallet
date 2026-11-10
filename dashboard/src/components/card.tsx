import type { ReactNode } from 'react';

type CardProps = { children: ReactNode; className?: string };

export function Card({ children, className = '' }: CardProps) {
  return <section className={`glass rounded-2xl ${className}`}>{children}</section>;
}

export function CardHeader({ title, hint, action }: { title: string; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 sm:pt-6">
      <div className="min-w-0">
        <h2 className="text-[13px] font-medium uppercase tracking-[0.14em] text-zinc-300">{title}</h2>
        {hint && <p className="mt-1 text-sm text-zinc-400">{hint}</p>}
      </div>
      {action && <div className="shrink-0 self-start">{action}</div>}
    </div>
  );
}

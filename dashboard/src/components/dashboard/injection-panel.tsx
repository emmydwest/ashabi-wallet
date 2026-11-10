'use client';

import { motion } from 'motion/react';
import { useState } from 'react';
import { Card, CardHeader } from '@/components/card';
import { HIDDEN_BLOCK, INJECTION_TEXT, trapPageHtml } from '@/vendor/trap-page';

const VIEWS = ['Human view', 'Raw HTML'] as const;
type View = (typeof VIEWS)[number];

const withoutToggle = trapPageHtml.replace(/\s*<button[\s\S]*?<\/script>/, '');
const humanHtml = withoutToggle.replace('</head>', '<style>body { margin: 28px; font-size: 14px; }</style></head>');
const rawBody = withoutToggle.slice(withoutToggle.indexOf('  <body>'), withoutToggle.indexOf('</html>'));
const [rawBefore, rawAfter] = rawBody.split(HIDDEN_BLOCK);

export function InjectionPanel() {
  const [view, setView] = useState<View>('Human view');

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Act 2 · The booby-trapped page"
        hint="What a person sees, and what the agent actually reads."
        action={
          <div className="flex rounded-lg border border-white/[0.07] bg-black/20 p-0.5 text-xs">
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1.5 transition-colors ${view === v ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                {v === 'Raw HTML' ? 'View raw HTML' : v}
              </button>
            ))}
          </div>
        }
      />
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative h-[420px] overflow-hidden rounded-xl border border-white/[0.08] bg-black/30">
          <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-2">
            <span className="size-2.5 rounded-full bg-white/10" />
            <span className="size-2.5 rounded-full bg-white/10" />
            <span className="size-2.5 rounded-full bg-white/10" />
            <span className="ml-3 truncate font-mono text-[11px] text-zinc-500">/api/vendor/docs/weather-api</span>
          </div>
          {view === 'Human view' ? (
            <iframe
              title="Trap page as a human sees it"
              srcDoc={humanHtml}
              sandbox=""
              className="h-full w-full bg-white"
            />
          ) : (
            <motion.pre
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full overflow-auto whitespace-pre-wrap p-4 pb-16 font-mono text-[11.5px] leading-relaxed text-zinc-400"
            >
              {rawBefore}
              <mark className="rounded bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/40">{HIDDEN_BLOCK}</mark>
              {rawAfter}
            </motion.pre>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-rose-400/20 bg-rose-500/[0.06] p-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-rose-300">Hidden instruction</div>
            <p className="mt-2 font-mono text-xs leading-relaxed text-rose-100/90">{INJECTION_TEXT}</p>
          </div>
          <ol className="space-y-3 text-sm">
            <Step n={1} title="Invisible to people">
              The block sits in a <code className="text-zinc-300">display:none</code> element.
            </Step>
            <Step n={2} title="Visible to the agent">
              Scrapers read every text node, so the model sees it as part of the docs.
            </Step>
            <Step n={3} title="Stopped by the contract" tone="text-emerald-300">
              Even when the agent submits it, the attacker is not an approved payee. Nothing moves.
            </Step>
          </ol>
        </div>
      </div>
    </Card>
  );
}

function Step({
  n,
  title,
  children,
  tone = 'text-white',
}: {
  n: number;
  title: string;
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-full border border-white/10 font-mono text-[11px] text-zinc-400">
        {n}
      </span>
      <div>
        <div className={`font-medium ${tone}`}>{title}</div>
        <p className="text-zinc-500">{children}</p>
      </div>
    </li>
  );
}

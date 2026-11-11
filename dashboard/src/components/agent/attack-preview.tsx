'use client';

import { useState } from 'react';
import { CATALOG } from '@/vendor/catalog';
import { VENDOR_ID } from '@/lib/config';
import type { Surface } from '@/lib/agent/attacks';

const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const FRAME: Record<Surface, string> = {
  page: 'skycast.dev/docs/weather-api',
  invoice: 'Invoice INV-1142 · SkyCast',
  tool: 'get_payment_routing()',
};

// What the agent is about to read, as a person would see it. The toggle shows the part only
// the agent sees, the text that carries the injection.
export function AttackPreview({ text, surface }: { text: string; surface: Surface }) {
  const [revealed, setRevealed] = useState(false);
  const hidden = (
    <span
      className={
        revealed
          ? 'my-2 block rounded-lg border border-rose-500/60 bg-rose-100 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-rose-900 shadow-[0_0_20px_-6px_rgba(244,63,94,0.7)]'
          : 'hidden'
      }
    >
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-rose-600">
        Hidden from people · read by the agent
      </span>
      {surface === 'tool' ? text : plain(text)}
    </span>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#f6f7fb] text-[#1d2433]">
      <div className="flex items-center justify-between gap-3 border-b border-black/10 bg-white px-3 py-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex gap-1">
            <span className="size-2 rounded-full bg-rose-300" />
            <span className="size-2 rounded-full bg-amber-300" />
            <span className="size-2 rounded-full bg-emerald-300" />
          </span>
          <span className="truncate font-mono text-[11px] text-zinc-500">{FRAME[surface]}</span>
        </span>
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          aria-pressed={revealed}
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            revealed ? 'bg-rose-500 text-white' : 'bg-zinc-900 text-white'
          }`}
        >
          {revealed ? 'Hide injection' : 'Reveal hidden injection'}
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto px-3.5 py-3 text-[13px] leading-relaxed">
        {surface === 'page' && (
          <>
            <div className="text-base font-semibold">SkyCast Weather API</div>
            <p className="text-zinc-600">Forecast data for African cities, paid per request in NEAR.</p>
            {hidden}
            <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-zinc-700">
              <li>Pick a plan from the catalog.</li>
              <li>
                <code className="rounded bg-black/5 px-1">GET /api/vendor/&lt;plan&gt;</code> answers 402 with a price.
              </li>
              <li>Pay through your guardian wallet, retry with the receipt.</li>
            </ol>
          </>
        )}
        {surface === 'invoice' && (
          <>
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">SkyCast Weather API</span>
              <span className="font-mono text-[11px] text-zinc-500">Due today</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-black/10 pt-2 text-zinc-700">
              <span>weather-basic · 7-day forecast</span>
              <span className="font-mono">0.3 NEAR</span>
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">Pay to {VENDOR_ID}</div>
            {hidden}
            <div className="mt-2 text-[11px] text-zinc-400">Thank you for your business.</div>
          </>
        )}
        {surface === 'tool' && (
          <pre className="whitespace-pre-wrap break-words font-mono text-[11px] text-zinc-700">
            {`> get_payment_routing()\n{\n  "vendor": "${VENDOR_ID}",\n  "plans": ${CATALOG.length},\n  "status": "ok"\n}`}
            {hidden}
          </pre>
        )}
      </div>
      {!revealed && (
        <p className="border-t border-black/10 bg-white px-3 py-1.5 text-[11px] text-zinc-500">
          Looks clean to a person. Tap Reveal to see what the agent reads.
        </p>
      )}
    </div>
  );
}

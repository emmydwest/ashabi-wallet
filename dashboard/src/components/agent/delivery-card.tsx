type Forecast = {
  kind?: string;
  city?: string;
  days?: { date: string; high_c: number; low_c: number; rain_chance: number }[];
};
type News = {
  kind?: string;
  city?: string;
  date?: string;
  headline?: string;
  items?: { title: string; blurb: string }[];
};
type Translation = {
  kind?: string;
  source?: string;
  translations?: { lang: string; label: string; text: string }[];
};
type Icons = { kind?: string; title?: string; license?: string; icons?: { name: string; svg: string }[] };
type Report = {
  kind?: string;
  title?: string;
  as_of?: string;
  figures?: { label: string; value: string; change: string }[];
  note?: string;
};

// Open Data Desk: live answers from public APIs, passed through as the source gave them.
type Fx = { kind?: string; source?: string; base?: string; rates?: { currency: string; rate: number }[] };
type Air = { kind?: string; readings?: { label: string; value: number | string; unit: string }[] };
type Quakes = { kind?: string; count?: number; quakes?: { magnitude: number; place: string; time: string; url: string }[] };

export function DeliveryCard({ data }: { data: unknown }) {
  const d = data as Forecast & News & Translation & Icons & Report & Fx & Air & Quakes;
  if (d.kind === 'fx') return <FxCard data={d} />;
  if (d.kind === 'air') return <AirCard data={d} />;
  if (d.kind === 'quakes') return <QuakeCard data={d} />;
  if (d.kind === 'forecast' || d.days?.length) return <ForecastCard data={d} />;
  if (d.kind === 'news') return <NewsCard data={d} />;
  if (d.kind === 'translation') return <TranslationCard data={d} />;
  if (d.kind === 'icons') return <IconCard data={d} />;
  if (d.kind === 'report') return <ReportCard data={d} />;
  return (
    <pre className="mt-3 overflow-x-auto rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-3 font-mono text-xs text-zinc-300">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function ForecastCard({ data }: { data: Forecast }) {
  const days = data.days ?? [];
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04]">
      <div className="px-3 py-2 font-mono text-xs uppercase tracking-wider text-emerald-300">
        {data.city} · {days.length === 1 ? 'today' : `${days.length}-day forecast`}
      </div>
      <div className="flex gap-2 overflow-x-auto px-3 pb-3">
        {days.map((d) => (
          <div
            key={d.date}
            className="min-w-[4.5rem] rounded-lg border border-white/[0.06] bg-black/30 px-2.5 py-2 text-center"
          >
            <div className="font-mono text-xs text-zinc-400">{d.date.slice(5)}</div>
            <div className="mt-1 text-sm font-semibold text-white">{d.high_c}°</div>
            <div className="text-xs text-zinc-400">{d.low_c}°</div>
            <div className="mt-1 text-xs text-sky-300">{Math.round(d.rain_chance * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewsCard({ data }: { data: News }) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04]">
      <div className="px-3 py-2 font-mono text-xs uppercase tracking-wider text-emerald-300">
        {data.headline ?? 'News'} · {data.city} · {data.date}
      </div>
      <ul className="space-y-2 px-3 pb-3">
        {(data.items ?? []).map((item) => (
          <li key={item.title} className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2">
            <div className="text-sm font-medium text-white">{item.title}</div>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{item.blurb}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TranslationCard({ data }: { data: Translation }) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] px-3 py-3">
      <div className="font-mono text-xs uppercase tracking-wider text-emerald-300">Translation</div>
      <p className="mt-1 text-sm text-zinc-400">
        Source: <span className="text-white">{data.source}</span>
      </p>
      <ul className="mt-2 space-y-1.5">
        {(data.translations ?? []).map((t) => (
          <li key={t.lang} className="flex items-baseline justify-between gap-3 rounded-lg bg-black/30 px-3 py-2">
            <span className="text-xs text-zinc-400">{t.label}</span>
            <span className="text-sm font-medium text-white">{t.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function IconCard({ data }: { data: Icons }) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] px-3 py-3">
      <div className="font-mono text-xs uppercase tracking-wider text-emerald-300">{data.title ?? 'Icons'}</div>
      <div className="mt-3 flex flex-wrap gap-3">
        {(data.icons ?? []).map((icon) => (
          <div key={icon.name} className="flex flex-col items-center gap-1.5 rounded-lg bg-black/30 px-3 py-2">
            <span className="size-8" aria-hidden dangerouslySetInnerHTML={{ __html: icon.svg }} />
            <span className="font-mono text-[11px] text-zinc-400">{icon.name}</span>
          </div>
        ))}
      </div>
      {data.license && <p className="mt-2 text-[11px] text-zinc-500">{data.license}</p>}
    </div>
  );
}

function ReportCard({ data }: { data: Report }) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04]">
      <div className="px-3 py-2 font-mono text-xs uppercase tracking-wider text-emerald-300">
        {data.title} · {data.as_of}
      </div>
      <ul className="divide-y divide-white/[0.06] px-1">
        {(data.figures ?? []).map((f) => (
          <li key={f.label} className="flex items-baseline justify-between gap-3 px-3 py-2">
            <span className="text-sm text-zinc-400">{f.label}</span>
            <span className="text-sm text-white">
              {f.value} <span className="text-xs text-zinc-500">{f.change}</span>
            </span>
          </li>
        ))}
      </ul>
      {data.note && <p className="px-3 pb-3 text-[11px] text-zinc-500">{data.note}</p>}
    </div>
  );
}

function LiveHeader({ title, source, asOf }: { title: string; source?: string; asOf?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3 py-2">
      <span className="font-mono text-xs uppercase tracking-wider text-sky-300">{title}</span>
      <span className="text-[11px] text-zinc-500">
        Live · {source}
        {asOf ? ` · ${asOf}` : ''}
      </span>
    </div>
  );
}

function FxCard({ data }: { data: Fx & { as_of?: string } }) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-sky-400/20 bg-sky-400/[0.04]">
      <LiveHeader title={`1 ${data.base ?? 'USD'} is worth`} source={data.source} asOf={data.as_of} />
      <ul className="grid grid-cols-2 gap-2 px-3 pb-3 sm:grid-cols-3">
        {(data.rates ?? []).map((r) => (
          <li key={r.currency} className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2">
            <div className="font-mono text-[11px] text-zinc-400">{r.currency}</div>
            <div className="text-sm font-semibold tabular-nums text-white">{r.rate}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AirCard({ data }: { data: Air & { source?: string; city?: string; as_of?: string } }) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-sky-400/20 bg-sky-400/[0.04]">
      <LiveHeader title={`${data.city ?? 'Lagos'} air quality`} source={data.source} asOf={data.as_of} />
      <ul className="grid grid-cols-2 gap-2 px-3 pb-3 sm:grid-cols-4">
        {(data.readings ?? []).map((r) => (
          <li key={r.label} className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2">
            <div className="text-[11px] text-zinc-400">{r.label}</div>
            <div className="text-sm font-semibold tabular-nums text-white">
              {r.value} <span className="text-[11px] font-normal text-zinc-500">{r.unit}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuakeCard({ data }: { data: Quakes & { source?: string } }) {
  const quakes = data.quakes ?? [];
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-sky-400/20 bg-sky-400/[0.04]">
      <LiveHeader title={`${data.count ?? quakes.length} quakes, M4.5+, past day`} source={data.source} />
      <ul className="divide-y divide-white/[0.06] px-1 pb-1">
        {quakes.map((q) => (
          <li key={q.url} className="flex items-baseline gap-3 px-3 py-2">
            <span className="w-9 shrink-0 font-mono text-sm font-semibold text-amber-200">{q.magnitude.toFixed(1)}</span>
            <a href={q.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 break-words text-sm text-zinc-200 hover:text-white">
              {q.place}
            </a>
            <span className="shrink-0 font-mono text-[11px] text-zinc-500">{q.time.slice(11, 16)} UTC</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

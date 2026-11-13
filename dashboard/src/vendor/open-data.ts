import 'server-only';

// What Open Data Desk hands over after a receipt checks out. Each SKU wraps a free, keyless
// public API; nothing is cached, so a buyer gets the source's current answer.

const LAGOS = { latitude: 6.45, longitude: 3.39 };

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
  return (await res.json()) as T;
}

async function fxRates() {
  const body = await json<{ date: string; base: string; rates: Record<string, number> }>(
    'https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,GBP,JPY,CAD,ZAR,CNY',
  );
  return {
    kind: 'fx' as const,
    sku: 'fx-usd',
    source: 'Frankfurter (European Central Bank reference rates)',
    as_of: body.date,
    base: body.base,
    rates: Object.entries(body.rates).map(([currency, rate]) => ({ currency, rate })),
  };
}

async function airLagos() {
  const params = new URLSearchParams({
    latitude: String(LAGOS.latitude),
    longitude: String(LAGOS.longitude),
    current: 'pm2_5,pm10,ozone,us_aqi',
  });
  const body = await json<{ current: Record<string, number | string>; current_units: Record<string, string> }>(
    `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`,
  );
  const reading = (key: string, label: string) => ({
    label,
    value: body.current[key],
    unit: body.current_units[key] ?? '',
  });
  return {
    kind: 'air' as const,
    sku: 'air-lagos',
    source: 'Open-Meteo air quality',
    city: 'Lagos',
    as_of: String(body.current.time),
    readings: [
      reading('us_aqi', 'US AQI'),
      reading('pm2_5', 'PM2.5'),
      reading('pm10', 'PM10'),
      reading('ozone', 'Ozone'),
    ],
  };
}

type Quake = { properties: { mag: number; place: string; time: number; url: string } };

async function quakesToday() {
  const body = await json<{ metadata: { count: number }; features: Quake[] }>(
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson',
  );
  return {
    kind: 'quakes' as const,
    sku: 'quakes-today',
    source: 'USGS earthquake feed',
    count: body.metadata.count,
    quakes: body.features.slice(0, 8).map((f) => ({
      magnitude: f.properties.mag,
      place: f.properties.place,
      time: new Date(f.properties.time).toISOString(),
      url: f.properties.url,
    })),
  };
}

const SOURCES: Record<string, () => Promise<unknown>> = {
  'fx-usd': fxRates,
  'air-lagos': airLagos,
  'quakes-today': quakesToday,
};

export async function deliverOpenData(sku: string) {
  const source = SOURCES[sku];
  if (!source) throw new Error(`unknown sku ${sku}`);
  return source();
}

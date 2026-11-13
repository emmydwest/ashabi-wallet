import { VENDOR_ID } from '@/lib/config';

export type CatalogItem = {
  sku: string;
  price_near: string;
  name: string;
  description: string;
  /** The account the price is paid to; a receipt to anyone else unlocks nothing. */
  payee: string;
};

// SkyCast, the first provider: weather and a few sample data products, paid to api-vendor.
const skycast = (item: Omit<CatalogItem, 'payee'>): CatalogItem => ({ ...item, payee: VENDOR_ID });

export const CATALOG: CatalogItem[] = [
  skycast({
    sku: 'weather-now',
    price_near: '0.05',
    name: 'Current weather',
    description: 'Current conditions for one city, JSON',
  }),
  skycast({
    sku: 'news-digest',
    price_near: '0.08',
    name: 'Morning news digest',
    description: 'A short Lagos morning briefing, JSON',
  }),
  skycast({
    sku: 'translate',
    price_near: '0.12',
    name: 'Translation',
    description: 'Translate a short phrase into Yoruba and French, JSON',
  }),
  skycast({ sku: 'icon-pack', price_near: '0.25', name: 'Icon pack', description: 'A small SVG icon set, JSON' }),
  skycast({ sku: 'weather-basic', price_near: '0.3', name: '7-day forecast', description: '7-day forecast for one city, JSON' }),
  skycast({
    sku: 'market-report',
    price_near: '0.4',
    name: 'Market report',
    description: 'A one-page Lagos market snapshot, JSON',
  }),
  skycast({
    sku: 'weather-pro',
    price_near: '0.8',
    name: 'Pro forecast',
    description: 'Hourly forecast plus air quality, JSON',
  }),
  skycast({ sku: 'premium-annual', price_near: '1.5', name: 'Annual plan', description: 'Unlimited forecasts for 12 months' }),
];

export const itemFor = (sku: string) => CATALOG.find((i) => i.sku === sku);

export function forecast(sku: string) {
  const days = sku === 'weather-now' ? 1 : sku === 'weather-basic' ? 7 : 14;
  const start = Date.UTC(2026, 10, 11);
  return {
    kind: 'forecast' as const,
    city: 'Lagos',
    sku,
    days: Array.from({ length: days }, (_, i) => ({
      date: new Date(start + i * 86_400_000).toISOString().slice(0, 10),
      high_c: 31 + (i % 3),
      low_c: 24 + (i % 2),
      rain_chance: [0.2, 0.4, 0.6][i % 3],
    })),
  };
}

const ICONS = [
  {
    name: 'shield',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#3df2a6" stroke-width="1.8"><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z"/><path d="m8.5 12 2.3 2.3 4.7-5"/></svg>',
  },
  {
    name: 'coin',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#3df2a6" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10.5c.6-.7 1.5-1 2.5-1s1.9.3 2.5 1c.5.6.5 1.4 0 2-.6.7-1.5 1-2.5 1s-1.9.3-2.5 1c-.5.6-.5 1.4 0 2 .6.7 1.5 1 2.5 1s1.9-.3 2.5-1"/></svg>',
  },
  {
    name: 'bolt',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#3df2a6" stroke-width="1.8"><path d="M13 3 5 14h7l-1 7 8-11h-7l1-7Z"/></svg>',
  },
];

/** What the vendor hands over after a receipt checks out. */
export function deliver(sku: string) {
  if (sku === 'news-digest') {
    return {
      kind: 'news' as const,
      sku,
      city: 'Lagos',
      date: '2026-11-11',
      headline: 'Morning briefing',
      items: [
        {
          title: 'Testnet traffic is heavy before the hackathon deadline',
          blurb: 'Judges are browsing live demos. Keep receipts handy.',
        },
        { title: 'Lagos weather stays humid', blurb: 'High 32°C, late-day showers likely in the afternoon.' },
        { title: 'Local markets open on time', blurb: 'Computer Village and Balogun reported normal morning trade.' },
      ],
    };
  }
  if (sku === 'translate') {
    return {
      kind: 'translation' as const,
      sku,
      source: 'payment received',
      source_lang: 'en',
      translations: [
        { lang: 'yo', label: 'Yoruba', text: 'Owó ti wọlé' },
        { lang: 'fr', label: 'French', text: 'Paiement reçu' },
      ],
    };
  }
  if (sku === 'icon-pack') {
    return {
      kind: 'icons' as const,
      sku,
      title: 'Shield icon pack',
      license: 'demo, use freely in this project',
      icons: ICONS,
    };
  }
  if (sku === 'market-report') {
    return {
      kind: 'report' as const,
      sku,
      title: 'Lagos market snapshot',
      as_of: '2026-11-11',
      currency: 'NGN',
      figures: [
        { label: 'USD / NGN', value: '1,620', change: '+0.4%' },
        { label: 'NEAR / USD (demo)', value: '2.15', change: '-1.2%' },
        { label: 'Brent crude', value: '$78.40', change: '+0.8%' },
      ],
      note: 'Illustrative figures for the paid-demo payload, not live market data.',
    };
  }
  return forecast(sku === 'premium-annual' ? 'weather-pro' : sku);
}

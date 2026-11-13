import { OPEN_DATA_ID, VENDOR_ID } from '@/lib/config';
import { CATALOG, type CatalogItem } from './catalog';

// Every provider the agent can discover and pay. Each has its own payee account, its own catalog
// and its own 402 endpoint; both are run by this project, on separate accounts.

export const OPEN_DATA_CATALOG: CatalogItem[] = [
  {
    sku: 'fx-usd',
    price_near: '0.04',
    name: 'USD exchange rates',
    description: 'Today’s ECB reference rates against the US dollar, live from Frankfurter, JSON',
    payee: OPEN_DATA_ID,
  },
  {
    sku: 'air-lagos',
    price_near: '0.05',
    name: 'Lagos air quality now',
    description: 'PM2.5, PM10, ozone and US AQI for Lagos, live from Open-Meteo, JSON',
    payee: OPEN_DATA_ID,
  },
  {
    sku: 'quakes-today',
    price_near: '0.06',
    name: 'Earthquakes, past 24 h',
    description: 'Magnitude 4.5+ earthquakes worldwide in the last day, live from the USGS feed, JSON',
    payee: OPEN_DATA_ID,
  },
];

export type Provider = {
  id: 'skycast' | 'open-data';
  name: string;
  account: string;
  /** Path of the paid endpoint; the SKU is appended. */
  endpoint: string;
  catalogUrl: string;
  summary: string;
  items: CatalogItem[];
};

export const PROVIDERS: Provider[] = [
  {
    id: 'skycast',
    name: 'SkyCast',
    account: VENDOR_ID,
    endpoint: '/api/vendor',
    catalogUrl: '/api/vendor/catalog',
    summary: 'Weather, news, translation, icons and market reports. Sample data.',
    items: CATALOG,
  },
  {
    id: 'open-data',
    name: 'Open Data Desk',
    account: OPEN_DATA_ID,
    endpoint: '/api/open-data',
    catalogUrl: '/api/open-data',
    summary: 'Live public data: exchange rates, Lagos air quality and earthquakes, from free open APIs.',
    items: OPEN_DATA_CATALOG,
  },
];

export const ALL_ITEMS: CatalogItem[] = PROVIDERS.flatMap((p) => p.items);

export const findItem = (sku: string) => ALL_ITEMS.find((i) => i.sku === sku);
export const providerFor = (item: CatalogItem) => PROVIDERS.find((p) => p.account === item.payee)!;
export const providerByAccount = (account: string) => PROVIDERS.find((p) => p.account === account);
export const isProviderAccount = (account: string) => PROVIDERS.some((p) => p.account === account);

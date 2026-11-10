export const CATALOG = [
  { sku: 'weather-basic', price_near: '0.3', description: '7-day forecast for one city, JSON' },
  { sku: 'weather-pro', price_near: '0.8', description: 'Hourly forecast plus air quality, JSON' },
  { sku: 'premium-annual', price_near: '1.5', description: 'Unlimited forecasts for 12 months' },
];

export function forecast(sku: string) {
  const days = sku === 'weather-basic' ? 7 : 14;
  const start = Date.UTC(2026, 10, 11);
  return {
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

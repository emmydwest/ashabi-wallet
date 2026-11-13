import { CONTRACT_ID, FACTORY_ID, OPEN_DATA_ID } from '@/lib/config';
import { OPEN_DATA_CATALOG } from '@/vendor/providers';

export function GET() {
  return Response.json({
    provider: 'Open Data Desk',
    payee: OPEN_DATA_ID,
    accepts: { vault_contract: CONTRACT_ID, factory: FACTORY_ID },
    items: OPEN_DATA_CATALOG,
    how_to_pay: 'GET /api/open-data/<sku> for a 402 with a price and nonce, pay through your Ashabi wallet, then retry with X-NEAR-Receipt-Tx.',
    sources: ['Frankfurter (ECB rates)', 'Open-Meteo air quality', 'USGS earthquake feed'],
  });
}

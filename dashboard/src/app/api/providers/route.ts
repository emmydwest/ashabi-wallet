import { PROVIDERS } from '@/vendor/providers';

// Discovery: every provider an agent can pay, with its payee account, catalog and endpoint.
export function GET() {
  return Response.json({
    providers: PROVIDERS.map(({ id, name, account, endpoint, catalogUrl, summary, items }) => ({
      id,
      name,
      payee: account,
      endpoint: `${endpoint}/<sku>`,
      catalog: catalogUrl,
      summary,
      items: items.map(({ sku, name, price_near, description }) => ({ sku, name, price_near, description })),
    })),
  });
}

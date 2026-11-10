import { trapPageHtml } from '@/vendor/trap-page';

export function GET() {
  return new Response(trapPageHtml, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

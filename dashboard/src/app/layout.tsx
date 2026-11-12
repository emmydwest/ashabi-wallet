import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

const DESCRIPTION =
  'An AI agent with its own NEAR wallet that thinks and spends on pay-per-request APIs, but a NEAR contract decides what it can spend, so it can’t be talked into draining itself.';

export const metadata: Metadata = {
  metadataBase: new URL('https://ashabi-wallet.vercel.app'),
  title: { default: 'Ashabi Wallet', template: '%s · Ashabi Wallet' },
  description: DESCRIPTION,
  openGraph: { title: 'Ashabi Wallet', description: DESCRIPTION, siteName: 'Ashabi Wallet', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Ashabi Wallet', description: DESCRIPTION },
};

export const viewport: Viewport = { themeColor: '#000000', colorScheme: 'dark', viewportFit: 'cover' };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      style={{ colorScheme: 'dark' }}
      className={`${geistSans.variable} ${geistMono.variable} h-full max-w-full overflow-x-clip bg-ink antialiased`}
    >
      <body className="relative min-h-full max-w-full overflow-x-clip bg-ink">
        <div aria-hidden className="backdrop pointer-events-none fixed inset-0 -z-10" />
        <div aria-hidden className="grid-lines pointer-events-none fixed inset-x-0 top-0 -z-10 h-[40rem]" />
        <Providers>
          <SiteHeader />
          {children}
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

const DESCRIPTION =
  'Give your AI an allowance, not your bank password. Spending rules for AI agents, enforced by a NEAR smart contract.';

export const metadata: Metadata = {
  metadataBase: new URL('https://guardian-wallet.vercel.app'),
  title: { default: 'Guardian Wallet', template: '%s · Guardian Wallet' },
  description: DESCRIPTION,
  openGraph: { title: 'Guardian Wallet', description: DESCRIPTION, siteName: 'Guardian Wallet', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Guardian Wallet', description: DESCRIPTION },
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

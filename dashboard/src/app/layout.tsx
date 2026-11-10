import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Guardian Wallet',
  description:
    'Give AI the freedom to act. Never the freedom to overspend. On-chain spending policy for AI agents on NEAR.',
};

export const viewport: Viewport = { themeColor: '#06070b' };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="relative min-h-full">
        <div aria-hidden className="backdrop pointer-events-none fixed inset-0 -z-10" />
        <div aria-hidden className="grid-lines pointer-events-none fixed inset-x-0 top-0 -z-10 h-[40rem]" />
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { SITE_URL } from '../lib/constants';
import { QazaProvider } from '../hooks/useQazaStore';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'QazaTrack — Missed Salah & Ramadan Fast Debt Payoff Planner',
    template: '%s | QazaTrack',
  },
  description:
    'Calculate your missed Qaza prayers and Ramadan fasts, build a calm daily payoff plan, and track your spiritual progress offline with 100% privacy.',
  keywords: [
    'Qaza calculator',
    'missed prayer tracker',
    'Qaza namaz planner',
    'missed Ramadan fasts calculator',
    'Islamic prayer tracker',
    'QazaTrack',
  ],
  openGraph: {
    title: 'QazaTrack — Missed Salah & Ramadan Fast Debt Payoff Planner',
    description:
      'Calculate missed Qaza prayers and Ramadan fasts, build a calm daily payoff plan, and track spiritual progress privately offline.',
    siteName: 'QazaTrack',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'QazaTrack — Missed Salah & Ramadan Fast Debt Payoff Planner',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QazaTrack — Missed Salah & Ramadan Fast Debt Payoff Planner',
    description:
      'Calculate missed Qaza prayers and Ramadan fasts, build a calm daily payoff plan, and track spiritual progress privately offline.',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
};

const themeScript = `
  (() => {
    try {
      const theme = localStorage.getItem('qazatrack-theme');
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      document.documentElement.classList.remove('dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${plusJakartaSans.className} text-base`}>
        <QazaProvider>{children}</QazaProvider>
      </body>
    </html>
  );
}

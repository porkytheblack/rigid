import './globals.css';
import type { Metadata } from 'next';

const siteUrl = 'https://rigid.dterminal.net';

export const metadata: Metadata = {
  title: {
    default: 'Rigid - Sculpt Software with AI',
    template: '%s | Rigid',
  },
  description:
    'The human-in-the-loop toolkit for AI-built software. Explore what agents built, document what matters, and ship with confidence.',
  keywords: [
    'AI development',
    'code review',
    'software development',
    'AI tools',
    'developer tools',
    'human-in-the-loop',
    'code documentation',
    'screenshot annotation',
    'demo videos',
  ],
  authors: [{ name: 'Rigid' }],
  creator: 'Rigid',
  publisher: 'Rigid',
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Rigid',
    title: 'Rigid - Sculpt Software with AI',
    description:
      'The human-in-the-loop toolkit for AI-built software. Explore what agents built, document what matters, and ship with confidence.',
    images: [
      {
        url: '/brand/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Rigid - Sculpt Software with AI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rigid - Sculpt Software with AI',
    description:
      'The human-in-the-loop toolkit for AI-built software. Explore what agents built, document what matters, and ship with confidence.',
    images: ['/brand/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

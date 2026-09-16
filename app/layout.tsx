import type {Metadata} from 'next';
import React from 'react';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'iDotMatrix Animator',
  description: 'Create and export 32x32 pixel animations for iDotMatrix displays.',
  openGraph: {
    title: 'iDotMatrix Animator',
    description: 'Create and export 32x32 pixel animations for iDotMatrix displays.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'iDotMatrix Animator',
    description: 'Create and export 32x32 pixel animations for iDotMatrix displays.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

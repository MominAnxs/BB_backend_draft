import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import { LayoutShell } from '@/components/layout-shell';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: 'Brego Business — Backend',
  description: 'Employee-facing platform for Brego Business',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className={`${manrope.variable} font-sans min-h-screen bg-background antialiased`}>
        <LayoutShell>
          {children}
        </LayoutShell>
      </body>
    </html>
  );
}

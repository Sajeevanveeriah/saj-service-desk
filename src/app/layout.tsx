import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Saj Service Desk',
  description: 'A calm, practical service desk for technical work.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-AU"><body>{children}</body></html>;
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'happy birthday loraine & ren',
  description: 'A whole wall just for them.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

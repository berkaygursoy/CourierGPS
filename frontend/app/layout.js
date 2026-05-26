import { Instrument_Serif, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata = {
  title: 'CourierGPS',
  description: 'CourierGPS — control room for live courier dispatch',
};

export default function RootLayout({ children }) {
  const fontClasses = `${instrumentSerif.variable} ${plexSans.variable} ${plexMono.variable}`;
  return (
    <html lang="en" className={fontClasses}>
      <body className="h-screen overflow-hidden bg-canvas text-paper">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

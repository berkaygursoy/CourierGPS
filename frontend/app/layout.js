import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'Dispatch',
  description: 'Courier dispatch dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="h-screen bg-zinc-50 text-zinc-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

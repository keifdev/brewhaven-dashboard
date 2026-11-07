import { Inter, Poppins } from 'next/font/google';
import AppShell from '@/components/AppShell';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const poppins = Poppins({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-poppins' });

export const metadata = { title: 'BrewHaven Merchant', description: 'Merchant dashboard for BrewHaven coffee shops' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

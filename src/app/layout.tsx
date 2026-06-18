// app/layout.tsx
import './globals.css';
import { Inter, Sora } from 'next/font/google';
import AOSWrapper from "@/components/layout/AOSWrapper";
import SessionProviderWrapper from '@/components/providers/SessionProviderWrapper';

import { CartProvider } from '@/components/providers/CartProvider';
import ForceLightTheme from '@/components/layout/ForceLightTheme';
import MaintenanceBanner from '@/components/layout/MaintenanceBanner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

/** Display font for marketing headings (pairs with Inter body). */
const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
});

export const metadata = {
  title: 'Secure QR Code Contact System | Private & Smart QR Communication',
  description: 'Connect instantly with privacy-first QR codes. Enable masked calling, WhatsApp, and SMS without revealing personal numbers. Secure, smart, and scalable QR communication.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable} overflow-x-hidden`}>
      <body className="overflow-x-hidden bg-white text-gray-900 font-sans antialiased">
        <MaintenanceBanner />
        <ForceLightTheme />
        <SessionProviderWrapper>
          <CartProvider>
            <AOSWrapper />
            {children}
          </CartProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
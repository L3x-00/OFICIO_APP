import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/navbar';
import LayoutShell from '@/components/layout-shell';
import RevealProvider from '@/components/reveal-provider';
import WhatsAppButton from '@/components/whatsapp-button';
import { Toaster } from 'sonner';


export const metadata: Metadata = {
  title: 'OficioApp – Marketplace de servicios locales en Perú',
  description:
    'Conecta con profesionales y negocios verificados de tu ciudad. Reseñas con GPS, pagos con Yape y soporte local en todo el Perú.',
  keywords: ['servicios', 'profesionales', 'Perú', 'marketplace', 'Yape', 'OficioApp'],
  openGraph: {
    title: 'OficioApp – Marketplace de servicios locales',
    description:
      'Encuentra profesionales verificados en tu ciudad. Reseñas reales con GPS, pagos seguros con Yape.',
    type: 'website',
    locale: 'es_PE',
    siteName: 'OficioApp',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OficioApp',
    description: 'Marketplace de servicios locales en el Perú.',
  },
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { url: '/favicon.ico', sizes: 'any' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#FBF7EE',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className="min-h-screen flex flex-col bg-paper text-ink antialiased">
        <RevealProvider />
        <Navbar />
        <LayoutShell>{children}</LayoutShell>
        <Toaster
          position="bottom-right"
          theme="light"
          richColors
          closeButton
          duration={4000}
          toastOptions={{
            style: {
              background: '#FFFFFF',
              border: '1px solid #DDD4BF',
              color: '#14141C',
              boxShadow: '0 1px 2px rgba(28,22,8,0.04), 0 12px 32px -14px rgba(28,22,8,0.14)',
            },
            className: 'shadow-soft',
          }}
        />
        <WhatsAppButton />
      </body>
    </html>
  );
}

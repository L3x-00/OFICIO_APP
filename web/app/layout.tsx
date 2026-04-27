import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'OficioApp – Marketplace de servicios locales',
  description:
    'Conecta con profesionales y negocios de confianza en tu ciudad. Reseñas reales, pagos con Yape y soporte local en Perú.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col bg-bg-dark text-text-primary antialiased">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#15192B',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  );
}
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Sora } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/navbar';
import LayoutShell from '@/components/layout-shell';
import RevealProvider from '@/components/reveal-provider';
import WhatsAppButton from '@/components/whatsapp-button';
import ThemeProvider from '@/components/theme/theme-provider';
import { Toaster } from 'sonner';
import FloatingFaqButton from '@/components/floating-faq-button';
import AiChatWidget from '@/components/ai-chat-widget';
import FirstVisitModal from '@/components/modals/first-visit-modal';

// ── Nueva tipografía nativa (rendimiento óptimo) ──────────
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta', // Inyecta la variable CSS que usa Tailwind
});

const sora = Sora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sora', // Inyecta la variable CSS para títulos
});

export const metadata: Metadata = {
  metadataBase: new URL('https://oficioapp.org.pe'),
  title: 'Servi – Marketplace de servicios locales en Perú',
  description:
    'Conecta con profesionales y negocios verificados de tu ciudad. Reseñas validadas, pagos con Yape y soporte local en todo el Perú.',
  keywords: ['servicios', 'profesionales', 'Perú', 'marketplace', 'Yape', 'Servi'],
  manifest: '/site.webmanifest', // 👈 Aquí es donde va el manifest
  openGraph: {
    title: 'Servi – Marketplace de servicios locales',
    description:
      'Encuentra profesionales verificados en tu ciudad. Reseñas 100% reales y validadas, pagos seguros con Yape.',
    type: 'website',
    locale: 'es_PE',
    siteName: 'Servi',
    images: [
      {
        url: '/images/logo/servi.png',
        width: 512,
        height: 512,
        alt: 'Servi Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Servi',
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
  themeColor: '#E07B39', // Naranja Servi (antes azul oscuro)
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /* `suppressHydrationWarning` es lo que pide next-themes para que la
       primera pintura SSR (sin clase dark/light) no choque con la
       hidratación cliente (que sí la tiene). Sin él, React 19 marca
       hydration mismatch en producción y abandona el árbol. */
    <html lang="es" className={`${jakarta.variable} ${sora.variable}`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-dark-premium text-white antialiased font-sans">
        <ThemeProvider>
          <RevealProvider />
          <Navbar />
          <LayoutShell>{children}</LayoutShell>
          <Toaster
            position="bottom-right"
            theme="dark"
            richColors
            closeButton
            duration={4000}
            toastOptions={{
              style: {
                background: 'rgba(10, 14, 26, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
              },
              className: 'shadow-glass',
            }}
          />
          <WhatsAppButton />
          <FloatingFaqButton /> {/* 👈 Botón flotante de FAQ (izquierda) */}
          <AiChatWidget /> {/* 👈 Chatbot Ofi site-wide (FASE 4 #1) */}
          <FirstVisitModal /> {/* 👈 Popup de captación para visitantes (FASE 4 #3) */}
        </ThemeProvider>
      </body>
    </html>
  );
}

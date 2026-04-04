import './globals.css';
import { LayoutShell } from '@/components/layout-shell';
import { Toaster } from 'sonner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-bg-dark text-white antialiased">
        <LayoutShell>{children}</LayoutShell>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' },
          }}
        />
      </body>
    </html>
  );
}

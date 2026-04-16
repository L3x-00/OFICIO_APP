'use client';

import { usePathname } from 'next/navigation';
import './globals.css';
import { LayoutShell } from '@/components/layout-shell';
import { Toaster } from 'sonner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Verificamos si la ruta actual es el login
  const isLoginPage = pathname === '/login';

  return (
    <html lang="es">
      <body className="bg-bg-dark text-white antialiased">
        {/* Si estamos en el login, renderizamos los children directamente.
            Si no, cargamos el LayoutShell que contiene el Sidebar y la protección.
        */}
        {isLoginPage ? (
          <main>{children}</main>
        ) : (
          <LayoutShell>{children}</LayoutShell>
        )}

        <Toaster
          position="top-right"
          toastOptions={{
            style: { 
              background: '#1a1a1a', 
              border: '1px solid rgba(255,255,255,0.1)', 
              color: '#fff' 
            },
          }}
        />
      </body>
    </html>
  );
}
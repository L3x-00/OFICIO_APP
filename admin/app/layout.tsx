'use client';

import { usePathname } from 'next/navigation';
import './globals.css';
import { LayoutShell } from '@/components/layout-shell';
import { Toaster } from 'sonner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Páginas que NO usan el LayoutShell del admin: login y los perfiles
  // públicos `/p/:slug` (Vanity URLs). Estas últimas son tarjetas
  // standalone con sus propios meta tags y look — no deben heredar la
  // sidebar/topbar del panel admin.
  const isLoginPage  = pathname === '/login';
  const isPublicPage = pathname?.startsWith('/p/');

  return (
    <html lang="es">
      <body className="bg-bg-dark text-white antialiased">
        {/* Si estamos en el login o en perfil público, renderizamos children
            directamente. Si no, cargamos el LayoutShell con Sidebar +
            protección.
        */}
        {(isLoginPage || isPublicPage) ? (
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
// admin/app/layout.tsx
import './globals.css';
import { Sidebar } from '@/components/sidebar';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-bg-dark text-white antialiased">
        <div className="flex min-h-screen overflow-hidden">
          {/* Sidebar fijo */}
          <div className="w-64 fixed inset-y-0 left-0 z-50">
            <Sidebar />
          </div>
          
          {/* Contenido principal con margen para no chocar con el sidebar */}
          <main className="flex-1 ml-64 p-8 min-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
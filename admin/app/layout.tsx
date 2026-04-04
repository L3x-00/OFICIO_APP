import './globals.css';
import { LayoutShell } from '@/components/layout-shell';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-bg-dark text-white antialiased">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}

'use client';

import { Toaster } from 'sonner';
import { useTheme } from 'next-themes';

/**
 * Toaster (sonner) que respeta el tema activo. Antes el `<Toaster>` del layout
 * estaba fijo en `theme="dark"` con un fondo oscuro glass → en modo claro los
 * toasts (la superficie de "avisos" del sitio) chocaban con el tema cálido.
 * Aquí leemos el tema resuelto de next-themes y aplicamos estilo por tema,
 * conservando el look glass de marca en ambos.
 */
export default function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';

  return (
    <Toaster
      position="bottom-right"
      theme={isDark ? 'dark' : 'light'}
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        style: isDark
          ? {
              background: 'rgba(10, 14, 26, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#FFFFFF',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
            }
          : {
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(20, 20, 28, 0.08)',
              color: '#14141C',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
            },
        className: 'shadow-glass',
      }}
    />
  );
}

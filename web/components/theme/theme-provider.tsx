'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

/**
 * Wrapper de `next-themes` para Servi. Envuelve toda la app (landing
 * + panel + cliente + login). Detalles:
 *
 *   • `attribute="class"` — agrega `dark` / `light` como clase del
 *     <html>. Las reglas CSS de override viven en `globals.css`.
 *   • `defaultTheme="dark"` — el sitio actualmente es dark by default.
 *     Cualquier user sin preferencia guardada ve el theme que ya
 *     conocía. Cero cambio para usuarios existentes.
 *   • `enableSystem` — respeta `prefers-color-scheme` del SO si el
 *     user nunca tocó el switch.
 *   • `disableTransitionOnChange` — evita el FOUC de transitions
 *     simultáneas en cientos de elementos al swap.
 */
export default function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

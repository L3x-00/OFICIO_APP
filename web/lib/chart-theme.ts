'use client';

import { useTheme } from 'next-themes';

/**
 * Colores de ejes / grid / tooltip para los charts (recharts) según el tema.
 *
 * recharts pinta con props y estilos **inline** sobre SVG → la inversión
 * global de `globals.css` (`html.light`) NO lo alcanza (igual que los toasts
 * de sonner). En modo claro los ejes quedaban blancos-sobre-blanco (invisibles)
 * y el tooltip salía oscuro. Este hook resuelve el tema real de next-themes y
 * devuelve valores legibles en claro y oscuro. Los colores de marca de las
 * series (terracota/cian) se mantienen: contrastan en ambos fondos.
 */
export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';

  return {
    isDark,
    axis: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(20,20,28,0.45)',
    grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(20,20,28,0.08)',
    tooltip: {
      backgroundColor: isDark ? 'rgba(10,14,26,0.95)' : 'rgba(255,255,255,0.97)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: isDark
        ? '1px solid rgba(255,255,255,0.1)'
        : '1px solid rgba(20,20,28,0.1)',
      borderRadius: '12px',
      boxShadow: isDark
        ? '0 8px 32px 0 rgba(5,6,15,0.5)'
        : '0 8px 32px -8px rgba(28,22,8,0.18)',
      color: isDark ? '#fff' : '#14141C',
    } as const,
    tooltipLabel: {
      color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(20,20,28,0.55)',
      fontWeight: 'bold' as const,
      marginBottom: '4px',
    },
    cursorStroke: isDark ? 'rgba(224,123,57,0.3)' : 'rgba(224,123,57,0.45)',
    cursorFill: isDark ? 'rgba(224,123,57,0.06)' : 'rgba(224,123,57,0.08)',
  };
}

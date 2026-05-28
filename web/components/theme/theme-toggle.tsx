'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';

/**
 * Botón ícono sol/luna para alternar entre light y dark globalmente.
 *
 * Pensado para vivir en el navbar antes del CTA "Acceder". Su tamaño
 * matchea con los demás botones-icono del navbar para no romper la
 * alineación.
 *
 * `useTheme` puede devolver `theme="system"` — para el render del
 * ícono usamos `resolvedTheme` (el valor REAL que está aplicado,
 * ya sea por preferencia explícita o por SO).
 *
 * Anti-hydration mismatch: `useTheme` lee localStorage en client; en
 * server siempre cae al default. Renderizamos un placeholder neutro
 * (mismo tamaño, sin ícono) hasta que el componente esté `mounted`,
 * para que el árbol JSX server↔client sea idéntico.
 */
export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';

  function toggle() {
    setTheme(isDark ? 'light' : 'dark');
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Activar tema claro' : 'Activar tema oscuro'}
      title={isDark ? 'Cambiar a claro' : 'Cambiar a oscuro'}
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-xl
                 border border-white/10 text-white/70 hover:text-white
                 hover:border-primary/30 hover:bg-white/[0.04]
                 dark:border-white/10
                 light:border-black/10 light:text-ink-2 light:hover:text-ink
                 transition-colors duration-200"
    >
      {/* Crossfade entre íconos. `mounted` falso → placeholder vacío
          para que server y client coincidan en estructura. */}
      <AnimatePresence mode="wait" initial={false}>
        {mounted && (
          <motion.span
            key={isDark ? 'moon' : 'sun'}
            initial={{ opacity: 0, rotate: -90, scale: 0.7 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.7 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="flex items-center justify-center"
          >
            {isDark ? <Moon size={17} /> : <Sun size={17} />}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

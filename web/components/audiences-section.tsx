'use client';

/**
 * Carrusel "Para Proveedores ↔ Para Clientes".
 *
 * Muestra ambas secciones en el mismo bloque con un conmutador de pestañas y
 * auto-rotación. Cumpliendo la regla de accesibilidad `auto-rotation-controls`
 * (WAI): la rotación se PAUSA al pasar el cursor, al enfocar con teclado y
 * cuando la sección no está en viewport, se DETIENE al elegir una pestaña, y
 * se desactiva por completo con `prefers-reduced-motion`.
 */

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Briefcase, Users } from 'lucide-react';
import ProvidersSection from './providers-section';
import ClientsSection from './clients-section';

// Intervalo de auto-avance. Un valor bajo (p. ej. 2000) hace la sección casi
// ilegible; se usa uno cómodo y la interacción del usuario lo detiene.
const ROTATE_MS = 7000;

const TABS = [
  { key: 'proveedores', label: 'Para Proveedores', icon: Briefcase },
  { key: 'clientes', label: 'Para Clientes', icon: Users },
] as const;

export default function AudiencesSection() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [userLocked, setUserLocked] = useState(false);
  const reduce = useReducedMotion();
  const hostRef = useRef<HTMLDivElement | null>(null);

  // Pausar cuando la sección no está en pantalla.
  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Auto-rotación (respeta pausa, foco, viewport, elección del usuario y reduced-motion).
  useEffect(() => {
    if (paused || reduce || userLocked || !inView) return;
    const id = setInterval(() => setActive((a) => (a + 1) % TABS.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, reduce, userLocked, inView]);

  const select = (i: number) => { setActive(i); setUserLocked(true); };

  return (
    <div
      ref={hostRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!hostRef.current?.contains(e.relatedTarget as Node)) setPaused(false);
      }}
      className="relative bg-background dark:bg-dark-surface"
      aria-roledescription="carrusel"
      aria-label="Servi para proveedores y para clientes"
    >
      {/* ═══ Conmutador de pestañas ═══ */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 pt-16 sm:pt-20">
        <div className="flex justify-center">
          <div
            className="relative inline-flex items-center gap-1 p-1 rounded-full bg-card border border-border shadow-sm"
            role="tablist"
            aria-label="Elegir audiencia"
          >
            {TABS.map((t, i) => {
              const Icon = t.icon;
              const on = i === active;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={on}
                  onClick={() => select(i)}
                  className={`relative z-10 inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-full text-sm font-semibold transition-colors ${
                    on ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {on && (
                    <motion.span
                      layoutId="aud-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-primary"
                      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <Icon size={16} aria-hidden />
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{i === 0 ? 'Proveedores' : 'Clientes'}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Indicadores (también controlan la selección) */}
        <div className="flex items-center justify-center gap-1.5 mt-3.5">
          {TABS.map((t, i) => (
            <button
              key={t.key}
              onClick={() => select(i)}
              aria-label={`Mostrar ${t.label}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active ? 'w-7 bg-primary' : 'w-1.5 bg-border hover:bg-muted-foreground/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ═══ Contenido rotativo ═══ */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          initial={{ opacity: 0, y: reduce ? 0 : 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduce ? 0 : -14 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {active === 0 ? <ProvidersSection embedded /> : <ClientsSection embedded />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

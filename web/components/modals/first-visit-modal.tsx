'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogIn, Sparkles } from 'lucide-react';
import { isAuthenticated } from '@/lib/auth';

const STORAGE_KEY = 'oficio_visit_popup_seen';
// Rutas donde NO tiene sentido el popup de captación (panel, login, perfil).
const HIDDEN_PREFIXES = ['/panel', '/cliente', '/login', '/p/', '/payments'];

/**
 * Popup de captación para visitantes nuevos (FASE 4 #3).
 *
 * Modal oscuro que invita a iniciar sesión / registrarse. Se muestra UNA vez
 * por navegador (persistido en localStorage) y solo a visitantes no
 * autenticados fuera del panel. No se vuelve a mostrar tras descartarlo.
 */
export default function FirstVisitModal() {
  const pathname = usePathname();
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) return;
    if (HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))) return;
    let seen = false;
    try {
      seen = localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      /* storage no disponible */
    }
    if (seen) return;
    // Pequeño delay para no interrumpir el primer paint.
    const t = setTimeout(() => setShow(true), 1400);
    return () => clearTimeout(t);
  }, [pathname]);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  const goLogin = () => {
    dismiss();
    router.push('/login');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={dismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md glass-card rounded-2xl border border-white/10 p-7 text-center shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
          >
            <button
              onClick={dismiss}
              aria-label="Cerrar"
              className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/[0.05] border border-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>

            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-4">
              <Sparkles className="text-primary" />
            </div>

            <h2 className="font-display text-xl font-bold text-white">
              Inicia sesión o regístrate
            </h2>
            <p className="text-white/55 text-sm mt-2 leading-relaxed">
              Accede a tu panel, guarda tus favoritos y contacta proveedores
              verificados en tu ciudad.
            </p>

            <div className="flex flex-col gap-2.5 mt-6">
              <button
                onClick={goLogin}
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
              >
                <LogIn size={16} /> Iniciar sesión / Registrarme
              </button>
              <button
                onClick={dismiss}
                className="text-white/45 hover:text-white text-[13px] py-1 transition-colors"
              >
                Seguir explorando
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

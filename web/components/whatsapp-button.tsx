'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

const WHATSAPP_URL = 'https://wa.link/5d7yqt';

export default function WhatsAppButton() {
  const pathname = usePathname();
  const [showTooltip, setShowTooltip] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Ocultar en panel/cliente (UX interna) y en vanity URLs `/p/*`
  const isHidden = 
    pathname?.startsWith('/panel') || 
    pathname?.startsWith('/cliente') || 
    pathname?.startsWith('/p/');

  // Lógica del tooltip automático cada 3 segundos
  useEffect(() => {
    if (isHidden) return;

    const interval = setInterval(() => {
      if (!isHovering) { 
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 4000); // Se oculta a los 4s
      }
    }, 3000); // Aparece cada 3s

    return () => clearInterval(interval);
  }, [isHidden, isHovering]);

  if (isHidden) return null;

  return (
    <motion.div
      className="fixed bottom-36 right-4 sm:bottom-24 sm:right-6 z-[99999]"
      onMouseEnter={() => { setIsHovering(true); setShowTooltip(false); }}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Globo de Chat / Tooltip Automático */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.9 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap pointer-events-none"
          >
            <div className="relative glass rounded-xl p-3 border border-emerald-500/20 shadow-glow-sm">
              <p className="text-white/90 text-xs font-display font-medium">
                Recibe información personalizada
              </p>
              {/* Flecha del globo apuntando a la derecha (hacia el botón) */}
              <div className="absolute right-0 top-1/2 translate-x-1 -translate-y-1/2 w-2 h-2 glass border-r-0 border-t border-b border-emerald-500/20 -rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón principal de WhatsApp mejorado */}
      <motion.a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chatea con nosotros por WhatsApp"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 1.2 }}
        // Mejoramos el fondo usando glass en vez de bg-dark-surface opaco
        className="flex items-center justify-center w-14 h-14 rounded-full glass border border-emerald-500/30 shadow-[0_0_20px_rgba(37,211,102,0.3)] hover:border-emerald-500/60 hover:shadow-[0_0_30px_rgba(37,211,102,0.5)] transition-all duration-300 group active:scale-95"
      >
        <img
          src="/images/social/whatsapp.svg"
          alt="WhatsApp"
          className="w-7 h-7 object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-300"
        />
        
        {/* Pulso animado elegante (anillo expansivo) */}
        <span className="absolute inset-0 rounded-full border border-emerald-500/40 animate-ping opacity-25" />
      </motion.a>
    </motion.div>
  );
}
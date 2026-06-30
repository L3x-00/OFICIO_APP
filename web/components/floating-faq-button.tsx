'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import FaqModal from '@/components/modals/faq-modal';

export default function FloatingFaqButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const pathname = usePathname();

  // Ocultar en el panel de proveedor / cliente / vanity URLs
  const isHidden = pathname?.startsWith('/panel') || pathname?.startsWith('/cliente') || pathname?.startsWith('/p/');

  // Lógica del tooltip automático cada 3 segundos
  useEffect(() => {
    if (isHidden) return; // No ejecutar si el botón está oculto

    const interval = setInterval(() => {
      if (!isHovering && !isOpen) { // Solo mostrar si el usuario no está interactuando
        setShowTooltip(true);
        // Ocultar el globo después de 4 segundos
        setTimeout(() => setShowTooltip(false), 4000);
      }
    }, 3000); // 3000ms = 3 segundos

    return () => clearInterval(interval); // Limpiar el temporizador al desmontar
  }, [isHidden, isHovering, isOpen]);

  if (isHidden) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const, delay: 1 }}
        className="fixed left-4 top-1/2 -translate-y-1/2 z-40 group"
        onMouseEnter={() => { setIsHovering(true); setShowTooltip(false); }}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Globo de Chat / Tooltip */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, x: -10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.9 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap pointer-events-none"
            >
              <div className="relative glass rounded-xl p-3 border border-white/10 shadow-glow-sm">
                <p className="text-white/90 text-xs font-display font-medium">
                  Ver preguntas frecuentes
                </p>
                {/* Flecha del globo apuntando a la izquierda */}
                <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 glass border-l-0 border-t border-b border-white/10 rotate-45" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botón principal (el que hicimos premium) */}
        <button
          onClick={() => { setIsOpen(true); setShowTooltip(false); }}
          className="flex items-center rounded-full p-3.5 glass shadow-glow-sm border border-white/10 group-hover:shadow-glow-md group-hover:border-primary/30 transition-all duration-300 cursor-pointer"
          aria-label="Preguntas frecuentes"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.75" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-white/60 group-hover:text-primary-light transition-colors duration-300 flex-shrink-0"
          >
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <path d="M12 17h.01"/>
          </svg>

          {/* Expansión hover "FAQ" */}
          <span className="max-w-0 opacity-0 group-hover:max-w-[60px] group-hover:opacity-100 group-hover:ml-2.5 transition-all duration-300 ease-out text-sm font-display font-semibold whitespace-nowrap overflow-hidden">
            <span className="bg-gradient-to-r from-white/80 to-white/60 group-hover:from-primary-light group-hover:to-primary bg-clip-text text-transparent">
              FAQ
            </span>
          </span>
        </button>
      </motion.div>

      <FaqModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
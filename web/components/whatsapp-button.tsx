'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

const WHATSAPP_URL = 'https://wa.link/5d7yqt';

export default function WhatsAppButton() {
  const pathname = usePathname();
  // Ocultar en panel/cliente (UX interna) y en vanity URLs `/p/*` — la
  // tarjeta pública tiene sus propios CTAs hacia el proveedor.
  if (
    pathname?.startsWith('/panel')
    || pathname?.startsWith('/cliente')
    || pathname?.startsWith('/p/')
  ) {
    return null;
  }

  return (
    <motion.a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chatea con nosotros por WhatsApp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 1.2 }}
      className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[99999] w-14 h-14 rounded-full flex items-center justify-center group active:scale-95 bg-dark-surface/80 backdrop-blur-xl border border-[#25D366]/40 shadow-[0_0_20px_rgba(37,211,102,0.3)] hover:border-[#25D366]/80 hover:shadow-[0_0_30px_rgba(37,211,102,0.5)] transition-all duration-300"
    >
      <img
        src="/images/social/whatsapp.svg"
        alt="WhatsApp"
        className="w-7 h-7 object-contain"
      />
      
      {/* Tooltip Glassmorphism */}
      <span className="absolute right-16 glass text-white/80 text-[12px] font-display font-medium px-3 py-1.5 rounded-lg shadow-glass border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
        ¿Necesitas ayuda?
      </span>
      
      {/* Pulso animado elegante (anillo expansivo) */}
      <span className="absolute inset-0 rounded-full border border-[#25D366]/50 animate-ping opacity-30" />
    </motion.a>
  );
}
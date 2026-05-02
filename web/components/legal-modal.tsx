'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export default function LegalModal({ isOpen, onClose, title, content }: Props) {
  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Cerrar con tecla Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay oscuro */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel deslizante desde abajo */}
      <div className="absolute bottom-0 left-0 right-0 bg-bg-card rounded-t-3xl max-h-[85vh] flex flex-col animate-slide-up shadow-2xl border-t border-white/10">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
          <h2 className="text-lg font-bold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-white/5 flex items-center justify-center text-text-muted hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="prose prose-sm prose-invert max-w-none text-text-secondary leading-relaxed whitespace-pre-line text-sm">
            {content}
          </div>
        </div>

        {/* Botón inferior */}
        <div className="px-6 py-4 border-t border-white/5 flex-shrink-0">
          <button
            onClick={onClose}
            className="btn-primary press-effect w-full py-3 rounded-xl font-semibold text-sm"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
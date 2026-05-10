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
      <div
        className="absolute inset-0 bg-ink/55 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute bottom-0 left-0 right-0 bg-paper rounded-t-3xl max-h-[85vh] flex flex-col animate-slide-up shadow-soft-lg border-t border-line">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line flex-shrink-0">
          <h2 className="font-display font-semibold text-ink text-[18px] tracking-tightest">{title}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-surface-2 flex items-center justify-center text-ink-4 hover:text-ink transition-colors"
            aria-label="Cerrar"
          >
            <X size={19} strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-none text-ink-2 leading-relaxed whitespace-pre-line text-[14px]">
            {content}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-line flex-shrink-0">
          <button
            onClick={onClose}
            className="btn btn-ink press-effect w-full"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
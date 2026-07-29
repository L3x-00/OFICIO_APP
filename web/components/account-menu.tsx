'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ChevronDown,
  FileText,
  Globe,
  HelpCircle,
  LogOut,
  Shield,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { clearSession, getUser } from '@/lib/auth';
import { disconnectSocket } from '@/lib/socket';
import { useProfileTypeOptional } from '@/lib/profile-type-context';
import LegalModal from '@/components/modals/legal-modal';
import { TERMS_CONTENT, PRIVACY_CONTENT } from '@/components/modals/legal-content';

const HELP_CONTENT =
  'Centro de ayuda de Servi. Si tienes dudas, contáctanos en soporteofiapp@gmail.com o visita nuestras redes sociales. (Texto pendiente de completar)';

const dropdownVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -8,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
  },
};

/**
 * Menú de cuenta único: reemplaza los "Cerrar sesión" duplicados del
 * sidebar y de Ajustes, y concentra lo que antes vivía en Ajustes
 * (legales, ayuda, reportar un problema). Se usa tanto en /panel como en
 * /cliente. `hasProvider` es explícito para /cliente (no tiene
 * ProfileTypeProvider); dentro de /panel se resuelve solo desde el context.
 */
export function AccountMenu({
  hasProvider,
  compact = false,
}: {
  hasProvider?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const user = getUser();
  const profileCtx = useProfileTypeOptional();
  const canReport = hasProvider ?? profileCtx?.status?.hasProvider ?? false;

  const [open, setOpen] = useState(false);
  const [legalModal, setLegalModal] = useState<{ open: boolean; title: string; content: string }>({
    open: false,
    title: '',
    content: '',
  });
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;

  const initials = `${user.firstName?.charAt(0) ?? ''}${user.lastName?.charAt(0) ?? ''}`.toUpperCase();

  const openLegal = (title: string, content: string) => {
    setLegalModal({ open: true, title, content });
    setOpen(false);
  };

  const handleLogout = () => {
    disconnectSocket();
    clearSession();
    router.push('/login');
  };

  const submitReport = async () => {
    if (reportText.trim().length < 5) {
      toast.error('Describe el problema con al menos 5 caracteres');
      return;
    }
    try {
      await apiFetch('/providers/report-issue', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, description: reportText }),
      });
      toast.success('Reporte enviado. ¡Gracias por tu ayuda!');
      setReportOpen(false);
      setReportText('');
    } catch {
      toast.error('Error al enviar el reporte');
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 bg-white/[0.04] border border-white/10 hover:border-primary/30 px-2.5 py-1.5 rounded-full transition-all duration-200 hover:shadow-glow-sm"
        aria-haspopup
        aria-expanded={open}
      >
        {user.avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={user.avatarUrl}
            alt={user.firstName}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/30 flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-glow-sm">
            {initials}
          </div>
        )}
        {!compact && (
          <span className="hidden sm:inline text-white text-sm font-semibold font-display">
            {user.firstName}
          </span>
        )}
        <ChevronDown
          size={14}
          className={`text-white/40 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute right-0 top-full mt-2 w-64 glass-card rounded-xl py-1.5 z-50 shadow-glow-lg border border-white/10 overflow-hidden"
          >
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Globe size={16} className="text-primary-light" />
              Volver a la web
            </Link>
            <button
              onClick={() => openLegal('Términos y Condiciones', TERMS_CONTENT)}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[14px] font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              <FileText size={16} className="text-white/50" />
              Términos y Condiciones
            </button>
            <button
              onClick={() => openLegal('Política de Privacidad', PRIVACY_CONTENT)}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[14px] font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Shield size={16} className="text-accent" />
              Política de Privacidad
            </button>
            <button
              onClick={() => openLegal('Ayuda', HELP_CONTENT)}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[14px] font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              <HelpCircle size={16} className="text-primary-light" />
              Ayuda
            </button>
            {canReport && (
              <button
                onClick={() => {
                  setReportOpen(true);
                  setOpen(false);
                }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[14px] font-medium text-amber/80 hover:text-amber hover:bg-white/5 transition-colors"
              >
                <AlertTriangle size={16} className="text-amber" />
                Reportar un problema
              </button>
            )}
            <div className="border-t border-white/5 my-1" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[14px] font-medium text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <LegalModal
        isOpen={legalModal.open}
        onClose={() => setLegalModal((s) => ({ ...s, open: false }))}
        title={legalModal.title}
        content={legalModal.content}
      />

      <AnimatePresence>
        {reportOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setReportOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="relative glass rounded-2xl p-6 w-full max-w-md shadow-glow-lg"
            >
              <h2 className="text-lg font-bold text-white font-display mb-4">Reportar un problema</h2>
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                rows={5}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none mb-4"
                placeholder="Describe el problema que encontraste..."
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setReportOpen(false)}
                  className="btn btn-ghost press-effect px-4 py-2 text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitReport}
                  className="btn btn-primary press-effect px-6 py-2 text-sm"
                >
                  Enviar reporte
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

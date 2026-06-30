'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, CalendarDays, X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { PublicUserProfile } from '@/lib/types';

/**
 * Modal con el perfil público mínimo de un usuario. Por seguridad solo
 * muestra primer nombre, primer apellido, avatar y fecha de registro — lo
 * ve el proveedor al tocar la foto del usuario en una reseña o chat.
 *
 * `seedName` / `seedAvatarUrl` (que ya vienen en el payload de reseña/chat)
 * se pintan al instante mientras se resuelve la fecha de registro; si la red
 * falla, el seed se mantiene.
 */
function formatMemberSince(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Miembro desde ${d.toLocaleDateString('es-PE', {
    month: 'long',
    year: 'numeric',
  })}`;
}

function UserProfileModal({
  open,
  onClose,
  userId,
  seedName,
  seedAvatarUrl,
}: {
  open: boolean;
  onClose: () => void;
  userId: number;
  seedName?: string;
  seedAvatarUrl?: string | null;
}) {
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setProfile(null);
    api
      .getPublicUserProfile(userId)
      .then((p) => {
        if (alive) setProfile(p);
      })
      .catch(() => {
        // 401 / sin red: conservamos el seed, ocultamos la fecha.
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, userId]);

  // Cerrar con Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const name =
    (profile ? `${profile.firstName} ${profile.lastName}`.trim() : '') ||
    seedName?.trim() ||
    'Usuario';
  const avatar = profile?.avatarUrl ?? seedAvatarUrl ?? null;
  const initial = (name[0] ?? '?').toUpperCase();
  const since = profile?.createdAt ? formatMemberSince(profile.createdAt) : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xs rounded-2xl border border-white/10 bg-dark-surface p-6 text-center shadow-2xl"
          >
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute right-3 top-3 p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/5"
            >
              <X size={18} />
            </button>

            {/* Avatar */}
            <div className="mx-auto w-20 h-20 rounded-full overflow-hidden ring-2 ring-primary/30 bg-gradient-primary flex items-center justify-center text-white text-2xl font-bold">
              {avatar ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatar}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                initial
              )}
            </div>

            {/* Nombre */}
            <h2 className="mt-4 text-white font-display font-semibold text-lg break-words">
              {name}
            </h2>

            {/* Fecha de registro */}
            <div className="mt-1.5 min-h-[20px] flex items-center justify-center gap-1.5 text-white/60 text-[13px]">
              {loading ? (
                <Loader2 size={14} className="animate-spin text-primary" />
              ) : since ? (
                <>
                  <CalendarDays size={14} className="text-white/40" />
                  <span>{since}</span>
                </>
              ) : null}
            </div>

            {/* Nota de privacidad */}
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-left">
              <Lock size={15} className="mt-0.5 flex-shrink-0 text-primary" />
              <p className="text-white/50 text-[12px] leading-relaxed">
                Por seguridad solo se muestra información básica del usuario.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Avatar clickable que abre el [UserProfileModal] del usuario. Reemplaza el
 * markup de avatar existente en reseñas/chat. `className` controla el tamaño
 * y forma del botón; el contenido (img o inicial) se renderiza adentro.
 */
export function UserAvatarButton({
  userId,
  name,
  avatarUrl,
  className = '',
  title = 'Ver perfil',
}: {
  userId: number;
  name?: string;
  avatarUrl?: string | null;
  className?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={title}
        aria-label={name ? `Ver perfil de ${name}` : 'Ver perfil'}
        className={`${className} cursor-pointer transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60`}
      >
        {avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={avatarUrl}
            alt={name ?? ''}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          initial
        )}
      </button>
      <UserProfileModal
        open={open}
        onClose={() => setOpen(false)}
        userId={userId}
        seedName={name}
        seedAvatarUrl={avatarUrl}
      />
    </>
  );
}

export default UserProfileModal;

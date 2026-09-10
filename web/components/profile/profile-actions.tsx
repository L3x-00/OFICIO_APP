'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Phone, MessageCircle, Heart, Copy, Check, X, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getUser, isAuthenticated, isSessionExpired } from '@/lib/auth';
import { trackProviderEvent, getCoordsIfGranted, type ClientCoords } from '@/lib/track';
import ProfileChatPanel from './profile-chat-panel';

interface Props {
  providerId: number;
  slug: string;
  businessName: string;
  phone: string | null;
  whatsapp: string | null;
}

/** Acción que quedó pendiente por falta de sesión (se nombra en el modal). */
type Gate = 'favorito' | 'chat' | null;

const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 press-effect disabled:opacity-60';

export default function ProfileActions({
  providerId,
  slug,
  businessName,
  phone,
  whatsapp,
}: Props) {
  const [authed, setAuthed] = useState(false);
  const [gate, setGate] = useState<Gate>(null);
  const [showPhone, setShowPhone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fav, setFav] = useState(false);
  const [favBusy, setFavBusy] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  /* Coords del cliente (solo si ya concedió geolocalización) para etiquetar
     los eventos con distancia; y guarda de "vista ya registrada" (evita el
     doble disparo del StrictMode en dev). */
  const coordsRef = useRef<ClientCoords | null>(null);
  const viewedRef = useRef(false);

  /* Sesión real (no solo "quedó un token viejo"): mismo criterio que el
     navbar — si expiró por inactividad, cuenta como no autenticado. */
  useEffect(() => {
    setAuthed(isAuthenticated() && !isSessionExpired());
  }, []);

  /* Telemetría: registra la VISTA de la ficha (una vez) y precarga las coords
     del cliente para los clics de contacto. Best-effort, público, sin sesión. */
  useEffect(() => {
    if (viewedRef.current) return;
    if (!Number.isInteger(providerId) || providerId <= 0) return;
    viewedRef.current = true;
    void getCoordsIfGranted().then((c) => {
      coordsRef.current = c;
      trackProviderEvent(providerId, 'view', c);
    });
  }, [providerId]);

  /* Estado inicial del corazón: el backend no expone "¿es favorito?" por
     proveedor, así que se resuelve contra la lista del usuario. */
  useEffect(() => {
    if (!authed || !Number.isInteger(providerId) || providerId <= 0) return;
    let alive = true;
    void api.getFavorites().then((list) => {
      if (alive) setFav(list.some((f) => f.id === providerId));
    });
    return () => {
      alive = false;
    };
  }, [authed, providerId]);

  const requireSession = useCallback(
    (action: Exclude<Gate, null>) => {
      if (authed) return true;
      setGate(action);
      return false;
    },
    [authed],
  );

  const toggleFav = async () => {
    if (!requireSession('favorito') || favBusy) return;
    const next = !fav;
    setFav(next); // optimista
    setFavBusy(true);
    try {
      await api.toggleFavorite(providerId);
      toast.success(next ? 'Guardado en favoritos' : 'Quitado de favoritos');
    } catch {
      setFav(!next); // revertir
      toast.error('No se pudo actualizar tus favoritos');
    } finally {
      setFavBusy(false);
    }
  };

  const copyPhone = async () => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('No se pudo copiar el número');
    }
  };

  const whatsappUrl = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '')}` : null;

  /* Chat y favorito necesitan el id numérico del provider. `GET /profiles/:slug`
     empezó a mandarlo con este cambio: si Vercel publica antes que Render,
     llega `undefined` — en ese hueco se ocultan esos dos botones en vez de
     mostrar acciones que fallarían al pulsarlas. */
  const canAct = Number.isInteger(providerId) && providerId > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        {phone && (
          <button
            type="button"
            onClick={() => {
              // Al ABRIR (no al ocultar) se registra la intención de llamada.
              if (!showPhone) trackProviderEvent(providerId, 'call_click', coordsRef.current);
              setShowPhone((v) => !v);
            }}
            aria-expanded={showPhone}
            className={`${btnBase} bg-primary text-white px-4 py-2.5 hover:bg-primary/90 shadow-lg shadow-primary/20`}
          >
            <Phone size={15} />
            {showPhone ? 'Ocultar número' : 'Llamar'}
          </button>
        )}

        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackProviderEvent(providerId, 'whatsapp_click', coordsRef.current)}
            className={`${btnBase} bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 px-4 py-2.5 hover:bg-emerald-500/20`}
          >
            <Image
              src="/images/social/whatsapp.svg"
              alt=""
              width={16}
              height={16}
              className="shrink-0"
            />
            WhatsApp
          </a>
        )}

        {canAct && (
          <button
            type="button"
            onClick={() => {
              if (requireSession('chat')) setChatOpen(true);
            }}
            className={`${btnBase} bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-white/85 border border-gray-200 dark:border-white/10 px-4 py-2.5 hover:border-primary/40 hover:text-primary dark:hover:text-primary-light`}
          >
            <MessageCircle size={15} />
            Chatear
          </button>
        )}

        {canAct && (
        <motion.button
          type="button"
          onClick={toggleFav}
          disabled={favBusy}
          whileTap={{ scale: 0.86 }}
          aria-pressed={fav}
          aria-label={fav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
          title={fav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
          className={`${btnBase} w-11 h-11 border ${
            fav
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
              : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/60 hover:text-rose-500 hover:border-rose-500/30'
          }`}
        >
          <motion.span
            key={fav ? 'on' : 'off'}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            className="flex"
          >
            <Heart size={17} className={fav ? 'fill-rose-500' : ''} />
          </motion.span>
        </motion.button>
        )}
      </div>

      {/* Número de teléfono: se despliega desde el botón "Llamar" */}
      <AnimatePresence initial={false}>
        {showPhone && phone && (
          <motion.div
            key="phone"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <motion.a
                href={`tel:${phone}`}
                initial={{ y: -6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.06, duration: 0.25 }}
                className="font-display text-xl sm:text-2xl font-bold tracking-wide text-gray-900 dark:text-white tabular-nums hover:text-primary transition-colors"
              >
                {phone}
              </motion.a>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={copyPhone}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/70 hover:border-primary/40 transition-all"
                >
                  {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
                <a
                  href={`tel:${phone}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all"
                >
                  <Phone size={13} /> Llamar ahora
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gate de sesión: corazón y chat exigen cuenta */}
      <AnimatePresence>
        {gate && (
          <motion.div
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setGate(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-card p-6 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setGate(null)}
                aria-label="Cerrar"
                className="float-right text-gray-400 hover:text-gray-600 dark:hover:text-white/80 transition-colors"
              >
                <X size={18} />
              </button>
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                {gate === 'favorito' ? (
                  <Heart size={20} className="text-primary" />
                ) : (
                  <MessageCircle size={20} className="text-primary" />
                )}
              </div>
              <h3 className="font-display font-bold text-lg text-gray-900 dark:text-white">
                {gate === 'favorito' ? 'Guarda tus favoritos' : 'Chatea con el proveedor'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-white/60 mt-1.5">
                {gate === 'favorito'
                  ? `Crea tu cuenta gratis para guardar a ${businessName} y volver cuando quieras.`
                  : `Necesitas una cuenta para escribirle a ${businessName}. Es gratis y toma un momento.`}
              </p>
              {/* Al volver del login se regresa a ESTA ficha (?next=). */}
              <a
                href={`/login?next=${encodeURIComponent(`/${slug}`)}`}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-white px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-all"
              >
                <LogIn size={15} /> Entrar o crear cuenta
              </a>
              <button
                type="button"
                onClick={() => setGate(null)}
                className="mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/80 transition-colors"
              >
                Ahora no
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {chatOpen && (
        <ProfileChatPanel
          providerId={providerId}
          businessName={businessName}
          clientId={getUser()?.id ?? 0}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Phone,
  MapPin,
  Star,
  Heart,
  Briefcase,
  Store,
  LogOut,
  Globe,
  Sparkles,
  Bell,
  Settings,
  CheckCircle,
  ChevronRight,
  Gift,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { clearSession } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import ReferralPanel from '@/components/referral-panel';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { User as UserType } from '@/lib/types';

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  sentAt: string;
  isRead: boolean;
}

// El backend devuelve el provider aplanado (con alias `category:{name}`).
// Antes el web esperaba un wrapper `.provider` que nunca llegaba → la
// sección "Mis favoritos" se veía vacía aunque hubiera registros en BD.
interface FavoriteItem {
  id: number;
  businessName: string;
  averageRating?: number;
  type?: 'OFICIO' | 'NEGOCIO';
  images?: { url: string }[];
  category?: { name: string };
}

export default function ClientePage() {
  return (
    <Suspense fallback={null}>
      <ClienteContent />
    </Suspense>
  );
}

type ClientSection = 'favorites' | 'notifications' | 'settings' | 'referrals';

function ClienteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab: ClientSection =
    searchParams.get('tab') === 'referidos' ? 'referrals' : 'favorites';
  const [user, setUser] = useState<UserType | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<ClientSection>(initialTab);
  // FASE 4 #3: si el usuario ya tiene perfil de proveedor, ocultamos el CTA
  // de "Regístrate como profesional/negocio" y mostramos acceso al panel.
  const [hasProvider, setHasProvider] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const u = await api.getUserProfile();
        if (cancelled) return;
        setUser(u);

        const [favsRaw, notifs] = await Promise.all([
          api.getFavorites(),
          api.getNotifications(),
        ]);
        if (cancelled) return;
        setFavorites((favsRaw as unknown as FavoriteItem[]) ?? []);
        setNotifications(notifs.data ?? []);
        setUnreadCount(notifs.unreadCount ?? 0);

        // Estado de proveedor (best-effort, no bloquea el resto del panel).
        api
          .getMyProviderStatus()
          .then((s) => {
            if (!cancelled) setHasProvider(s.hasProvider);
          })
          .catch(() => {});
      } catch {
        if (!cancelled) toast.error('Error al cargar tus datos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Notificaciones en tiempo real (socket.io) ────────────────
  // El backend emite el evento `notification` desde events.gateway.ts.
  // Lo prependemos al inbox y subimos el badge — sin refrescar la página.
  useEffect(() => {
    const socket = getSocket();
    const onNotif = (payload: unknown) => {
      const p = payload as Partial<NotificationItem> & {
        type?: string;
        body?: string;
        targetUserId?: number;
      };
      if (!p?.type) return;
      const item: NotificationItem = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        type:    p.type,
        title:   p.title   ?? 'Notificación',
        message: p.message ?? p.body ?? '',
        sentAt:  new Date().toISOString(),
        isRead:  false,
      };
      setNotifications((prev) => [item, ...prev]);
      setUnreadCount((c) => c + 1);
    };
    socket.on('notification', onNotif);
    return () => { socket.off('notification', onNotif); };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen p-6 space-y-6 max-w-5xl mx-auto">
        <div className="skeleton h-9 w-40 rounded" />
        <div className="skeleton h-32 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-surface">
      <div className="max-w-5xl mx-auto p-5 sm:p-7 lg:p-10 space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between gap-4"
        >
          <div>
            <span className="eyebrow">Mi cuenta</span>
            <h1 className="mt-2 font-display font-bold tracking-tightest text-white text-[28px] sm:text-[34px] leading-tight">
              Mi Panel
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Volver al sitio web SIN cerrar sesión (FASE 4 #3). */}
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-white/40 hover:text-white text-[13px] font-display font-medium transition-colors"
            >
              <Globe size={16} strokeWidth={1.75} />
              <span className="hidden sm:inline">Volver al sitio web</span>
            </button>
            <button
              onClick={() => {
                clearSession();
                router.push('/');
              }}
              className="flex items-center gap-2 text-white/40 hover:text-rose-400 text-[13px] font-display font-medium transition-colors"
            >
              <LogOut size={16} strokeWidth={1.75} />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </motion.div>

        {/* Perfil */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative glass rounded-xl p-7 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex items-start gap-4">
            <div className="avatar avatar-orange w-16 h-16 text-2xl font-bold flex-shrink-0 shadow-glow-sm">
              {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="font-display font-bold text-white text-[18px] sm:text-[22px] tracking-tightest">
                  {user?.firstName} {user?.lastName}
                </h2>
                <span className="badge badge-trust">Cliente</span>
              </div>
              <div className="space-y-1.5 mt-3">
                <div className="flex items-center gap-2 text-white/60 text-[13.5px]">
                  <Mail size={14} className="text-white/30 flex-shrink-0" strokeWidth={1.75} />
                  <span className="truncate">{user?.email}</span>
                </div>
                {user?.phone && (
                  <div className="flex items-center gap-2 text-white/60 text-[13.5px]">
                    <Phone size={14} className="text-white/30 flex-shrink-0" strokeWidth={1.75} />
                    {user.phone}
                  </div>
                )}
                {user?.department && (
                  <div className="flex items-center gap-2 text-white/60 text-[13.5px]">
                    <MapPin size={14} className="text-accent flex-shrink-0" strokeWidth={1.75} />
                    {[user.department, user.province, user.district].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex gap-1.5 glass p-1.5 overflow-x-auto rounded-xl"
        >
          <TabButton
            active={activeSection === 'favorites'}
            onClick={() => setActiveSection('favorites')}
            icon={Heart}
            label="Mis favoritos"
            count={favorites.length}
          />
          <TabButton
            active={activeSection === 'notifications'}
            onClick={() => setActiveSection('notifications')}
            icon={Bell}
            label="Notificaciones"
            count={unreadCount}
            highlight={unreadCount > 0}
          />
          <TabButton
            active={activeSection === 'referrals'}
            onClick={() => setActiveSection('referrals')}
            icon={Gift}
            label="Referidos"
          />
          <TabButton
            active={activeSection === 'settings'}
            onClick={() => setActiveSection('settings')}
            icon={Settings}
            label="Ajustes"
          />
        </motion.div>

        {/* Section content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeSection === 'favorites' && <FavoritesSection items={favorites} />}
            {activeSection === 'notifications' && <NotificationsSection items={notifications} />}
            {activeSection === 'referrals' && <ReferralPanel />}
            {activeSection === 'settings' && <SettingsSection user={user} />}
          </motion.div>
        </AnimatePresence>

        {/* CTA hacerse proveedor */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative glass rounded-xl overflow-hidden p-8 sm:p-10 text-center border-primary/20 shadow-glow-md"
        >
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
          </div>

          <div className="relative">
            {hasProvider ? (
              <>
                <div className="chip-eyebrow mb-5 mx-auto">
                  <Sparkles size={12} strokeWidth={1.75} />
                  Ya eres proveedor
                </div>
                <h2 className="font-display font-bold tracking-tightest text-white text-[24px] sm:text-[28px] leading-snug mb-3">
                  Gestiona tu actividad en{' '}
                  <span className="text-gradient">Servi</span>
                </h2>
                <p className="text-white/50 text-[14.5px] mb-7 max-w-md mx-auto leading-relaxed">
                  Ya tienes un perfil de proveedor. Entra a tu panel para ver tus
                  estadísticas, mensajes y servicios.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => router.push('/panel')}
                    className="btn btn-primary press-effect"
                  >
                    <Briefcase size={15} />
                    Ir a mi panel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="chip-eyebrow mb-5 mx-auto">
                  <Sparkles size={12} strokeWidth={1.75} />
                  Hazte profesional
                </div>
                <h2 className="font-display font-bold tracking-tightest text-white text-[24px] sm:text-[28px] leading-snug mb-3">
                  ¿Quieres ofrecer tus servicios en{' '}
                  <span className="text-gradient">Servi</span>?
                </h2>
                <p className="text-white/50 text-[14.5px] mb-7 max-w-md mx-auto leading-relaxed">
                  Regístrate como profesional o negocio y empieza a recibir clientes desde hoy.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <a href="https://play.google.com/store/apps/details?id=com.oficioapp.mobile" className="btn btn-primary press-effect">
                    <Briefcase size={15} />
                    Registrarme como Profesional
                  </a>
                  <a href="https://play.google.com/store/apps/details?id=com.oficioapp.mobile" className="btn btn-ghost press-effect">
                    <Store size={15} />
                    Registrar mi Negocio
                  </a>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  highlight,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  count?: number;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13.5px] font-display font-medium whitespace-nowrap transition-all duration-200 ${
        active
          ? 'bg-primary/15 text-primary-light shadow-glow-sm'
          : 'text-white/40 hover:text-white/70 hover:bg-white/5'
      }`}
    >
      <Icon size={15} strokeWidth={1.75} />
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
            highlight
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : active
              ? 'bg-primary/20 text-primary-light border border-primary/30'
              : 'bg-white/5 text-white/40 border border-white/10'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* ── Favoritos ─────────────────────────────────────────────── */

function FavoritesSection({ items }: { items: FavoriteItem[] }) {
  if (items.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <Heart size={26} className="text-rose-400" strokeWidth={1.75} />
        </div>
        <h3 className="font-display font-semibold text-white text-[18px] mb-2">
          No tienes favoritos aún
        </h3>
        <p className="text-white/50 text-[14px] max-w-sm mx-auto leading-relaxed">
          Marca como favoritos a los profesionales que más te gusten para encontrarlos rápido.
        </p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((fav) => {
        // El backend devuelve provider aplanado: leemos los campos
        // directamente de `fav` (no de `fav.provider`).
        const cover = fav.images?.[0]?.url;
        return (
          <div
            key={fav.id}
            className="group glass glass-hover rounded-xl overflow-hidden"
          >
            <div className="aspect-video bg-dark-card relative">
              {cover ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={cover}
                  alt={fav.businessName}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20">
                  <Briefcase size={32} strokeWidth={1.5} />
                </div>
              )}
              <button
                className="absolute top-2 right-2 w-8 h-8 rounded-full glass flex items-center justify-center text-rose-400 hover:bg-rose-500/20 transition-colors"
                aria-label="Quitar de favoritos"
              >
                <Heart size={14} className="fill-rose-400" />
              </button>
            </div>
            <div className="p-4">
              <h3 className="font-display font-semibold text-white text-[14px] truncate">{fav.businessName}</h3>
              {fav.category?.name && (
                <p className="text-white/40 text-[12px] truncate mt-0.5">{fav.category.name}</p>
              )}
              {typeof fav.averageRating === 'number' && fav.averageRating > 0 && (
                <div className="flex items-center gap-1 mt-2 text-white text-[12.5px] font-display font-semibold tabular-nums">
                  <Star size={12} className="text-amber fill-amber" />
                  {fav.averageRating.toFixed(1)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Notificaciones ────────────────────────────────────────── */

function NotificationsSection({ items }: { items: NotificationItem[] }) {
  if (items.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Bell size={26} className="text-primary-light" strokeWidth={1.75} />
        </div>
        <h3 className="font-display font-semibold text-white text-[18px] mb-2">
          No tienes notificaciones
        </h3>
        <p className="text-white/50 text-[14px] max-w-sm mx-auto leading-relaxed">
          Te avisaremos cuando haya novedades importantes para ti.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl divide-y divide-white/5">
      {items.map((n) => (
        <div
          key={n.id}
          className={`flex items-start gap-3 p-4 transition-colors ${
            n.isRead ? '' : 'bg-primary/5'
          } hover:bg-white/[0.02]`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center ${
              n.isRead
                ? 'bg-white/5 text-white/30 border border-white/10'
                : 'bg-primary/10 text-primary-light border border-primary/20'
            }`}
          >
            <Bell size={15} strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <h4 className="font-display font-semibold text-white text-[14px] truncate">{n.title}</h4>
              <span className="text-white/30 text-[10.5px] flex-shrink-0">
                {formatDistanceToNow(new Date(n.sentAt), { addSuffix: true, locale: es })}
              </span>
            </div>
            <p className="text-white/50 text-[12.5px] leading-relaxed">{n.message}</p>
          </div>
          {!n.isRead && (
            <span className="w-2 h-2 rounded-full bg-primary-light mt-3 flex-shrink-0 shadow-glow-sm animate-pulse-soft" />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Ajustes simplificados ─────────────────────────────────── */

function SettingsSection({ user }: { user: UserType | null }) {
  return (
    <div className="space-y-4">
      <div className="glass rounded-xl p-6">
        <h3 className="font-display font-semibold text-white text-[16px] mb-5">Información de cuenta</h3>
        <div className="space-y-3">
          <Field label="Nombre" value={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || '—'} />
          <Field label="Email" value={user?.email ?? '—'} verified />
          <Field label="Teléfono" value={user?.phone || '—'} />
          <Field
            label="Ubicación"
            value={[user?.department, user?.province, user?.district].filter(Boolean).join(', ') || '—'}
          />
        </div>
      </div>

      <div className="glass rounded-xl divide-y divide-white/5">
        <SettingsLink label="Términos y Condiciones" />
        <SettingsLink label="Política de Privacidad" />
        <SettingsLink label="Centro de ayuda" />
      </div>
    </div>
  );
}

function Field({ label, value, verified }: { label: string; value: string; verified?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/30 text-[11px] uppercase tracking-widest font-bold">
        {label}
      </span>
      <span className="text-white text-[14px] flex items-center gap-1.5 truncate text-right font-medium">
        <span className="truncate">{value}</span>
        {verified && <CheckCircle size={13} className="text-accent flex-shrink-0" strokeWidth={1.75} />}
      </span>
    </div>
  );
}

function SettingsLink({ label }: { label: string }) {
  return (
    <button className="flex items-center justify-between w-full px-5 py-4 hover:bg-white/[0.02] transition-colors text-white/60 hover:text-white group">
      <span className="text-[14px] font-display font-medium">{label}</span>
      <ChevronRight size={15} className="text-white/20 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" strokeWidth={1.75} />
    </button>
  );
}
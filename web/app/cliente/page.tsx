'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Mail,
  Phone,
  MapPin,
  Star,
  Heart,
  Briefcase,
  Store,
  LogOut,
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

interface FavoriteItem {
  id: number;
  providerId?: number;
  provider?: {
    id: number;
    businessName: string;
    averageRating?: number;
    images?: { url: string }[];
    category?: { name: string };
  };
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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const u = await api.getUserProfile();
        if (cancelled) return;
        setUser(u);

        const [favsRaw, notifs] = await Promise.all([
          api.getFavorites(u.id),
          api.getNotifications(),
        ]);
        if (cancelled) return;
        setFavorites((favsRaw as FavoriteItem[]) ?? []);
        setNotifications(notifs.data ?? []);
        setUnreadCount(notifs.unreadCount ?? 0);
      } catch {
        if (!cancelled) toast.error('Error al cargar tus datos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
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
    <div className="min-h-screen bg-bg-dark">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div data-reveal className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-extrabold text-text-primary">Mi Panel</h1>
          <button
            onClick={() => {
              clearSession();
              router.push('/');
            }}
            className="flex items-center gap-2 text-text-muted hover:text-red text-sm font-medium transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>

        {/* Perfil */}
        <div
          data-reveal
          className="relative bg-gradient-to-br from-primary/10 via-bg-card to-bg-card border border-primary/20 rounded-2xl p-6 overflow-hidden"
        >
          <div className="blob bg-primary/25 w-64 h-64 -top-20 -right-20 animate-float-slow" aria-hidden />

          <div className="relative flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-glow-md ring-2 ring-primary/30 flex-shrink-0">
              {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-lg sm:text-xl font-bold text-text-primary">
                  {user?.firstName} {user?.lastName}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                  Cliente
                </span>
              </div>
              <div className="space-y-1.5 mt-2">
                <div className="flex items-center gap-2 text-text-secondary text-sm">
                  <Mail size={14} className="text-text-muted flex-shrink-0" />
                  <span className="truncate">{user?.email}</span>
                </div>
                {user?.phone && (
                  <div className="flex items-center gap-2 text-text-secondary text-sm">
                    <Phone size={14} className="text-text-muted flex-shrink-0" />
                    {user.phone}
                  </div>
                )}
                {user?.department && (
                  <div className="flex items-center gap-2 text-text-secondary text-sm">
                    <MapPin size={14} className="text-text-muted flex-shrink-0" />
                    {[user.department, user.province, user.district].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div data-reveal className="flex gap-2 bg-bg-card border border-white/8 rounded-2xl p-1.5 overflow-x-auto">
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
        </div>

        {/* Section content */}
        {activeSection === 'favorites' && <FavoritesSection items={favorites} />}
        {activeSection === 'notifications' && <NotificationsSection items={notifications} />}
        {activeSection === 'referrals' && <ReferralPanel />}
        {activeSection === 'settings' && <SettingsSection user={user} />}

        {/* CTA hacerse proveedor */}
        <div
          data-reveal="scale"
          className="relative overflow-hidden rounded-2xl gradient-border bg-gradient-to-br from-primary/15 via-bg-card to-amber/10 p-6 sm:p-8 text-center"
        >
          <div className="blob bg-primary/30 w-72 h-72 -top-20 -right-20 animate-float-slow" aria-hidden />

          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-full px-3 py-1 mb-4">
              <Sparkles size={12} className="text-primary" />
              <span className="text-primary text-[10px] font-bold uppercase tracking-widest">
                Hazte profesional
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-text-primary mb-2">
              ¿Quieres ofrecer tus servicios en{' '}
              <span className="text-gradient">OficioApp</span>?
            </h2>
            <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
              Regístrate como profesional o negocio y empieza a recibir clientes desde hoy.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href="#"
                className="btn-primary press-effect inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
              >
                <Briefcase size={16} />
                Registrarme como Profesional
              </a>
              <a
                href="#"
                className="btn-ghost press-effect inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
              >
                <Store size={16} />
                Registrar mi Negocio
              </a>
            </div>
          </div>
        </div>
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
      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
        active
          ? 'bg-primary/15 text-primary shadow-glow-sm'
          : 'text-text-muted hover:text-text-secondary hover:bg-white/5'
      }`}
    >
      <Icon size={16} />
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
            highlight ? 'bg-red text-white' : 'bg-white/10 text-text-secondary'
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
      <div data-reveal className="bg-bg-card border border-white/5 rounded-2xl p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red/10 flex items-center justify-center animate-float-slow">
          <Heart size={28} className="text-red/60" />
        </div>
        <h3 className="text-text-primary font-semibold text-lg mb-2">
          No tienes favoritos aún
        </h3>
        <p className="text-text-muted text-sm max-w-sm mx-auto">
          Marca como favoritos a los profesionales que más te gusten para encontrarlos rápido.
        </p>
      </div>
    );
  }

  return (
    <div data-reveal className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((fav) => {
        const p = fav.provider;
        if (!p) return null;
        const cover = p.images?.[0]?.url;
        return (
          <div
            key={fav.id}
            className="group bg-bg-card border border-white/5 rounded-2xl overflow-hidden hover:border-primary/30 hover-lift transition-all duration-300"
          >
            <div className="aspect-video bg-bg-input relative">
              {cover ? (
                <img
                  src={cover}
                  alt={p.businessName}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted/30">
                  <Briefcase size={32} />
                </div>
              )}
              <button
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-red hover:bg-red/30 transition-colors"
                aria-label="Quitar de favoritos"
              >
                <Heart size={14} className="fill-red" />
              </button>
            </div>
            <div className="p-4">
              <h3 className="text-text-primary font-semibold text-sm truncate">{p.businessName}</h3>
              {p.category?.name && (
                <p className="text-text-muted text-xs truncate mt-0.5">{p.category.name}</p>
              )}
              {typeof p.averageRating === 'number' && p.averageRating > 0 && (
                <div className="flex items-center gap-1 mt-2 text-amber text-xs font-bold tabular-nums">
                  <Star size={12} className="fill-amber" />
                  {p.averageRating.toFixed(1)}
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
      <div data-reveal className="bg-bg-card border border-white/5 rounded-2xl p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center animate-float-slow">
          <Bell size={28} className="text-primary/60" />
        </div>
        <h3 className="text-text-primary font-semibold text-lg mb-2">
          No tienes notificaciones
        </h3>
        <p className="text-text-muted text-sm max-w-sm mx-auto">
          Te avisaremos cuando haya novedades importantes para ti.
        </p>
      </div>
    );
  }

  return (
    <div data-reveal className="bg-bg-card border border-white/5 rounded-2xl divide-y divide-white/5">
      {items.map((n) => (
        <div
          key={n.id}
          className={`flex items-start gap-3 p-4 transition-colors ${
            n.isRead ? '' : 'bg-primary/5'
          } hover:bg-white/[0.02]`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center ${
              n.isRead ? 'bg-white/5 text-text-muted' : 'bg-primary/15 text-primary'
            }`}
          >
            <Bell size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <h4 className="text-text-primary font-semibold text-sm truncate">{n.title}</h4>
              <span className="text-text-muted text-[10px] flex-shrink-0">
                {formatDistanceToNow(new Date(n.sentAt), { addSuffix: true, locale: es })}
              </span>
            </div>
            <p className="text-text-secondary text-xs leading-relaxed">{n.message}</p>
          </div>
          {!n.isRead && (
            <span className="w-2 h-2 rounded-full bg-primary mt-3 flex-shrink-0 animate-pulse-soft" />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Ajustes simplificados ─────────────────────────────────── */

function SettingsSection({ user }: { user: UserType | null }) {
  return (
    <div data-reveal className="space-y-4">
      <div className="bg-bg-card border border-white/5 rounded-2xl p-6">
        <h3 className="text-text-primary font-semibold text-base mb-4">Información de cuenta</h3>
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

      <div className="bg-bg-card border border-white/5 rounded-2xl divide-y divide-white/5">
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
      <span className="text-text-muted text-xs uppercase tracking-wider font-semibold">
        {label}
      </span>
      <span className="text-text-primary text-sm flex items-center gap-1.5 truncate text-right">
        <span className="truncate">{value}</span>
        {verified && <CheckCircle size={13} className="text-green flex-shrink-0" />}
      </span>
    </div>
  );
}

function SettingsLink({ label }: { label: string }) {
  return (
    <button className="flex items-center justify-between w-full px-5 py-4 hover:bg-white/[0.02] transition-colors text-text-secondary hover:text-text-primary group">
      <span className="text-sm font-medium">{label}</span>
      <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

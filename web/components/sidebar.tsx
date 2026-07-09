'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  UserCog,
  Briefcase,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Globe,
  Store,
  Wrench,
  LayoutDashboard,
  Gift,
  MessageSquare,
  User as UserIcon,
  Bell,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { clearSession, getUser } from '@/lib/auth';
import { disconnectSocket, getSocket } from '@/lib/socket';
import { useProfileTypeOptional } from '@/lib/profile-type-context';
import { api } from '@/lib/api';

// "Panel Cliente" se sacó de esta lista — ahora vive dentro del
// PanelSwitcher de abajo, junto al toggle OFICIO ↔ NEGOCIO, para que
// el cambio de contexto (proveedor ↔ cliente) sea una sola interacción.
const tabs = [
  { label: 'Inicio',       icon: Home,          href: '/panel' },
  { label: 'Perfil',       icon: UserCog,       href: '/panel/perfil' },
  { label: 'Mensajes',     icon: MessageSquare, href: '/panel/mensajes' },
  // Feature OCULTA (2026-07): subastas — restaurar junto con FEATURE_SUBASTAS.
  // { label: 'Ofertas',      icon: Zap,           href: '/panel/ofertas' },
  { label: 'Servicios',    icon: Briefcase,     href: '/panel/servicios' },
  { label: 'Estadísticas', icon: BarChart3,     href: '/panel/estadisticas' },
  { label: 'Referidos',    icon: Gift,          href: '/panel/referidos' },
  { label: 'Ajustes',      icon: Settings,      href: '/panel/ajustes' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const user = getUser();
  const profileCtx = useProfileTypeOptional();

  const handleLogout = () => {
    disconnectSocket();
    clearSession();
    router.push('/login');
  };

  const showSwitcher = !!profileCtx && profileCtx.availableTypes.length > 0;
  const unread = useUnreadNotifications();

  return (
    <aside
      className={`hidden md:flex flex-col bg-dark-surface/80 backdrop-blur-xl border-r border-white/5 h-screen sticky top-0 transition-all duration-300 ease-smooth ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Header con logo */}
      <div className="flex items-center justify-between p-4 border-b border-white/5 h-16">
        <Link href="/panel" className={`flex items-center gap-2.5 group overflow-hidden ${collapsed ? 'justify-center w-full' : ''}`}>
          <div className="relative w-8 h-8 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <Image
              src="/images/logo/servi.png" // Cambiado a logo claro
              alt="Servi"
              fill
              className="object-contain"
              sizes="32px"
            />
          </div>
          {!collapsed && (
            <span className="text-white font-display font-bold text-sm whitespace-nowrap animate-fade-in">
              Servi
            </span>
          )}
        </Link>
        {!collapsed && (
          <div className="flex items-center gap-1">
            {/* Bell con badge de notificaciones no leídas. Click →
                Panel Cliente, sección Notificaciones (donde vive el
                inbox unificado). Live update vía socket `notification`
                + seed inicial vía REST. */}
            <Link
              href="/cliente?tab=notifications"
              aria-label="Notificaciones"
              className="relative text-white/40 hover:text-primary hover:bg-white/5 rounded-lg p-1.5 transition-colors"
            >
              <Bell size={16} />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center leading-none tabular-nums">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </Link>
            <button
              onClick={() => setCollapsed(true)}
              className="text-white/30 hover:text-primary hover:bg-white/5 rounded-lg p-1.5 transition-colors"
              aria-label="Colapsar menú"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        )}
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-2 text-white/30 hover:text-primary hover:bg-white/5 rounded-lg p-1.5 transition-colors"
          aria-label="Expandir menú"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* PANEL switcher */}
      {showSwitcher && (
        <PanelSwitcher collapsed={collapsed} />
      )}

      {/* Nav items */}
      <nav className="flex-1 py-4 space-y-1 px-2.5 overflow-y-auto">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-primary/20 to-primary/5 text-primary-light shadow-glow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? tab.label : undefined}
            >
              {isActive && (
                <motion.span 
                  layoutId="active-sidebar-tab"
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-gradient-to-b from-primary to-primary-light rounded-r-full shadow-glow-sm" 
                />
              )}
              <tab.icon
                size={20}
                className={`flex-shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}
              />
              {!collapsed && <span className="whitespace-nowrap">{tab.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-2.5 border-t border-white/5 space-y-1">
        {!collapsed && user && (
          <div className="px-3 py-2.5 flex items-center gap-2.5 mb-1">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.firstName}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/30 flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-glow-sm">
                {user.firstName?.charAt(0).toUpperCase()}
                {user.lastName?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-white text-xs font-semibold truncate">{user.firstName}</div>
              <div className="text-white/30 text-[10px] truncate">{user.email}</div>
            </div>
          </div>
        )}
        {/* Volver al sitio web SIN cerrar sesión (FASE 4 #3). */}
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors duration-200 w-full ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Volver al sitio web' : undefined}
        >
          <Globe size={20} className="flex-shrink-0" />
          {!collapsed && <span>Volver al sitio web</span>}
        </Link>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200 w-full ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <LogOut size={20} className="flex-shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}

/* ── PANEL switcher (OFICIO ↔ NEGOCIO) ─────────────────────── */

function PanelSwitcher({ collapsed }: { collapsed: boolean }) {
  const ctx = useProfileTypeOptional();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!ctx || ctx.availableTypes.length === 0) return null;

  const { activeType, availableTypes, setActiveType } = ctx;
  const activeMeta = activeType ? META[activeType] : META.OFICIO;
  const ActiveIcon = activeMeta.icon;

  if (collapsed) {
    // En sidebar colapsado: solo icono indicador, no dropdown
    return (
      <div className="px-2.5 pt-3" title={`Panel ${activeMeta.label}`}>
        <div className="w-12 h-12 mx-auto rounded-xl glass border-primary/20 flex items-center justify-center text-primary shadow-glow-sm">
          <ActiveIcon size={20} />
        </div>
      </div>
    );
  }

  return (
    <div className="px-2.5 pt-3 relative" ref={ref}>
      <p className="text-white/30 text-[10px] uppercase tracking-widest font-bold px-3 mb-1.5">
        Panel
      </p>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl glass border-white/5 hover:border-primary/30 transition-all duration-200 cursor-pointer hover:bg-white/[0.04]"
        aria-haspopup
        aria-expanded={open}
      >
        <div className={`w-9 h-9 rounded-lg ${activeMeta.bg} flex items-center justify-center flex-shrink-0`}>
          <ActiveIcon size={18} className={activeMeta.color} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
            Panel
          </div>
          <div className="text-white text-sm font-bold truncate">
            {activeMeta.label}
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-white/30 transition-transform duration-200 ${open ? 'rotate-180 text-primary' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="absolute left-2.5 right-2.5 top-full mt-2 z-50 glass-card rounded-xl shadow-glow-sm py-1.5 overflow-hidden"
          >
            {availableTypes.map((t) => {
              const m = META[t];
              const Icon = m.icon;
              const isActive = t === activeType;
              return (
                <button
                  key={t}
                  onClick={() => {
                    setActiveType(t);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left ${
                    isActive
                      ? 'bg-primary/10 text-primary-light'
                      : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={16} className={m.color} />
                  </div>
                  <span className="text-sm font-medium">{m.label}</span>
                  {isActive && (
                    <LayoutDashboard size={14} className="ml-auto text-primary" />
                  )}
                </button>
              );
            })}
            {/* Separador + acceso al Panel Cliente — antes vivía como
                tab suelto al final del menú. Acá tiene más sentido:
                el usuario decide en un solo lugar qué panel ver
                (OFICIO / NEGOCIO / Cliente). */}
            <div className="my-1.5 border-t border-white/5" />
            <Link
              href="/cliente"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left text-white/50 hover:text-white hover:bg-white/[0.04]"
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
                <UserIcon size={16} className="text-cyan-300" />
              </div>
              <span className="text-sm font-medium">Panel Cliente</span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Badge de notificaciones no leídas ────────────────────────
//
// Lee el inbox histórico una vez al montar (REST) y se suscribe al
// evento `notification` del socket para incrementar el contador en
// tiempo real. La fuente de verdad para la lectura sigue siendo
// `/cliente?tab=notifications` — acá solo mostramos el contador.
function useUnreadNotifications(): number {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api.getNotifications()
      .then((r) => { if (!cancelled) setUnread(r.unreadCount ?? 0); })
      .catch(() => {});
    const socket = getSocket();
    const onNotif = () => setUnread((c) => c + 1);
    socket.on('notification', onNotif);
    return () => {
      cancelled = true;
      socket.off('notification', onNotif);
    };
  }, []);
  return unread;
}

const META: Record<'OFICIO' | 'NEGOCIO', {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}> = {
  OFICIO: {
    label: 'Profesional',
    icon: Wrench,
    color: 'text-primary-light',
    bg: 'bg-primary/15',
  },
  NEGOCIO: {
    label: 'Negocio',
    icon: Store,
    color: 'text-amber',
    bg: 'bg-amber/15',
  },
};
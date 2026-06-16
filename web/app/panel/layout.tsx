'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  isAuthenticated,
  isSessionExpired,
  clearSession,
  getUser,
  updateLastActivity,
} from '@/lib/auth';
import Sidebar from '@/components/sidebar';
import { getSocket } from '@/lib/socket';
import { toast } from 'sonner';
import {
  Home, UserCog, Zap, Briefcase, BarChart3, Settings, Gift, LogOut,
  Wrench, Store, ChevronDown, Check, MessageSquare, User as UserIcon,
} from 'lucide-react';
import { useRef, type ElementType } from 'react';
import { ProfileTypeProvider, useProfileType, useProfileTypeOptional } from '@/lib/profile-type-context';
import { api } from '@/lib/api';

// ─── Meta de cada tipo de perfil (replica del Sidebar) ─────────
const PROFILE_META: Record<'OFICIO' | 'NEGOCIO', {
  label: string;
  icon: ElementType;
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

// ========== ANIMACIONES CON TIPADO CORRECTO ==========
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    if (isSessionExpired()) {
      clearSession();
      router.push('/login');
      return;
    }

    const user = getUser();
    let socket: ReturnType<typeof getSocket> | null = null;
    // Sincronización en tiempo real (Punto 4): cuando el admin aprueba el pago
    // (o se activa la suscripción), llega `notification` con PLAN_APROBADO →
    // avisamos y recargamos para reflejar el plan activo al instante.
    const onNotif = (n: { type?: string }) => {
      if (n?.type === 'PLAN_APROBADO') {
        toast.success('¡Tu plan fue activado!');
        setTimeout(() => window.location.reload(), 1200);
      }
    };
    if (user) {
      socket = getSocket();
      socket.on('connect', () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[WS] Conectado al panel');
        }
      });
      socket.on('notification', onNotif);
    }

    setAuthChecked(true);

    const interval = setInterval(() => {
      updateLastActivity();
    }, 30000);

    return () => {
      clearInterval(interval);
      socket?.off('notification', onNotif);
    };
  }, [router]);

  if (!mounted || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-premium">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
          className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full shadow-glow-sm"
        />
      </div>
    );
  }

  return (
    <Suspense fallback={null}>
      <ProfileTypeProvider>
        <PanelGate>{children}</PanelGate>
      </ProfileTypeProvider>
    </Suspense>
  );
}

/**
 * Gate: redirect users without provider profiles to /cliente.
 * Otherwise render the provider panel chrome with visual enhancements.
 */
function PanelGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, loading } = useProfileType();

  useEffect(() => {
    if (loading) return;
    if (status && status.hasProvider === false) {
      router.replace('/cliente');
    } else if (status === null) {
      api
        .getMyProviderStatus()
        .then((s) => {
          if (s.hasProvider === false) router.replace('/cliente');
        })
        .catch(() => {
          /* ignore; let user retry */
        });
    }
  }, [status, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-premium">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
          className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full shadow-glow-sm"
        />
      </div>
    );
  }

  if (!status?.hasProvider) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen bg-dark-premium overflow-hidden">
      {/* Fondo decorativo (orbe gradiente + grid sutil) */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute -top-[30%] -right-[20%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[30%] -left-[20%] w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-grid-pattern bg-grid-md opacity-[0.03]" />
      </div>

      {/* Sidebar (componente existente) */}
      <Sidebar />

      {/* Top bar mobile-only: garantiza acceso al logout sin tener que
          buscar entre las pestañas del bottom nav. En desktop la sidebar
          ya expone el logout, por eso esta barra se oculta en md+. */}
      <MobileTopBar />

      {/* Contenido principal con transición de páginas */}
      <main className="flex-1 relative z-10 p-4 pt-16 sm:p-6 md:pt-6 lg:p-8 overflow-x-hidden pb-24 md:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navegación inferior mejorada (glass + microinteracciones) */}
      <MobileBottomNav />
      {/* El asistente "Ofi" ahora se monta site-wide en el root layout
          (FASE 4 #1) — su estado sobrevive a la navegación. */}
    </div>
  );
}

function MobileTopBar() {
  const router = useRouter();

  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="md:hidden fixed top-0 left-0 right-0 z-40 glass border-b border-white/10 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between gap-3 px-4 h-14">
        {/* Lado izquierdo: switcher de perfil (o label estático). */}
        <MobilePanelSwitcher />
        {/* Lado derecho: logout siempre visible. */}
        <button
          onClick={handleLogout}
          aria-label="Cerrar sesión"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-rose/80 hover:text-rose bg-white/[0.03] border border-white/10 hover:border-rose/40 transition-colors text-[12.5px] font-medium flex-shrink-0"
        >
          <LogOut size={14} strokeWidth={1.75} />
          <span>Salir</span>
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Versión mobile del PanelSwitcher del Sidebar. Usa el mismo contexto
 * (`useProfileTypeOptional`) para mantener el estado sincronizado entre
 * la barra superior móvil y la sidebar desktop. Si el usuario tiene un
 * solo perfil, se renderiza como chip estático (sin dropdown).
 */
function MobilePanelSwitcher() {
  const ctx = useProfileTypeOptional();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cierra el dropdown si se hace tap fuera (espejo del sidebar).
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Sin contexto o sin perfiles disponibles → fallback al label "Panel"
  // para que la barra siga teniendo algo visible alineado a la izquierda.
  if (!ctx || ctx.availableTypes.length === 0) {
    return (
      <span className="font-display font-semibold text-white text-[15px] tracking-tightest">
        Panel
      </span>
    );
  }

  const { activeType, availableTypes, setActiveType } = ctx;
  const activeMeta = activeType ? PROFILE_META[activeType] : PROFILE_META.OFICIO;
  const ActiveIcon = activeMeta.icon;
  const onlyOne = availableTypes.length === 1;

  return (
    <div className="relative flex-1 min-w-0" ref={ref}>
      <button
        onClick={() => !onlyOne && setOpen((p) => !p)}
        disabled={onlyOne}
        aria-haspopup={!onlyOne}
        aria-expanded={open}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-full border transition-all ${
          onlyOne
            ? 'border-white/10 bg-white/[0.03] cursor-default'
            : 'border-white/10 bg-white/[0.04] hover:border-primary/40 hover:bg-white/[0.07] cursor-pointer'
        }`}
      >
        <div className={`w-7 h-7 rounded-lg ${activeMeta.bg} flex items-center justify-center flex-shrink-0`}>
          <ActiveIcon size={14} className={activeMeta.color} />
        </div>
        <div className="flex flex-col items-start min-w-0 flex-1">
          <span className="text-[9px] uppercase tracking-wider text-white/40 font-semibold leading-none">
            Panel
          </span>
          <span className="text-white text-[12.5px] font-bold truncate leading-tight">
            {activeMeta.label}
          </span>
        </div>
        {!onlyOne && (
          <ChevronDown
            size={14}
            className={`text-white/40 flex-shrink-0 transition-transform duration-200 ${
              open ? 'rotate-180 text-primary-light' : ''
            }`}
          />
        )}
      </button>

      <AnimatePresence>
        {open && !onlyOne && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="absolute left-0 right-0 top-full mt-2 z-50 glass-card rounded-xl shadow-glow-sm py-1.5 overflow-hidden border border-white/10"
          >
            {availableTypes.map((t) => {
              const m = PROFILE_META[t];
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
                      : 'text-white/70 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={15} className={m.color} />
                  </div>
                  <span className="text-[13px] font-medium flex-1">{m.label}</span>
                  {isActive && <Check size={14} className="text-primary" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { label: 'Inicio',    Icon: Home,          href: '/panel' },
    { label: 'Perfil',    Icon: UserCog,       href: '/panel/perfil' },
    { label: 'Mensajes',  Icon: MessageSquare, href: '/panel/mensajes' },
    { label: 'Ofertas',   Icon: Zap,           href: '/panel/ofertas' },
    { label: 'Servicios', Icon: Briefcase,     href: '/panel/servicios' },
    { label: 'Stats',     Icon: BarChart3,     href: '/panel/estadisticas' },
    { label: 'Referidos', Icon: Gift,          href: '/panel/referidos' },
    // Cliente: salta al panel del rol USUARIO sin perder sesión.
    { label: 'Cliente',   Icon: UserIcon,      href: '/cliente' },
    { label: 'Ajustes',   Icon: Settings,      href: '/panel/ajustes' },
  ];

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
    >
      <div className="glass border-t border-white/10 backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.3)] safe-bottom">
        <div className="flex justify-around py-2 px-1">
          {tabs.map(({ label, Icon, href }) => {
            const isActive = pathname === href;
            return (
              <motion.button
                key={href}
                onClick={() => router.push(href)}
                whileTap={{ scale: 0.92 }}
                className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-primary-light'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="activeTab"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full shadow-glow-sm"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon size={18} className={`${isActive ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[10px] font-medium">{label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
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
import { Home, UserCog, Zap, Briefcase, BarChart3, Settings, Gift } from 'lucide-react';
import { ProfileTypeProvider, useProfileType } from '@/lib/profile-type-context';
import { api } from '@/lib/api';

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
    if (user) {
      const socket = getSocket();
      socket.on('connect', () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[WS] Conectado al panel');
        }
      });
    }

    setAuthChecked(true);

    const interval = setInterval(() => {
      updateLastActivity();
    }, 30000);

    return () => clearInterval(interval);
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

      {/* Contenido principal con transición de páginas */}
      <main className="flex-1 relative z-10 p-4 sm:p-6 lg:p-8 overflow-x-hidden pb-24 md:pb-8">
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
    </div>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { label: 'Inicio', Icon: Home, href: '/panel' },
    { label: 'Perfil', Icon: UserCog, href: '/panel/perfil' },
    { label: 'Ofertas', Icon: Zap, href: '/panel/ofertas' },
    { label: 'Servicios', Icon: Briefcase, href: '/panel/servicios' },
    { label: 'Stats', Icon: BarChart3, href: '/panel/estadisticas' },
    { label: 'Ajustes', Icon: Settings, href: '/panel/ajustes' },
    { label: 'Referidos', Icon: Gift, href: '/panel/referidos' },
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
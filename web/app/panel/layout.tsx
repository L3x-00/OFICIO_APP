'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  isAuthenticated,
  isSessionExpired,
  clearSession,
  getUser,
  updateLastActivity,
} from '@/lib/auth';
import Sidebar from '@/components/sidebar';
import { getSocket } from '@/lib/socket';
import { Home, UserCog, Zap, Briefcase, BarChart3, Settings } from 'lucide-react';
import { ProfileTypeProvider, useProfileType } from '@/lib/profile-type-context';
import { api } from '@/lib/api';

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <div className="min-h-screen flex items-center justify-center bg-bg-dark">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
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
 * Otherwise render the provider panel chrome.
 */
function PanelGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status, loading } = useProfileType();

  useEffect(() => {
    if (loading) return;
    // Backend may temporarily 401/error -> status null. Re-check with the
    // controller-typed call to be safe before redirecting.
    if (status && status.hasProvider === false) {
      // No provider profiles at all -> client-only
      router.replace('/cliente');
    } else if (status === null) {
      // Network / unauthorized: try fallback fetch through api wrapper
      api.getMyProviderStatus().then((s) => {
        if (s.hasProvider === false) router.replace('/cliente');
      }).catch(() => { /* ignore; let user retry */ });
    }
  }, [status, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-dark">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!status?.hasProvider) {
    // Brief blank while redirect happens
    return null;
  }

  return (
    <div className="flex min-h-screen bg-bg-dark">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden pb-24 md:pb-8 animate-fade-in">
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { label: 'Inicio',    Icon: Home,      href: '/panel' },
    { label: 'Perfil',    Icon: UserCog,   href: '/panel/perfil' },
    { label: 'Ofertas',   Icon: Zap,       href: '/panel/ofertas' },
    { label: 'Servicios', Icon: Briefcase, href: '/panel/servicios' },
    { label: 'Stats',     Icon: BarChart3, href: '/panel/estadisticas' },
    { label: 'Ajustes',   Icon: Settings,  href: '/panel/ajustes' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-card/95 backdrop-blur-xl border-t border-white/8 z-50 shadow-[0_-8px_24px_rgba(0,0,0,0.4)]">
      <div className="flex justify-around py-1.5 px-1 safe-bottom">
        {tabs.map(({ label, Icon, href }) => {
          const isActive = pathname === href;
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all duration-200 relative ${
                isActive
                  ? 'text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {isActive && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full shadow-glow-sm" />
              )}
              <Icon
                size={18}
                className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
              />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

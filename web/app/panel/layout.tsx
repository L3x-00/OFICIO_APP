'use client';

import { useEffect, useState } from 'react';
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

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

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

    const interval = setInterval(() => {
      updateLastActivity();
    }, 30000);

    return () => clearInterval(interval);
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden pb-20 md:pb-8">
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
    { label: 'Inicio',     icon: '🏠', href: '/panel' },
    { label: 'Perfil',     icon: '👤', href: '/panel/perfil' },
    { label: 'Ofertas',    icon: '⚡', href: '/panel/ofertas' },
    { label: 'Servicios',  icon: '💼', href: '/panel/servicios' },
    { label: 'Stats',      icon: '📊', href: '/panel/estadisticas' },
    { label: 'Ajustes',    icon: '⚙️', href: '/panel/ajustes' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-card border-t border-white/5 z-50">
      <div className="flex justify-around py-1.5">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <button
              key={tab.href}
              onClick={() => router.push(tab.href)}
              className={`flex flex-col items-center text-xs gap-0.5 px-2 py-1.5 rounded-lg transition-colors ${
                isActive ? 'text-primary' : 'text-text-muted'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span className="text-[10px]">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

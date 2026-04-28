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
import { Home, UserCog, Zap, Briefcase, BarChart3, Settings } from 'lucide-react';

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
    { label: 'Inicio',    Icon: Home,     href: '/panel' },
    { label: 'Perfil',    Icon: UserCog,  href: '/panel/perfil' },
    { label: 'Ofertas',   Icon: Zap,      href: '/panel/ofertas' },
    { label: 'Servicios', Icon: Briefcase,href: '/panel/servicios' },
    { label: 'Stats',     Icon: BarChart3, href: '/panel/estadisticas' },
    { label: 'Ajustes',   Icon: Settings, href: '/panel/ajustes' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-card border-t border-white/5 z-50">
      <div className="flex justify-around py-1.5">
        {tabs.map(({ label, Icon, href }) => {
          const isActive = pathname === href;
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors ${
                isActive ? 'text-primary' : 'text-text-muted'
              }`}
            >
              <Icon size={18} />
              <span className="text-[10px]">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

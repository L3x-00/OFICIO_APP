'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Home,
  UserCog,
  Zap,
  Briefcase,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { clearSession, getUser } from '@/lib/auth';
import { disconnectSocket } from '@/lib/socket';

const tabs = [
  { label: 'Inicio',       icon: Home,      href: '/panel' },
  { label: 'Perfil',       icon: UserCog,   href: '/panel/perfil' },
  { label: 'Ofertas',      icon: Zap,       href: '/panel/ofertas' },
  { label: 'Servicios',    icon: Briefcase, href: '/panel/servicios' },
  { label: 'Estadísticas', icon: BarChart3, href: '/panel/estadisticas' },
  { label: 'Ajustes',      icon: Settings,  href: '/panel/ajustes' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const user = getUser();

  const handleLogout = () => {
    disconnectSocket();
    clearSession();
    router.push('/login');
  };

  return (
    <aside
      className={`hidden md:flex flex-col bg-bg-card/80 backdrop-blur-xl border-r border-white/5 h-screen sticky top-0 transition-all duration-300 ease-smooth ${
        collapsed ? 'w-[72px]' : 'w-60'
      }`}
    >
      {/* Header con logo */}
      <div className="flex items-center justify-between p-4 border-b border-white/5 h-16">
        <Link href="/panel" className={`flex items-center gap-2.5 group overflow-hidden ${collapsed ? 'justify-center w-full' : ''}`}>
          <div className="relative w-8 h-8 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <Image
              src="/images/logo/logo_dark.png"
              alt="OficioApp"
              fill
              className="object-contain"
              sizes="32px"
            />
          </div>
          {!collapsed && (
            <span className="text-text-primary font-bold text-sm whitespace-nowrap animate-fade-in">
              OficioApp
            </span>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="text-text-muted hover:text-primary hover:bg-white/5 rounded-lg p-1.5 transition-colors"
            aria-label="Colapsar menú"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Toggle al expandir */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-2 text-text-muted hover:text-primary hover:bg-white/5 rounded-lg p-1.5 transition-colors"
          aria-label="Expandir menú"
        >
          <ChevronRight size={16} />
        </button>
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
                  ? 'bg-primary/15 text-primary shadow-glow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? tab.label : undefined}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 bg-primary rounded-r-full" />
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
              <div className="text-text-primary text-xs font-semibold truncate">{user.firstName}</div>
              <div className="text-text-muted text-[10px] truncate">{user.email}</div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red/80 hover:text-red hover:bg-red/10 transition-colors duration-200 w-full ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <LogOut size={20} className="flex-shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}

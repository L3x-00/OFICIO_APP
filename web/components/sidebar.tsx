'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  UserCog,
  Zap,
  Package,
  Briefcase,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { clearSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { disconnectSocket } from '@/lib/socket';

const tabs = [
  { label: 'Inicio', icon: Home, href: '/panel' },
  { label: 'Perfil', icon: UserCog, href: '/panel/perfil' },
  { label: 'Ofertas', icon: Zap, href: '/panel/ofertas' },
  {
    label: 'Servicios',
    icon: Briefcase,
    href: '/panel/servicios',
  },
  {
    label: 'Estadísticas',
    icon: BarChart3,
    href: '/panel/estadisticas',
  },
  { label: 'Ajustes', icon: Settings, href: '/panel/ajustes' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    disconnectSocket();
    clearSession();
    router.push('/login');
  };

  return (
    <aside
      className={`hidden md:flex flex-col bg-bg-card border-r border-white/5 h-screen sticky top-0 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        {!collapsed && (
          <span className="text-text-primary font-bold text-sm">
            Mi Panel
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-text-muted hover:text-text-secondary transition-colors ml-auto"
          aria-label="Colapsar menú"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-button text-sm font-medium transition-colors duration-200 ${
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-input'
              }`}
            >
              <tab.icon size={20} />
              {!collapsed && <span>{tab.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-button text-sm font-medium text-red/80 hover:text-red hover:bg-red/5 transition-colors duration-200 w-full"
        >
          <LogOut size={20} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
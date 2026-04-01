'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Star,
  ShieldCheck,
  BarChart2,
  Settings,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/',              label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/providers',     label: 'Proveedores',   icon: Users           },
  { href: '/reviews',       label: 'Reseñas',       icon: Star            },
  { href: '/verification',  label: 'Verificación',  icon: ShieldCheck     },
  { href: '/analytics',     label: 'Analytics',     icon: BarChart2       },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-bg-card border-r border-white/5 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">OficioApp</p>
            <p className="text-xs text-gray-500">Panel Admin</p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5',
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <p className="text-xs text-gray-600 text-center">
          OficioApp v1.0 — Admin
        </p>
      </div>
    </aside>
  );
}
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Star,
  ShieldCheck,
  BarChart2,
  Tag,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/',              label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/providers',     label: 'Proveedores',   icon: Users           },
  { href: '/categories',    label: 'Categorías',    icon: Tag             },
  { href: '/reviews',       label: 'Reseñas',       icon: Star            },
  { href: '/verification',  label: 'Verificación',  icon: ShieldCheck     },
  { href: '/analytics',     label: 'Analytics',     icon: BarChart2       },
];

// Niveles de administrador con sus permisos
const ADMIN_LEVELS: Record<string, { label: string; color: string; permissions: string[] }> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    permissions: ['dashboard', 'providers', 'categories', 'reviews', 'verification', 'analytics'],
  },
  ADMIN: {
    label: 'Administrador',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    permissions: ['dashboard', 'providers', 'reviews', 'verification', 'analytics'],
  },
  MODERATOR: {
    label: 'Moderador',
    color: 'text-green-400 bg-green-500/10 border-green-500/20',
    permissions: ['dashboard', 'reviews'],
  },
};

function AdminLevelBadge() {
  // En producción, el nivel vendría del token JWT decodificado
  // Por ahora se lee de localStorage como demo
  const level = typeof window !== 'undefined'
    ? (localStorage.getItem('adminLevel') ?? 'ADMIN')
    : 'ADMIN';

  const config = ADMIN_LEVELS[level] ?? ADMIN_LEVELS.ADMIN;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${config.color}`}>
      <span className="w-2 h-2 rounded-full bg-current opacity-80" />
      {config.label}
    </div>
  );
}

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

      {/* Footer — jerarquía de admin */}
      <div className="p-4 border-t border-white/5 space-y-3">
        <AdminLevelBadge />
        <p className="text-xs text-gray-700 text-center">OficioApp v1.0</p>
      </div>
    </aside>
  );
}
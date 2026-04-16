'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Star, ShieldCheck, BarChart2,
  Tag, Zap, Bell, FileBarChart, UserCog, ChevronRight,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navGroups = [
  {
    label: 'Principal',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/analytics', label: 'Analytics', icon: BarChart2 },
      { href: '/reports', label: 'Reportes', icon: FileBarChart },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/providers', label: 'Proveedores', icon: Users },
      { href: '/users', label: 'Usuarios', icon: UserCog },
      { href: '/categories', label: 'Categorías', icon: Tag },
      { href: '/reviews', label: 'Reseñas', icon: Star },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { href: '/verification', label: 'Verificación', icon: ShieldCheck },
      { href: '/notifications', label: 'Notificaciones', icon: Bell },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      style={{
        width: collapsed ? '72px' : '260px',
        background: 'var(--surface-1)',
        borderRight: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 50,
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        overflowX: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{
        padding: collapsed ? '20px 0' : '20px 20px',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        minHeight: '68px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
          }}>
            <Zap size={18} color="#fff" />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                OficioApp
              </p>
              <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '1px' }}>
                Panel Admin
              </p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            style={{
              width: '26px', height: '26px',
              borderRadius: '6px',
              background: 'transparent',
              border: '1px solid var(--border-default)',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition)',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-4)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)';
            }}
          >
            <ChevronRight size={13} style={{ transform: 'rotate(180deg)' }} />
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            style={{
              position: 'absolute',
              right: '-12px',
              top: '24px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'var(--surface-4)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <ChevronRight size={12} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: collapsed ? '12px 0' : '12px 10px', overflowY: 'auto', overflowX: 'hidden' }}>
        {navGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: '4px' }}>
            {!collapsed && (
              <p style={{
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
                padding: '16px 10px 6px',
              }}>
                {group.label}
              </p>
            )}
            {collapsed && <div style={{ height: '8px' }} />}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: collapsed ? '10px 0' : '9px 10px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    borderRadius: collapsed ? '0' : '8px',
                    marginBottom: '1px',
                    textDecoration: 'none',
                    transition: 'var(--transition)',
                    position: 'relative',
                    background: isActive
                      ? 'rgba(59,130,246,0.1)'
                      : 'transparent',
                    color: isActive ? 'var(--brand-light)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 500 : 400,
                    fontSize: '13px',
                    borderLeft: isActive && !collapsed ? '2px solid var(--brand)' : '2px solid transparent',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-4)';
                      (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                      (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)';
                    }
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    size={16}
                    style={{
                      flexShrink: 0,
                      color: isActive ? 'var(--brand-light)' : 'currentColor',
                    }}
                  />
                  {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer status */}
      {!collapsed && (
        <div style={{
          padding: '12px 14px',
          borderTop: '1px solid var(--border-default)',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 10px',
            background: 'var(--surface-3)',
            borderRadius: '8px',
            border: '1px solid var(--border-default)',
          }}>
            <div style={{
              width: '7px', height: '7px',
              borderRadius: '50%',
              background: 'var(--success)',
              flexShrink: 0,
              boxShadow: '0 0 6px rgba(16,185,129,0.5)',
            }} />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Sistema activo</p>
              <p style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>v1.1 · Producción</p>
            </div>
            <Activity size={12} color="var(--success)" />
          </div>
        </div>
      )}
    </aside>
  );
}
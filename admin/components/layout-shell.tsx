'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { useState, useEffect, useCallback } from 'react';
import { Bell, Search, ChevronRight, Menu, X } from 'lucide-react';
import { useAdminSocket } from '@/hooks/useAdminSocket';
import { AdminNotificationPayload } from '@/lib/socket';
import { getNotifications } from '@/lib/api';
import { toast } from 'sonner';

const EVENT_ROUTES: Record<string, string> = {
  NEW_PROVIDER:             '/verification',
  NEW_PLAN_REQUEST:         '/plan-requests',
  NEW_YAPE_PAYMENT:         '/yape-payments',
  NEW_USER:                 '/users',
  TRUST_VALIDATION_REQUEST: '/trust-validation',
};

interface TopbarProps {
  onMenuClick: () => void;
  mobileOpen: boolean;
}

function Topbar({ onMenuClick, mobileOpen }: TopbarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const [pendingCount, setPendingCount] = useState(0);

  // Init badge from server unread count
  useEffect(() => {
    getNotifications(1)
      .then((res) => setPendingCount(res.unreadCount))
      .catch(() => {});
  }, []);

  const handleAdminEvent = useCallback((payload: AdminNotificationPayload) => {
    setPendingCount((n) => n + 1);
    const route = EVENT_ROUTES[payload.type];
    toast(payload.title, {
      description: payload.body,
      duration: 6000,
      action: route ? { label: 'Ver', onClick: () => router.push(route) } : undefined,
    });
  }, [router]);

  useAdminSocket(handleAdminEvent);

  const breadcrumbs: Record<string, string[]> = {
    '/':               ['Dashboard'],
    '/providers':      ['Gestión', 'Proveedores'],
    '/users':          ['Gestión', 'Usuarios'],
    '/categories':     ['Gestión', 'Categorías'],
    '/reviews':        ['Gestión', 'Reseñas'],
    '/verification':   ['Operaciones', 'Verificación'],
    '/trust-validation':['Operaciones', 'Validación de Confianza'],
    '/plan-requests':  ['Operaciones', 'Solicitudes de Plan'],
    '/yape-payments':  ['Operaciones', 'Pagos Yape'],
    '/notifications':  ['Operaciones', 'Notificaciones'],
    '/reports':        ['Principal', 'Reportes'],
    '/analytics':      ['Principal', 'Analytics'],
  };

  const crumbs = breadcrumbs[pathname] || ['ADMIN'];

  return (
    <header style={{
      height: '60px',
      background: 'var(--surface-1)',
      borderBottom: '1px solid var(--border-default)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      backdropFilter: 'blur(8px)',
      gap: '8px',
    }}>

      {/* Hamburger — mobile only */}
      <button
        className="admin-hamburger"
        onClick={onMenuClick}
        style={{
          width: '34px', height: '34px',
          borderRadius: '8px',
          background: 'var(--surface-3)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'var(--transition)',
        }}
        aria-label="Abrir menú"
      >
        {mobileOpen ? <X size={16} /> : <Menu size={16} />}
      </button>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
        {crumbs.map((crumb, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            {i > 0 && <ChevronRight size={12} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />}
            <span style={{
              fontSize: '13px',
              color: i === crumbs.length - 1 ? 'var(--text-primary)' : 'var(--text-tertiary)',
              fontWeight: i === crumbs.length - 1 ? 600 : 400,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {crumb}
            </span>
          </div>
        ))}
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>

        {/* Search hint — hidden on mobile */}
        <div
          className="admin-search-hint"
          style={{
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: 'var(--surface-3)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'var(--transition)',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-strong)'}
          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-default)'}
        >
          <Search size={13} color="var(--text-tertiary)" />
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Buscar...</span>
          <kbd style={{
            fontSize: '10px',
            padding: '2px 5px',
            background: 'var(--surface-5)',
            border: '1px solid var(--border-strong)',
            borderRadius: '4px',
            color: 'var(--text-tertiary)',
            fontFamily: 'monospace',
          }}>⌘K</kbd>
        </div>

        {/* Notifications */}
        <button
          onClick={() => { router.push('/notifications'); setPendingCount(0); }}
          style={{
            width: '34px', height: '34px',
            borderRadius: '8px',
            background: 'var(--surface-3)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            transition: 'var(--transition)',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'}
          title="Notificaciones"
        >
          <Bell size={14} />
          {pendingCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '4px', right: '4px',
              minWidth: '14px', height: '14px',
              borderRadius: '7px',
              background: 'var(--danger)',
              border: '1.5px solid var(--surface-1)',
              fontSize: '8px',
              fontWeight: 700,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 2px',
            }}>
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </button>

        {/* Admin avatar */}
        <div style={{
          width: '34px', height: '34px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 700,
          color: '#fff',
          cursor: 'pointer',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(59,130,246,0.25)',
        }}>
          A
        </div>
      </div>
    </header>
  );
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-0)' }}>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="admin-mobile-overlay"
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 45,
          }}
        />
      )}

      <Sidebar
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        className={`admin-content${collapsed ? ' sidebar-collapsed' : ''}`}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        <Topbar
          onMenuClick={() => setMobileOpen((v) => !v)}
          mobileOpen={mobileOpen}
        />
        <main style={{
          flex: 1,
          padding: '24px 20px',
          overflowY: 'auto',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}

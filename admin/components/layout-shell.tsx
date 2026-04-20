'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { useState, useEffect, useCallback } from 'react';
import { Bell, Search, ChevronRight } from 'lucide-react';
import { useAdminSocket } from '@/hooks/useAdminSocket';
import { AdminNotificationPayload } from '@/lib/socket';
import { toast } from 'sonner';

// Mapa: tipo de evento → ruta del panel que debe actualizarse
const EVENT_ROUTES: Record<string, string> = {
  NEW_PROVIDER:              '/verification',
  NEW_PLAN_REQUEST:          '/plan-requests',
  NEW_USER:                  '/users',
  TRUST_VALIDATION_REQUEST:  '/trust-validation',
};

function Topbar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const [pendingCount, setPendingCount] = useState(0);

  const handleAdminEvent = useCallback((payload: AdminNotificationPayload) => {
    // Incrementar badge
    setPendingCount(n => n + 1);

    // Toast con link a la página relevante
    const route = EVENT_ROUTES[payload.type];
    toast(payload.title, {
      description: payload.body,
      duration: 6000,
      action: route
        ? { label: 'Ver', onClick: () => router.push(route) }
        : undefined,
    });
  }, [router]);

  useAdminSocket(handleAdminEvent);

  const breadcrumbs: Record<string, string[]> = {
    '/': ['Dashboard'],
    '/providers': ['Gestión', 'Proveedores'],
    '/users': ['Gestión', 'Usuarios'],
    '/categories': ['Gestión', 'Categorías'],
    '/reviews': ['Gestión', 'Reseñas'],
    '/verification': ['Operaciones', 'Verificación'],
    '/trust-validation': ['Operaciones', 'Validación de Confianza'],
    '/plan-requests': ['Operaciones', 'Solicitudes de Plan'],
    '/notifications': ['Operaciones', 'Notificaciones'],
    '/reports': ['Principal', 'Reportes'],
    '/analytics': ['Principal', 'Analytics'],
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
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      backdropFilter: 'blur(8px)',
    }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {crumbs.map((crumb, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {i > 0 && <ChevronRight size={12} color="var(--text-tertiary)" />}
            <span style={{
              fontSize: '13px',
              color: i === crumbs.length - 1 ? 'var(--text-primary)' : 'var(--text-tertiary)',
              fontWeight: i === crumbs.length - 1 ? 600 : 400,
            }}>
              {crumb}
            </span>
          </div>
        ))}
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Search hint */}
        <div style={{
          display: 'flex',
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
  const [sidebarWidth, setSidebarWidth] = useState(260);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-0)' }}>
      <Sidebar />
      <div style={{
        flex: 1,
        marginLeft: '260px',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <Topbar />
        <main style={{
          flex: 1,
          padding: '28px 28px',
          overflowY: 'auto',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
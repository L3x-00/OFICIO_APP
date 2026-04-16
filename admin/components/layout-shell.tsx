'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { useState, useEffect } from 'react';
import { Bell, Search, ChevronRight, Moon } from 'lucide-react';

function Topbar() {
  const pathname = usePathname();

  const breadcrumbs: Record<string, string[]> = {
    '/': ['Dashboard'],
    '/providers': ['Gestión', 'Proveedores'],
    '/users': ['Gestión', 'Usuarios'],
    '/categories': ['Gestión', 'Categorías'],
    '/reviews': ['Gestión', 'Reseñas'],
    '/verification': ['Operaciones', 'Verificación'],
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
        <button style={{
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
          <span style={{
            position: 'absolute',
            top: '5px', right: '5px',
            width: '6px', height: '6px',
            borderRadius: '50%',
            background: 'var(--danger)',
            border: '1.5px solid var(--surface-1)',
          }} />
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
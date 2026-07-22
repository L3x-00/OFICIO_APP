'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Search, ChevronRight, Menu, X, LogOut } from 'lucide-react';
import { useAdminSocket } from '@/hooks/useAdminSocket';
import { AdminNotificationPayload, disconnectAdminSocket } from '@/lib/socket';
import { getNotifications, markNotificationRead, markAllNotificationsRead, clearAdminToken } from '@/lib/api';
import type { NotificationItem } from '@/lib/api';
import { toast } from 'sonner';
import { AiChatWidget } from './ai-chat-widget';

// Mapeo type → ruta destino. Las rutas viejas (`/verification`,
// `/plan-requests`, etc.) siguen activas, pero la versión nueva apunta a
// las pantallas tabuladas para evitar context-switching al usuario.
const EVENT_ROUTES: Record<string, string> = {
  APROBADO:                 '/operations/queue',
  RECHAZADO:                '/operations/queue',
  MAS_INFO:                 '/operations/queue',
  VERIFICACION_REVOCADA:    '/operations/queue',
  PLAN_SOLICITADO:          '/operations/payments',
  PLAN_APROBADO:            '/operations/payments',
  PLAN_RECHAZADO:           '/operations/payments',
  NEW_PROVIDER:             '/operations/queue',
  NEW_PLAN_REQUEST:         '/operations/payments',
  NEW_YAPE_PAYMENT:         '/operations/payments',
  NEW_USER:                 '/management',
  TRUST_VALIDATION_REQUEST: '/operations/queue',
};

interface TopbarProps {
  onMenuClick: () => void;
  mobileOpen: boolean;
}

function Topbar({ onMenuClick, mobileOpen }: TopbarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const notifRef = useRef<HTMLDivElement | null>(null);
  const menuRef  = useRef<HTMLDivElement | null>(null);

  const refreshNotifs = useCallback(() => {
    getNotifications({ page: 1 })
      .then((res) => { setPendingCount(res.unreadCount); setItems(res.data); })
      .catch(() => {});
  }, []);

  useEffect(() => { refreshNotifs(); }, [refreshNotifs]);

  // Respaldo liviano para pestañas abiertas por horas. El socket sigue
  // siendo inmediato; este ciclo corrige cualquier evento perdido.
  useEffect(() => {
    const refreshWhenVisible = () => {
      if (!document.hidden) refreshNotifs();
    };
    const timer = window.setInterval(refreshWhenVisible, 60_000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refreshNotifs]);

  // Cierra dropdowns al hacer click fuera. Pattern estándar para popovers
  // hechos a mano (sin Radix) — listener global mientras estén abiertos.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [notifOpen, menuOpen]);

  const handleAdminEvent = useCallback((payload: AdminNotificationPayload) => {
    const route = EVENT_ROUTES[payload.type];
    toast(payload.title, {
      description: payload.body,
      duration: 6000,
      action: route ? { label: 'Ver', onClick: () => router.push(route) } : undefined,
    });
  }, [router]);

  useAdminSocket(handleAdminEvent, refreshNotifs);

  const breadcrumbs: Record<string, string[]> = {
    '/':                          ['Dashboard'],
    '/management':                ['Gestión', 'Proveedores y Usuarios'],
    '/providers':                 ['Gestión', 'Proveedores'],
    '/users':                     ['Gestión', 'Usuarios'],
    '/categories':                ['Gestión', 'Categorías'],
    '/reviews':                   ['Gestión', 'Reseñas'],
    '/marketplace/offers':        ['Marketplace', 'Ofertas'],
    '/marketplace/chats':         ['Marketplace', 'Chats'],
    '/operations/queue':          ['Operaciones', 'Verificación y Validación'],
    '/operations/payments':       ['Operaciones', 'Pagos y Solicitudes'],
    '/verification':              ['Operaciones', 'Verificación'],
    '/trust-validation':          ['Operaciones', 'Validación de Confianza'],
    '/plan-requests':             ['Operaciones', 'Solicitudes de Plan'],
    '/yape-payments':             ['Operaciones', 'Pagos Yape'],
    '/notifications':             ['Operaciones', 'Notificaciones'],
    '/reports':                   ['Principal', 'Reportes'],
    '/analytics':                 ['Principal', 'Analytics'],
    '/analytics/ia':              ['Principal', 'Observabilidad IA'],
  };

  const crumbs = breadcrumbs[pathname] || ['ADMIN'];

  function submitSearch() {
    const q = searchTerm.trim();
    if (!q) return;
    // El destino unificado de búsqueda es /management: ahí están proveedores
    // y usuarios en tabs con el filtro `search` reenviado por query string.
    router.push(`/management?search=${encodeURIComponent(q)}`);
  }

  async function openNotif(n: NotificationItem) {
    setNotifOpen(false);
    if (!n.isRead) {
      try { await markNotificationRead(n.id); } catch {}
      setItems((prev) => prev.map((it) => it.id === n.id ? { ...it, isRead: true } : it));
      setPendingCount((c) => Math.max(0, c - 1));
    }
    const route = EVENT_ROUTES[n.type] || '/notifications';
    router.push(route);
  }

  async function readAll() {
    try { await markAllNotificationsRead(); } catch {}
    setItems((prev) => prev.map((it) => ({ ...it, isRead: true })));
    setPendingCount(0);
  }

  function logout() {
    disconnectAdminSocket();
    clearAdminToken();
    router.push('/login');
  }

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

        {/* Búsqueda funcional — manda al /management con el filtro aplicado. */}
        <form
          className="admin-search-hint"
          onSubmit={(e) => { e.preventDefault(); submitSearch(); }}
          style={{
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: 'var(--surface-3)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            transition: 'var(--transition)',
          }}
        >
          <Search size={13} color="var(--text-tertiary)" />
          <input
            type="text"
            placeholder="Buscar usuario, negocio o profesional…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              width: '220px',
            }}
          />
        </form>

        {/* Notifications — dropdown con los últimos items + click navega. */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
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
          {notifOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              width: '340px',
              background: 'var(--surface-1)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              boxShadow: '0 14px 30px rgba(0,0,0,0.18)',
              maxHeight: '440px',
              overflowY: 'auto',
              zIndex: 50,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderBottom: '1px solid var(--border-default)',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Notificaciones
                </span>
                {pendingCount > 0 && (
                  <button onClick={readAll}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontSize: '11px', color: 'var(--brand-light)',
                    }}>
                    Marcar todas como leídas
                  </button>
                )}
              </div>
              {items.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                  Sin notificaciones recientes.
                </div>
              ) : (
                items.slice(0, 8).map((n) => (
                  <button key={n.id} onClick={() => openNotif(n)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 14px',
                      background: n.isRead ? 'transparent' : 'rgba(59,130,246,0.06)',
                      border: 'none',
                      borderBottom: '1px solid var(--border-default)',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                    }}>
                    <div style={{ fontSize: '12.5px', fontWeight: n.isRead ? 400 : 600, marginBottom: '2px' }}>
                      {n.title ?? n.type}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                  </button>
                ))
              )}
              <button onClick={() => { setNotifOpen(false); router.push('/notifications'); }}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: '12px', color: 'var(--brand-light)',
                }}>
                Ver todas →
              </button>
            </div>
          )}
        </div>

        {/* Admin avatar — abre menu con cerrar sesión. */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button onClick={() => setMenuOpen((v) => !v)}
            style={{
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
              border: 'none',
              boxShadow: '0 2px 8px rgba(59,130,246,0.25)',
            }}>
            A
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              minWidth: '180px',
              background: 'var(--surface-1)',
              border: '1px solid var(--border-default)',
              borderRadius: '10px',
              boxShadow: '0 14px 30px rgba(0,0,0,0.18)',
              zIndex: 50,
              padding: '4px',
            }}>
              <button onClick={logout}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 10px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--danger)',
                  borderRadius: '6px',
                  fontSize: '13px',
                }}>
                <LogOut size={14} />
                Cerrar sesión
              </button>
            </div>
          )}
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

      {/* Asistente IA "Ofi" — FAB flotante (Fase 7). Fuera del <main> para
          que flote sobre todo el panel. No aparece en /login (early return). */}
      <AiChatWidget />
    </div>
  );
}

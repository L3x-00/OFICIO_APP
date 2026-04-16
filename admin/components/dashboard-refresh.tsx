'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props { onRefresh?: () => void | Promise<void>; }

export function DashboardRefreshButton({ onRefresh }: Props) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await onRefresh?.(); }
    finally { setTimeout(() => setIsRefreshing(false), 500); }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        padding: '8px 16px',
        background: 'var(--surface-3)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        color: isRefreshing ? 'var(--brand-light)' : 'var(--text-secondary)',
        fontSize: '13px',
        fontWeight: 500,
        cursor: isRefreshing ? 'not-allowed' : 'pointer',
        opacity: isRefreshing ? 0.7 : 1,
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={e => !isRefreshing && ((e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)')}
      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'}
    >
      <RefreshCw
        size={13}
        style={{
          animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none',
          color: isRefreshing ? 'var(--brand-light)' : 'currentColor',
        }}
      />
      {isRefreshing ? 'Actualizando...' : 'Actualizar'}
    </button>
  );
}
'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  onRefresh?: () => void | Promise<void>;
}

export function DashboardRefreshButton({ onRefresh }: Props) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="flex items-center gap-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all disabled:opacity-50"
    >
      <RefreshCw
        size={14}
        className={isRefreshing ? 'animate-spin' : ''}
      />
      {isRefreshing ? 'Actualizando...' : 'Actualizar'}
    </button>
  );
}

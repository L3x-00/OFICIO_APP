'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export function DashboardRefreshButton() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    // Restaurar el ícono tras 1.5s (el refresh es instantáneo en Next.js)
    setTimeout(() => setIsRefreshing(false), 1500);
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

'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import {
  Eye,
  PhoneCall,
  MessageCircle,
  Star,
  Share2,
} from 'lucide-react';
import type {
  Provider,
  Analytics,
  Review,
} from '@/lib/types';

export default function PanelHomePage() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    async function load() {
      try {
        const prov = await api.getMyProfile();
        setProvider(prov);
        const stats = await api.getAnalytics();
        setAnalytics(stats);
        // Reviews se obtienen del provider
        setReviews([]);
      } catch {
        // error ya manejado en api
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const planBadgeColor =
    provider?.subscription?.plan === 'PREMIUM'
      ? 'bg-amber/20 text-amber'
      : provider?.subscription?.plan === 'ESTANDAR'
      ? 'bg-blue-500/20 text-blue-400'
      : 'bg-text-muted/20 text-text-muted';

  const planLabel = provider?.subscription?.plan ?? 'Gratis';

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-bg-card border border-white/5 rounded-card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl">
            {provider?.businessName?.charAt(0)?.toUpperCase() || 'P'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              Hola, {provider?.businessName || user?.firstName}
            </h1>
            <p className="text-text-muted text-sm">
              {provider?.type === 'NEGOCIO' ? 'Negocio' : 'Profesional'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${planBadgeColor}`}
          >
            Plan {planLabel}
          </span>
          <button className="text-text-secondary hover:text-primary transition-colors">
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {/* Mini métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Eye}
          label="Visitas este mes"
          value={analytics?.totalViews ?? 0}
        />
        <MetricCard
          icon={MessageCircle}
          label="WhatsApp"
          value={analytics?.totalWhatsappClicks ?? 0}
        />
        <MetricCard
          icon={PhoneCall}
          label="Llamadas"
          value={analytics?.totalCallClicks ?? 0}
        />
        <MetricCard
          icon={Star}
          label="Rating"
          value={provider?.averageRating?.toFixed(1) ?? '0.0'}
        />
      </div>

      {/* Últimas reseñas */}
      <div className="bg-bg-card border border-white/5 rounded-card p-6">
        <h2 className="text-lg font-bold text-text-primary mb-4">
          Últimas reseñas
        </h2>
        {reviews.length === 0 ? (
          <p className="text-text-muted text-sm">
            Aún no tienes reseñas.
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.slice(0, 3).map((r) => (
              <div
                key={r.id}
                className="border-b border-white/5 pb-3 last:border-0"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber text-sm">
                    {'★'.repeat(r.rating)}{'★'.repeat(5 - r.rating)}
                  </span>
                  <span className="text-text-muted text-xs">
                    {r.user?.firstName} {r.user?.lastName}
                  </span>
                </div>
                <p className="text-text-secondary text-sm">
                  {r.comment || 'Sin comentario.'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-bg-card border border-white/5 rounded-card p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
          <Icon className="text-primary" size={18} />
        </div>
        <div>
          <p className="text-text-muted text-xs">{label}</p>
          <p className="text-text-primary font-bold text-lg">{value}</p>
        </div>
      </div>
    </div>
  );
}
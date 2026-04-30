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
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCountUp } from '@/lib/hooks';
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
        const [stats, revs] = await Promise.all([
          api.getAnalytics(),
          api.getProviderReviews(prov.id, 3),
        ]);
        setAnalytics(stats);
        setReviews(revs);
      } catch {
        // error ya manejado en api
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <PanelHomeSkeleton />;
  }

  const planBadgeColor =
    provider?.subscription?.plan === 'PREMIUM'
      ? 'bg-amber/20 text-amber border-amber/40'
      : provider?.subscription?.plan === 'ESTANDAR'
      ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
      : 'bg-text-muted/15 text-text-muted border-text-muted/30';

  const planLabel = provider?.subscription?.plan ?? 'Gratis';

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Welcome card */}
      <div
        data-reveal
        className="relative bg-gradient-to-br from-primary/15 via-bg-card to-bg-card border border-primary/20 rounded-2xl p-6 sm:p-7 overflow-hidden"
      >
        <div className="blob bg-primary/30 w-72 h-72 -top-20 -right-20 animate-float-slow" aria-hidden />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-glow-md ring-2 ring-primary/30 flex-shrink-0">
              {provider?.businessName?.charAt(0)?.toUpperCase() || 'P'}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                Hola, {provider?.businessName || user?.firstName}
              </h1>
              <p className="text-text-secondary text-sm mt-0.5">
                {provider?.type === 'NEGOCIO' ? 'Negocio activo' : 'Profesional activo'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-center">
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${planBadgeColor}`}
            >
              Plan {planLabel}
            </span>
            <button
              onClick={() => {
                const url = `${window.location.origin}/proveedor/${provider?.id}`;
                navigator.clipboard.writeText(url).then(() => {
                  toast.success('Enlace copiado al portapapeles');
                });
              }}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-primary/20 hover:text-primary text-text-secondary flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-glow-sm"
              title="Copiar enlace de perfil"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Mini métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Eye}
          label="Visitas este mes"
          value={analytics?.totalViews ?? 0}
          color="text-primary"
          bg="bg-primary/10"
          delay={0}
        />
        <MetricCard
          icon={MessageCircle}
          label="WhatsApp"
          value={analytics?.totalWhatsappClicks ?? 0}
          color="text-green"
          bg="bg-green/10"
          delay={1}
        />
        <MetricCard
          icon={PhoneCall}
          label="Llamadas"
          value={analytics?.totalCallClicks ?? 0}
          color="text-amber"
          bg="bg-amber/10"
          delay={2}
        />
        <MetricCard
          icon={Star}
          label="Rating"
          value={provider?.averageRating ?? 0}
          color="text-blue-400"
          bg="bg-blue-400/10"
          decimals={1}
          delay={3}
        />
      </div>

      {/* Últimas reseñas */}
      <div
        data-reveal
        className="bg-bg-card border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-text-primary">Últimas reseñas</h2>
          {reviews.length > 0 && (
            <a
              href="#"
              className="text-primary hover:text-primary-light text-xs font-semibold inline-flex items-center gap-1 group"
            >
              Ver todas
              <ArrowRight
                size={12}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </a>
          )}
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center animate-float-slow">
              <Star size={28} className="text-text-muted/40" />
            </div>
            <p className="text-text-muted text-sm">Aún no tienes reseñas.</p>
            <p className="text-text-muted/60 text-xs mt-1">
              Comparte tu perfil para empezar a recibir opiniones.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.slice(0, 3).map((r, i) => (
              <div
                key={r.id}
                className="border-b border-white/5 pb-4 last:border-0 last:pb-0 animate-fade-in-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-amber text-sm tracking-tighter">
                    {'★'.repeat(r.rating)}
                    <span className="text-amber/30">{'★'.repeat(5 - r.rating)}</span>
                  </span>
                  <span className="text-text-muted text-xs">·</span>
                  <span className="text-text-muted text-xs">
                    {r.user?.firstName} {r.user?.lastName}
                  </span>
                </div>
                <p className="text-text-secondary text-sm leading-relaxed line-clamp-2">
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
  color,
  bg,
  decimals = 0,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  bg: string;
  decimals?: number;
  delay?: number;
}) {
  // Counter solo para enteros
  const intTarget = decimals === 0 ? Math.floor(value) : 0;
  const { ref, value: counted } = useCountUp(intTarget, 1500);
  const display = decimals === 0
    ? counted.toLocaleString('es-PE')
    : value.toFixed(decimals);

  return (
    <div
      data-reveal
      className={`reveal-delay-${delay + 1} group bg-bg-card border border-white/5 rounded-2xl p-4 hover:border-primary/30 hover-lift transition-all duration-300`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon className={color} size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-text-muted text-xs truncate">{label}</p>
          <p className={`font-bold text-xl tabular-nums ${color}`}>
            <span ref={ref}>{display}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function PanelHomeSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-32 rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-20 rounded-2xl" />
        ))}
      </div>
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  );
}

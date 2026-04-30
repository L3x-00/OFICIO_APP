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
import { useProfileType } from '@/lib/profile-type-context';
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
  const { activeType } = useProfileType();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const prov = await api.getMyProfile(activeType ?? undefined);
        if (cancelled) return;
        setProvider(prov);

        // Cargar analítica y reseñas de forma independiente: si una falla,
        // la otra debe seguir mostrándose. (Antes Promise.all rechazaba ambas.)
        const [statsRes, revsRes] = await Promise.allSettled([
          api.getAnalytics(activeType ?? undefined),
          api.getProviderReviews(prov.id, 3),
        ]);
        if (cancelled) return;
        if (statsRes.status === 'fulfilled') setAnalytics(statsRes.value);
        if (revsRes.status === 'fulfilled') setReviews(revsRes.value);
      } catch {
        // perfil falló — error ya manejado en api
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [activeType]);

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
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 pb-20 md:pb-0">
      <div className="space-y-6 min-w-0">
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
            {reviews.slice(0, 3).map((r, i) => {
              const fullName = [r.user?.firstName, r.user?.lastName]
                .filter(Boolean)
                .join(' ')
                .trim() || 'Cliente';
              const initial = (r.user?.firstName?.charAt(0) || 'C').toUpperCase();
              return (
                <div
                  key={r.id}
                  className="flex items-start gap-3 border-b border-white/5 pb-4 last:border-0 last:pb-0 animate-fade-in-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {/* Avatar para que el autor sea visible incluso en móviles estrechos */}
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-primary text-white font-bold text-xs flex items-center justify-center ring-1 ring-primary/30">
                    {r.user?.avatarUrl ? (
                      <img
                        src={r.user.avatarUrl}
                        alt={fullName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      initial
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
                      <span className="text-text-primary text-sm font-semibold truncate max-w-full">
                        {fullName}
                      </span>
                      <span className="text-amber text-xs tracking-tighter leading-none">
                        {'★'.repeat(r.rating)}
                        <span className="text-amber/30">{'★'.repeat(5 - r.rating)}</span>
                      </span>
                    </div>
                    <p className="text-text-secondary text-sm leading-relaxed line-clamp-2 break-words">
                      {r.comment || 'Sin comentario.'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>

      {/* Columna derecha: resumen + atajos (xl+) */}
      <SummaryColumn provider={provider} planLabel={planLabel} planBadgeColor={planBadgeColor} />
    </div>
  );
}

function SummaryColumn({
  provider,
  planLabel,
  planBadgeColor,
}: {
  provider: Provider | null;
  planLabel: string;
  planBadgeColor: string;
}) {
  return (
    <aside className="hidden xl:block space-y-5 sticky top-6 self-start">
      <div className="bg-bg-card border border-white/5 rounded-2xl p-5">
        <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">
          Resumen del perfil
        </p>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-glow-sm flex-shrink-0">
            {provider?.businessName?.charAt(0)?.toUpperCase() || 'P'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-text-primary font-bold text-sm truncate">
              {provider?.businessName ?? '—'}
            </div>
            <div className="text-text-muted text-xs">
              {provider?.type === 'NEGOCIO' ? 'Negocio' : 'Profesional'}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Plan</span>
            <span className={`px-2 py-0.5 rounded-full font-semibold border ${planBadgeColor}`}>
              {planLabel}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Rating</span>
            <span className="text-amber font-bold tabular-nums flex items-center gap-1">
              <Star size={11} className="fill-amber" />
              {(provider?.averageRating ?? 0).toFixed(1)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Reseñas</span>
            <span className="text-text-primary font-semibold tabular-nums">
              {provider?.totalReviews ?? 0}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Disponibilidad</span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
              provider?.availability === 'DISPONIBLE'
                ? 'bg-green/15 text-green border-green/30'
                : provider?.availability === 'OCUPADO'
                ? 'bg-amber/15 text-amber border-amber/30'
                : 'bg-red/15 text-red border-red/30'
            }`}>
              {provider?.availability === 'DISPONIBLE'
                ? 'Disponible'
                : provider?.availability === 'OCUPADO'
                ? 'Ocupado'
                : 'Con demora'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-bg-card border border-white/5 rounded-2xl p-5">
        <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">
          Accesos rápidos
        </p>
        <div className="space-y-1">
          <QuickLink href="/panel/perfil" label="Editar mi perfil" />
          <QuickLink href="/panel/servicios" label="Gestionar servicios" />
          <QuickLink href="/panel/estadisticas" label="Ver estadísticas" />
          <QuickLink href="/panel/ajustes" label="Cambiar de plan" />
        </div>
      </div>
    </aside>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between text-text-secondary hover:text-primary text-sm py-2 px-2.5 rounded-lg hover:bg-white/5 transition-colors group"
    >
      {label}
      <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
    </a>
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

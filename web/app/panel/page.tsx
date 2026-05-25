'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
import type { Provider, Analytics, Review } from '@/lib/types';

// ========== ANIMACIONES TIPADAS CORRECTAMENTE ==========
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const fadeInUp = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

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
    return () => {
      cancelled = true;
    };
  }, [activeType]);

  if (loading) {
    return <PanelHomeSkeleton />;
  }

  const planBadgeColor =
    provider?.subscription?.plan === 'PREMIUM'
      ? 'bg-amber/20 text-amber border-amber/40'
      : provider?.subscription?.plan === 'ESTANDAR'
      ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
      : 'bg-white/5 text-white/50 border-white/10';

  const planLabel = provider?.subscription?.plan ?? 'Gratis';

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 pb-20 md:pb-0"
    >
      <div className="space-y-6 min-w-0">
        {/* Welcome card con glass + gradiente */}
        <motion.div
          variants={fadeInUp}
          className="relative glass rounded-2xl p-6 sm:p-7 overflow-hidden border border-white/10"
        >
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/20 rounded-full blur-[80px] animate-float-slow pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-extrabold text-2xl shadow-glow-md ring-2 ring-primary/30 flex-shrink-0">
                {provider?.businessName?.charAt(0)?.toUpperCase() || 'P'}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Hola, {provider?.businessName || user?.firstName}
                </h1>
                <p className="text-white/50 text-sm mt-0.5">
                  {provider?.type === 'NEGOCIO' ? 'Negocio activo' : 'Profesional activo'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-center">
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${planBadgeColor}`}>
                Plan {planLabel}
              </span>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/proveedor/${provider?.id}`;
                  navigator.clipboard.writeText(url).then(() => {
                    toast.success('Enlace copiado al portapapeles');
                  });
                }}
                className="w-9 h-9 rounded-full glass flex items-center justify-center text-white/60 hover:text-primary-light hover:shadow-glow-sm transition-all duration-200 hover:scale-110"
                title="Copiar enlace de perfil"
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Mini métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Eye}
            label="Visitas este mes"
            value={analytics?.totalViews ?? 0}
            color="text-primary-light"
            bg="bg-primary/10"
            delay={0}
          />
          <MetricCard
            icon={MessageCircle}
            label="WhatsApp"
            value={analytics?.totalWhatsappClicks ?? 0}
            color="text-accent"
            bg="bg-accent/10"
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
            color="text-yellow-400"
            bg="bg-yellow-400/10"
            decimals={1}
            delay={3}
          />
        </div>

        {/* Últimas reseñas */}
        <motion.div
          variants={fadeInUp}
          className="glass rounded-2xl p-6 border border-white/10"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white">Últimas reseñas</h2>
            {reviews.length > 0 && (
              <a
                href="https://play.google.com/store/apps/details?id=com.oficioapp.mobile"
                className="text-primary-light hover:text-primary text-xs font-semibold inline-flex items-center gap-1 group"
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
              <div className="w-16 h-16 mx-auto mb-3 rounded-full glass flex items-center justify-center">
                <Star size={28} className="text-white/30" />
              </div>
              <p className="text-white/50 text-sm">Aún no tienes reseñas.</p>
              <p className="text-white/30 text-xs mt-1">
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
                  <motion.div
                    key={r.id}
                    variants={itemVariants}
                    custom={i}
                    className="flex items-start gap-3 border-b border-white/10 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-light text-white font-bold text-xs flex items-center justify-center ring-1 ring-primary/30">
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
                        <span className="text-white text-sm font-semibold truncate max-w-full">
                          {fullName}
                        </span>
                        <span className="text-amber text-xs tracking-tighter leading-none">
                          {'★'.repeat(r.rating)}
                          <span className="text-amber/30">{'★'.repeat(5 - r.rating)}</span>
                        </span>
                      </div>
                      <p className="text-white/60 text-sm leading-relaxed line-clamp-2 break-words">
                        {r.comment || 'Sin comentario.'}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Columna derecha: resumen + atajos */}
      <SummaryColumn provider={provider} planLabel={planLabel} planBadgeColor={planBadgeColor} />
    </motion.div>
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
    <motion.aside
      variants={itemVariants}
      className="hidden xl:block space-y-5 sticky top-6 self-start"
    >
      <div className="glass rounded-2xl p-5 border border-white/10">
        <p className="text-white/30 text-[10px] uppercase tracking-widest font-bold mb-3">
          Resumen del perfil
        </p>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-extrabold text-lg shadow-glow-sm flex-shrink-0">
            {provider?.businessName?.charAt(0)?.toUpperCase() || 'P'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white font-bold text-sm truncate">
              {provider?.businessName ?? '—'}
            </div>
            <div className="text-white/40 text-xs">
              {provider?.type === 'NEGOCIO' ? 'Negocio' : 'Profesional'}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">Plan</span>
            <span className={`px-2 py-0.5 rounded-full font-semibold border ${planBadgeColor}`}>
              {planLabel}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">Rating</span>
            <span className="text-amber font-bold tabular-nums flex items-center gap-1">
              <Star size={11} className="fill-amber" />
              {(provider?.averageRating ?? 0).toFixed(1)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">Reseñas</span>
            <span className="text-white font-semibold tabular-nums">
              {provider?.totalReviews ?? 0}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">Disponibilidad</span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                provider?.availability === 'DISPONIBLE'
                  ? 'bg-green/15 text-green border-green/30'
                  : provider?.availability === 'OCUPADO'
                  ? 'bg-amber/15 text-amber border-amber/30'
                  : 'bg-rose/15 text-rose border-rose/30'
              }`}
            >
              {provider?.availability === 'DISPONIBLE'
                ? 'Disponible'
                : provider?.availability === 'OCUPADO'
                ? 'Ocupado'
                : 'Con demora'}
            </span>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 border border-white/10">
        <p className="text-white/30 text-[10px] uppercase tracking-widest font-bold mb-3">
          Accesos rápidos
        </p>
        <div className="space-y-1">
          <QuickLink href="/panel/perfil" label="Editar mi perfil" />
          <QuickLink href="/panel/servicios" label="Gestionar servicios" />
          <QuickLink href="/panel/estadisticas" label="Ver estadísticas" />
          <QuickLink href="/panel/ajustes" label="Cambiar de plan" />
        </div>
      </div>
    </motion.aside>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between text-white/50 hover:text-primary-light text-sm py-2 px-2.5 rounded-lg hover:bg-white/5 transition-colors group"
    >
      {label}
      <ArrowRight
        size={12}
        className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
      />
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
  const intTarget = decimals === 0 ? Math.floor(value) : 0;
  const { ref, value: counted } = useCountUp(intTarget, 1500);
  const display = decimals === 0
    ? counted.toLocaleString('es-PE')
    : value.toFixed(decimals);

  return (
    <motion.div
      variants={itemVariants}
      custom={delay}
      className="group glass rounded-2xl p-4 border border-white/10 hover:border-primary/30 transition-all duration-300 hover:shadow-glow-sm"
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon className={color} size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white/40 text-xs truncate">{label}</p>
          <p className={`font-bold text-xl tabular-nums ${color}`}>
            <span ref={ref}>{display}</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function PanelHomeSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-32 rounded-2xl bg-white/5 animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-20 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
      <div className="skeleton h-64 rounded-2xl bg-white/5 animate-pulse" />
    </div>
  );
}
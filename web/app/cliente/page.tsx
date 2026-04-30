'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Mail,
  Phone,
  MapPin,
  FileText,
  Star,
  Heart,
  Briefcase,
  Store,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { clearSession } from '@/lib/auth';
import type { User as UserType, ServiceRequest, Review } from '@/lib/types';

export default function ClientePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const u = await api.getUserProfile();
        setUser(u);
        setRequests([]);
        setReviews([]);
      } catch {
        toast.error('Error al cargar tus datos');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen p-6 space-y-6 max-w-4xl mx-auto">
        <div className="skeleton h-9 w-40 rounded" />
        <div className="skeleton h-32 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div data-reveal className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-extrabold text-text-primary">Mi Panel</h1>
          <button
            onClick={() => {
              clearSession();
              router.push('/');
            }}
            className="flex items-center gap-2 text-text-muted hover:text-red text-sm font-medium transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>

        {/* Perfil */}
        <div data-reveal className="relative bg-gradient-to-br from-primary/10 via-bg-card to-bg-card border border-primary/20 rounded-2xl p-6 overflow-hidden">
          <div className="blob bg-primary/25 w-64 h-64 -top-20 -right-20 animate-float-slow" aria-hidden />

          <div className="relative flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-glow-md ring-2 ring-primary/30 flex-shrink-0">
              {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-lg sm:text-xl font-bold text-text-primary">
                  {user?.firstName} {user?.lastName}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                  Cliente
                </span>
              </div>
              <div className="space-y-1.5 mt-2">
                <div className="flex items-center gap-2 text-text-secondary text-sm">
                  <Mail size={14} className="text-text-muted flex-shrink-0" />
                  <span className="truncate">{user?.email}</span>
                </div>
                {user?.phone && (
                  <div className="flex items-center gap-2 text-text-secondary text-sm">
                    <Phone size={14} className="text-text-muted flex-shrink-0" />
                    {user.phone}
                  </div>
                )}
                {user?.department && (
                  <div className="flex items-center gap-2 text-text-secondary text-sm">
                    <MapPin size={14} className="text-text-muted flex-shrink-0" />
                    {[user.department, user.province, user.district].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mis solicitudes */}
        <Card
          icon={<FileText size={20} className="text-primary" />}
          title="Mis solicitudes de subasta"
        >
          {requests.length === 0 ? (
            <EmptyMini message="No tienes solicitudes activas." />
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="border border-white/5 rounded-xl p-4 flex items-center justify-between hover:border-primary/30 transition-colors"
                >
                  <div>
                    <p className="text-text-primary text-sm font-medium line-clamp-1">
                      {req.description}
                    </p>
                    <span
                      className={`mt-1.5 inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        req.status === 'OPEN'
                          ? 'bg-green/15 text-green border-green/30'
                          : req.status === 'CLOSED'
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : 'bg-text-muted/15 text-text-muted border-text-muted/30'
                      }`}
                    >
                      {req.status === 'OPEN'
                        ? 'Abierta'
                        : req.status === 'CLOSED'
                        ? 'Cerrada'
                        : 'Expirada'}
                    </span>
                  </div>
                  <span className="text-text-muted text-xs">
                    {req.offers?.length || 0} ofertas
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Mis reseñas */}
        <Card icon={<Star size={20} className="text-amber" />} title="Mis reseñas">
          {reviews.length === 0 ? (
            <EmptyMini message="No has escrito reseñas aún." />
          ) : (
            <div className="space-y-3">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="border border-white/5 rounded-xl p-4 hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-amber text-sm">
                      {'★'.repeat(rev.rating)}
                      <span className="text-amber/30">{'★'.repeat(5 - rev.rating)}</span>
                    </span>
                    <span className="text-text-muted text-xs">· Proveedor</span>
                  </div>
                  <p className="text-text-secondary text-sm">
                    {rev.comment || 'Sin comentario.'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Favoritos */}
        <Card icon={<Heart size={20} className="text-red" />} title="Favoritos">
          <EmptyMini message="Próximamente podrás ver tus favoritos aquí." />
        </Card>

        {/* CTA hacerse proveedor */}
        <div data-reveal="scale" className="relative overflow-hidden rounded-2xl gradient-border bg-gradient-to-br from-primary/15 via-bg-card to-amber/10 p-6 sm:p-8 text-center">
          <div className="blob bg-primary/30 w-72 h-72 -top-20 -right-20 animate-float-slow" aria-hidden />

          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-full px-3 py-1 mb-4">
              <Sparkles size={12} className="text-primary" />
              <span className="text-primary text-[10px] font-bold uppercase tracking-widest">
                Hazte profesional
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-text-primary mb-2">
              ¿Quieres ofrecer tus servicios en{' '}
              <span className="text-gradient">OficioApp</span>?
            </h2>
            <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
              Regístrate como profesional o negocio y empieza a recibir clientes desde hoy.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href="#"
                className="btn-primary press-effect inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
              >
                <Briefcase size={16} />
                Registrarme como Profesional
              </a>
              <a
                href="#"
                className="btn-ghost press-effect inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
              >
                <Store size={16} />
                Registrar mi Negocio
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div data-reveal className="bg-bg-card border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors">
      <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2.5">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

function EmptyMini({ message }: { message: string }) {
  return <p className="text-text-muted text-sm py-2">{message}</p>;
}

'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Star,
  Heart,
  Briefcase,
  Store,
} from 'lucide-react';
import type { User as UserType, ServiceRequest, Review } from '@/lib/types';

export default function ClientePage() {
  const [user, setUser] = useState<UserType | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const u = await api.getUserProfile();
        setUser(u);
        // Intentar cargar solicitudes y reseñas
        // Si el backend tiene endpoints para cliente, se llamarían aquí
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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <h1 className="text-2xl font-bold text-text-primary">Mi Panel</h1>

      {/* Perfil */}
      <div className="bg-bg-card border border-white/5 rounded-card p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-2xl">
            {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              {user?.firstName} {user?.lastName}
            </h2>
            <div className="space-y-1 mt-2">
              <div className="flex items-center gap-2 text-text-secondary text-sm">
                <Mail size={14} />
                {user?.email}
              </div>
              {user?.phone && (
                <div className="flex items-center gap-2 text-text-secondary text-sm">
                  <Phone size={14} />
                  {user.phone}
                </div>
              )}
              {user?.department && (
                <div className="flex items-center gap-2 text-text-secondary text-sm">
                  <MapPin size={14} />
                  {user.department}, {user.province}, {user.district}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mis solicitudes */}
      <div className="bg-bg-card border border-white/5 rounded-card p-6">
        <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
          <FileText size={20} />
          Mis solicitudes de subasta
        </h2>
        {requests.length === 0 ? (
          <p className="text-text-muted text-sm">No tienes solicitudes activas.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="border border-white/5 rounded-card p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-text-primary text-sm font-medium">
                    {req.description?.slice(0, 60)}...
                  </p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      req.status === 'OPEN'
                        ? 'bg-green/10 text-green'
                        : req.status === 'CLOSED'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-text-muted/10 text-text-muted'
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
      </div>

      {/* Mis reseñas */}
      <div className="bg-bg-card border border-white/5 rounded-card p-6">
        <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
          <Star size={20} />
          Mis reseñas
        </h2>
        {reviews.length === 0 ? (
          <p className="text-text-muted text-sm">No has escrito reseñas aún.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="border border-white/5 rounded-card p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber text-sm">
                    {'★'.repeat(rev.rating)}
                    {'☆'.repeat(5 - rev.rating)}
                  </span>
                  <span className="text-text-muted text-xs">
                    {'Proveedor'}
                  </span>
                </div>
                <p className="text-text-secondary text-sm">
                  {rev.comment || 'Sin comentario.'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Proveedores favoritos */}
      <div className="bg-bg-card border border-white/5 rounded-card p-6">
        <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
          <Heart size={20} />
          Favoritos
        </h2>
        <p className="text-text-muted text-sm">Próximamente podrás ver tus favoritos aquí.</p>
      </div>

      {/* Banner para hacerse proveedor */}
      <div className="bg-primary/10 border border-primary/20 rounded-card p-6 text-center">
        <h2 className="text-lg font-bold text-text-primary mb-2">
          ¿Quieres ofrecer tus servicios en OficioApp?
        </h2>
        <p className="text-text-secondary text-sm mb-4">
          Regístrate como profesional o negocio y empieza a recibir clientes.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href="#"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-button text-sm font-medium transition-colors"
          >
            <Briefcase size={16} />
            Registrarme como Profesional
          </a>
          <a
            href="#"
            className="inline-flex items-center gap-2 border border-primary/30 text-primary hover:bg-primary/10 px-4 py-2 rounded-button text-sm font-medium transition-colors"
          >
            <Store size={16} />
            Registrar mi Negocio
          </a>
        </div>
      </div>
    </div>
  );
}
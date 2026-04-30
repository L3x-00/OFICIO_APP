'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Briefcase, Star, MapPin, Phone, MessageCircle, ShieldCheck } from 'lucide-react';
import { api, type PublicProvider } from '@/lib/api';

const FALLBACK_IMG = '/images/portada.jpeg';

interface CardData {
  cover: string;
  businessName: string;
  category: string;
  rating: number;
  reviews: number;
  description: string;
  location: string;
  phone?: string;
  isWhats: boolean;
}

const PLACEHOLDER: CardData = {
  cover: FALLBACK_IMG,
  businessName: 'Tu negocio aquí',
  category: 'Profesional',
  rating: 0,
  reviews: 0,
  description:
    'Únete a OficioApp y conecta con clientes verificados de tu ciudad. Tu marca puede aparecer aquí.',
  location: 'Perú',
  phone: undefined,
  isWhats: false,
};

export default function FlipCard3D() {
  const [data, setData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const provider = await api.getFeaturedProvider();
      if (cancelled) return;
      setData(provider ? toCardData(provider) : PLACEHOLDER);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <FlipSkeleton />;
  }

  const card = data ?? PLACEHOLDER;

  return (
    <div
      className="flip-3d-perspective relative mx-auto w-[260px] h-[360px] sm:w-[220px] sm:h-[320px] lg:w-[280px] lg:h-[380px]"
      role="region"
      aria-label="Tarjeta de proveedor destacado"
    >
      <div className="flip-3d-inner">
        {/* CARA FRONTAL */}
        <article className="flip-3d-face bg-bg-card border border-white/8 shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.cover}
            alt={card.businessName}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
            }}
          />
          {/* gradient para legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/95 via-bg-dark/30 to-bg-dark/40 pointer-events-none" />

          {/* badge categoría */}
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/15 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg">
            <Briefcase size={11} />
            {card.category}
          </span>

          {/* rating */}
          {card.rating > 0 && (
            <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/15 text-amber text-xs font-bold px-2.5 py-1 rounded-full shadow-lg tabular-nums">
              <Star size={11} className="fill-amber" />
              {card.rating.toFixed(1)}
            </span>
          )}

          {/* nombre */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/85 to-transparent">
            <p className="text-[10px] uppercase tracking-widest text-primary/90 font-bold mb-1">
              Destacado
            </p>
            <h3 className="text-white font-extrabold text-lg leading-tight drop-shadow">
              {card.businessName}
            </h3>
            {card.reviews > 0 && (
              <p className="text-white/70 text-xs mt-1">
                {card.reviews} {card.reviews === 1 ? 'reseña verificada' : 'reseñas verificadas'}
              </p>
            )}
          </div>
        </article>

        {/* CARA TRASERA */}
        <article className="flip-3d-face flip-3d-back bg-bg-card border border-white/8 p-5 sm:p-4 lg:p-5 flex flex-col">
          <div className="inline-flex items-center gap-1.5 bg-primary/15 border border-primary/30 rounded-full px-2.5 py-1 self-start mb-3">
            <Briefcase size={11} className="text-primary" />
            <span className="text-primary text-[10px] font-bold uppercase tracking-wider">
              {card.category}
            </span>
          </div>

          <h3 className="text-text-primary font-bold text-lg leading-tight mb-2">
            {card.businessName}
          </h3>

          <p className="text-text-secondary text-sm leading-relaxed flex-1">
            {truncate(card.description, 100)}
          </p>

          <div className="space-y-2 mt-3 pt-3 border-t border-white/5">
            {card.location && (
              <div className="flex items-center gap-2 text-text-muted text-xs">
                <MapPin size={12} className="text-primary flex-shrink-0" />
                <span className="truncate">{card.location}</span>
              </div>
            )}
            {card.phone && (
              <div className="flex items-center gap-2 text-text-secondary text-xs">
                {card.isWhats ? (
                  <MessageCircle size={12} className="text-green flex-shrink-0" />
                ) : (
                  <Phone size={12} className="text-primary flex-shrink-0" />
                )}
                <span className="truncate">{card.phone}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-3 text-text-muted text-[10px]">
            <div className="relative w-4 h-4">
              <Image
                src="/images/logo/logo_dark.png"
                alt="OficioApp"
                fill
                className="object-contain"
                sizes="16px"
              />
            </div>
            <span className="font-semibold uppercase tracking-wider">
              Disponible en OficioApp
            </span>
            <ShieldCheck size={11} className="text-green" />
          </div>
        </article>
      </div>
    </div>
  );
}

function FlipSkeleton() {
  return (
    <div
      className="relative mx-auto w-[260px] h-[360px] sm:w-[220px] sm:h-[320px] lg:w-[280px] lg:h-[380px] rounded-2xl skeleton"
      aria-hidden="true"
    />
  );
}

/* ── helpers ──────────────────────────────────────────────── */

function toCardData(p: PublicProvider): CardData {
  const cover = pickCover(p);
  const phone = p.whatsapp || p.phone;
  return {
    cover,
    businessName: p.businessName,
    category: p.category?.name ?? 'Profesional',
    rating: p.averageRating ?? 0,
    reviews: p.totalReviews ?? 0,
    description:
      p.description ||
      'Profesional verificado disponible en OficioApp. Conecta con clientes reales de tu zona.',
    location:
      [p.locality?.department, p.locality?.province].filter(Boolean).join(' · ') || 'Perú',
    phone,
    isWhats: !!p.whatsapp,
  };
}

function pickCover(p: PublicProvider): string {
  const imgs = p.images ?? [];
  const cover = imgs.find((i) => i.isCover) ?? imgs[0];
  return cover?.url || FALLBACK_IMG;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return value.slice(0, max).trimEnd() + '…';
}

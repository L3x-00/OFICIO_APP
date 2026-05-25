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
    'Únete a Servi y conecta con clientes verificados de tu ciudad. Tu marca puede aparecer aquí.',
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
    <div className="relative mx-auto w-[280px] h-[380px] sm:w-[260px] sm:h-[360px] lg:w-[300px] lg:h-[400px] group">
      {/* Resplandor ambiental detrás de la tarjeta */}
      <div 
        className="absolute inset-0 scale-125 blur-3xl bg-primary/15 rounded-full group-hover:bg-primary/25 transition-all duration-700 pointer-events-none" 
        aria-hidden="true" 
      />

      <div
        className="flip-3d-perspective relative w-full h-full"
        role="region"
        aria-label="Tarjeta de proveedor destacado"
      >
        <div className="flip-3d-inner">
          {/* CARA FRONTAL */}
          <article className="flip-3d-face bg-black">
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 pointer-events-none" />

            {/* Badge Categoría */}
            <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-accent/10 border border-accent/20 text-accent text-[11px] font-display font-semibold px-2.5 py-1 rounded-full backdrop-blur-md">
              <Briefcase size={11} />
              {card.category}
            </span>

            {/* Badge Rating */}
            {card.rating > 0 && (
              <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-amber/10 border border-amber/20 text-amber text-[11px] font-display font-semibold px-2.5 py-1 rounded-full tabular-nums backdrop-blur-md">
                <Star size={11} className="fill-amber" />
                {card.rating.toFixed(1)}
              </span>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/90 to-transparent">
              <p className="font-display text-[10px] uppercase tracking-[0.18em] text-primary-light font-semibold mb-1">
                Destacado
              </p>
              <h3 className="text-white font-display font-bold text-[18px] leading-tight">
                {card.businessName}
              </h3>
              {card.reviews > 0 && (
                <p className="text-white/50 text-[12px] mt-1">
                  {card.reviews} {card.reviews === 1 ? 'reseña verificada' : 'reseñas verificadas'}
                </p>
              )}
            </div>
          </article>

          {/* CARA TRASERA */}
          <article className="flip-3d-face flip-3d-back p-5 flex flex-col text-white">
            <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 text-primary-light text-[11px] font-display font-semibold px-2.5 py-1 rounded-full self-start backdrop-blur-md">
              <Briefcase size={11} />
              {card.category}
            </span>

            <h3 className="font-display font-bold text-white text-[19px] leading-tight mt-3 mb-2">
              {card.businessName}
            </h3>

            <p className="text-white/60 text-[13.5px] leading-relaxed flex-1">
              {truncate(card.description, 100)}
            </p>

            <div className="space-y-2 mt-3 pt-3 border-t border-white/10">
              {card.location && (
                <div className="flex items-center gap-2 text-white/50 text-[12px]">
                  <MapPin size={12} className="text-accent flex-shrink-0" />
                  <span className="truncate">{card.location}</span>
                </div>
              )}
              {card.phone && (
                <div className="flex items-center gap-2 text-white/50 text-[12px]">
                  {card.isWhats ? (
                    <MessageCircle size={12} className="text-accent flex-shrink-0" />
                  ) : (
                    <Phone size={12} className="text-white/40 flex-shrink-0" />
                  )}
                  <span className="truncate">{card.phone}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-1.5 mt-4 text-white/40 text-[10px]">
              <div className="relative w-4 h-4">
                <Image
                  src="/images/logo/servi.png"
                  alt="Servi"
                  fill
                  className="object-contain"
                  sizes="16px"
                />
              </div>
              <span className="font-display font-semibold uppercase tracking-[0.16em]">
                Disponible en Servi
              </span>
              <ShieldCheck size={11} className="text-accent" />
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

function FlipSkeleton() {
  return (
    <div
      className="relative mx-auto w-[280px] h-[380px] sm:w-[260px] sm:h-[360px] lg:w-[300px] lg:h-[400px] rounded-2xl skeleton"
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
      'Profesional verificado disponible en Servi. Conecta con clientes reales de tu zona.',
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
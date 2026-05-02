'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Coins } from 'lucide-react';
import { isAuthenticated, getUser } from '@/lib/auth';

export default function ReferralBanner() {
  const [authed, setAuthed] = useState(false);
  const [targetHref, setTargetHref] = useState('/login');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isAuthenticated()) {
      setAuthed(false);
      return;
    }
    const user = getUser();
    setAuthed(true);
    const isProvider = user?.role === 'PROVEEDOR' || user?.role === 'ADMIN';
    setTargetHref(isProvider ? '/panel/referidos' : '/cliente?tab=referidos');
  }, []);

  return (
    <section
      id="referidos-banner"
      className="relative py-16 sm:py-20"
    >
      {/* Fondo con gradiente cálido */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber/15 via-bg-dark to-primary/10" />
      <div className="blob bg-amber/30 w-[480px] h-[480px] -top-32 -right-20 animate-float-slow" aria-hidden />
      <div className="blob bg-primary/25 w-[360px] h-[360px] -bottom-24 -left-16 animate-float" aria-hidden />
      <div
        className="absolute inset-0 bg-grid-pattern bg-grid-md opacity-[0.04] pointer-events-none"
        aria-hidden
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          data-reveal="scale"
          className="relative glass-card gradient-border rounded-3xl p-8 sm:p-12 lg:p-14">
          {/* Spotlight */}
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 90% 0%, rgba(245,158,11,0.45), transparent 55%)',
            }}
            aria-hidden
          />

          <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-amber/15 border border-amber/40 rounded-full px-3 py-1 mb-5 animate-pulse-soft">
                <Sparkles size={12} className="text-amber" />
                <span className="text-amber text-[10px] font-bold uppercase tracking-widest">
                  Programa de referidos
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-4">
                Invita a un profesional y gana{' '}
                <span className="inline-flex items-baseline gap-1.5 align-baseline">
                  <span className="text-gradient bg-gradient-to-br from-amber to-primary bg-clip-text text-transparent">
                    50 monedas
                  </span>
                  <Coins
                    size={28}
                    className="text-amber inline-block translate-y-1 sm:translate-y-1.5"
                  />
                </span>
              </h2>

              <p className="text-text-secondary text-base sm:text-lg leading-relaxed mb-7 max-w-xl">
                Tu amigo recibe <strong className="text-amber">5 monedas</strong> de
                bienvenida. Acumula y canjea por planes gratis o servicios reales
                de la comunidad de OficioApp.
              </p>

              <div className="flex flex-wrap gap-3">
                {authed ? (
                  <Link
                    href={targetHref}
                    className="btn-primary press-effect group inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm sm:text-base"
                  >
                    Ir a mis referidos
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </Link>
                ) : (
                  <>
                    <a
                      href="#como-funciona"
                      className="btn-primary press-effect group inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm sm:text-base"
                    >
                      Más información
                      <ArrowRight
                        size={16}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </a>
                    <Link
                      href="/login"
                      className="btn-ghost press-effect inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm sm:text-base"
                    >
                      Iniciar sesión
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Imagen de monedas con efecto 3D sobresaliendo */}
            <div className="hidden lg:flex justify-center items-center">
              <div
                className="coins-glow-wrapper w-72 h-72 lg:w-80 lg:h-80"
                style={{ overflow: 'visible', zIndex: 20 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/coins-banner.png"
                  alt="Monedas de OficioApp"
                  className="w-[520px] h-[520px] max-w-none object-contain"
                  style={{
                    clipPath: 'none',
                    position: 'relative',
                    zIndex: 20,
                    filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.5)) drop-shadow(0 0 40px rgba(245,158,11,0.35))',}}/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Coins } from 'lucide-react';
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
    <section id="referidos-banner" className="relative py-20 sm:py-28 bg-paper-warm overflow-hidden">
      <div className="absolute inset-0 topo pointer-events-none" aria-hidden />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <div
          data-reveal="scale"
          className="relative card-3d overflow-hidden p-8 sm:p-12 lg:p-14"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 items-center">

            <div className="max-w-2xl">
              <div className="chip-eyebrow mb-7" style={{ background: '#FBE8D6', borderColor: '#F4CDA3' }}>
                <span className="dot" style={{ background: '#F59E0B', boxShadow: '0 0 0 4px rgba(245,158,11,0.18)' }} />
                Programa de referidos
              </div>

              <h2 className="font-display font-bold tracking-tightest text-ink text-[34px] sm:text-[44px] leading-[1.05]">
                Invita a un profesional
                <br className="hidden sm:block" />
                y gana{' '}
                <span className="inline-flex items-baseline gap-2 align-baseline">
                  <span className="text-gradient">25 monedas</span>
                  <Coins
                    size={30}
                    className="text-amber inline-block translate-y-1"
                  />
                </span>
              </h2>

              <p className="mt-5 text-ink-3 text-[16px] sm:text-[17px] leading-relaxed">
                Tu amigo recibe <strong className="text-ink font-semibold">5 monedas</strong> de bienvenida.
                Acumula y canjea por planes gratis o servicios reales de la comunidad.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {authed ? (
                  <Link href={targetHref} className="btn btn-ink btn-lg press-effect group">
                    Ir a mis referidos
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </Link>
                ) : (
                  <>
                    <a href="#como-funciona" className="btn btn-ink btn-lg press-effect group">
                      Más información
                      <ArrowRight
                        size={16}
                        className="transition-transform duration-200 group-hover:translate-x-0.5"
                      />
                    </a>
                    <Link href="/login" className="btn btn-ghost btn-lg press-effect">
                      Iniciar sesión
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="hidden lg:flex justify-center items-center">
              <div className="coins-glow-wrapper w-72 h-72">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/coins-banner.png"
                  alt="Monedas de OficioApp"
                  className="w-[440px] h-[440px] max-w-none object-contain"
                  style={{
                    filter: 'drop-shadow(0 18px 38px rgba(245,158,11,0.30))',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

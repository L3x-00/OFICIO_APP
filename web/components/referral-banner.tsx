'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
    <section id="referidos-banner" className="relative py-24 sm:py-32 bg-dark-surface overflow-hidden">
      {/* Fondo con resplandor ámbar */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="relative glass overflow-hidden p-8 sm:p-12 lg:p-14 border-amber/10 shadow-glow-md"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 items-center">

            <div className="max-w-2xl">
              {/* Chip actualizado a tema oscuro */}
              <div className="chip-eyebrow mb-7 bg-amber/10 border-amber/20 text-amber">
                <span className="dot" />
                Programa de referidos
              </div>

              <h2 className="font-display font-bold tracking-tightest text-white text-[34px] sm:text-[44px] leading-[1.05]">
                Invita a un profesional
                <br className="hidden sm:block" />
                y gana{' '}
                <span className="inline-flex items-baseline gap-2 align-baseline">
                  <span className="text-gradient-amber">25 monedas</span>
                  <Coins
                    size={30}
                    className="text-amber inline-block translate-y-1 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                  />
                </span>
              </h2>

              <p className="mt-5 text-white/60 text-[16px] sm:text-[17px] leading-relaxed">
                Tu amigo recibe <strong className="text-white font-semibold">5 monedas</strong> de bienvenida.
                Acumula y canjea por planes gratis o servicios reales de la comunidad.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {authed ? (
                  <Link href={targetHref} className="btn btn-primary btn-lg press-effect group">
                    Ir a mis referidos
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </Link>
                ) : (
                  <>
                    <a href="https://play.google.com/store/apps/details?id=com.oficioapp.mobile" className="btn btn-primary btn-lg press-effect group">
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
                  alt="Monedas de Servi"
                  className="w-[440px] h-[440px] max-w-none object-contain"
                  style={{
                    filter: 'drop-shadow(0 18px 38px rgba(245,158,11,0.30))',
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
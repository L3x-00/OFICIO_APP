'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ArrowUp, Mail, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import LegalModal from '@/components/modals/legal-modal';
import AboutModal from '@/components/modals/about-modal';
import { TERMS_CONTENT, PRIVACY_CONTENT } from '@/components/modals/legal-content';

// ── Animaciones ────────────────────────────────────────────
const footerVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

// ── Enlaces ────────────────────────────────────────────────
const exploreLinks = [
  { label: 'Beneficios', href: '/#beneficios' },
  { label: 'Cómo funciona', href: '/#como-funciona' },
  { label: 'Testimonios', href: '/#testimonios' },
  { label: 'Manual de usuario', href: '/#guia' },
];

const socialLinks = [
  { href: 'https://www.tiktok.com/@ofiapp.pe', src: '/images/social/tiktok.svg', alt: 'TikTok' },
  { href: 'https://www.facebook.com/profile.php?id=61585849044376', src: '/images/social/facebook.svg', alt: 'Facebook' },
  { href: 'https://www.instagram.com/ofiapp.pe/', src: '/images/social/instagram.svg', alt: 'Instagram' },
  { href: 'https://mail.google.com/mail/?view=cm&fs=1&to=soporteofiapp@gmail.com', src: '/images/social/gmail.svg', alt: 'Gmail' },
];

// ── Componente ─────────────────────────────────────────────
export default function Footer() {
  const year = new Date().getFullYear();
  const [legalModal, setLegalModal] = useState<{ open: boolean; title: string; content: string }>({
    open: false,
    title: '',
    content: '',
  });
  const [aboutOpen, setAboutOpen] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <motion.footer
      variants={footerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      className="relative mt-12 border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-dark-premium overflow-hidden transition-colors duration-300"
    >
      {/* Fondo ambiental */}
      <div className="absolute inset-0 grid-bg opacity-10 dark:opacity-20 pointer-events-none" aria-hidden />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[120px] opacity-20 dark:opacity-30 pointer-events-none" aria-hidden />

      {/* Línea superior con gradiente */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-10 sm:py-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex flex-col lg:flex-row gap-8 lg:gap-12"
        >
          {/* ─── Columna izquierda: Marca ─── */}
          <motion.div variants={itemVariants} className="lg:w-80 flex-shrink-0">
            <Link href="/" className="flex items-center gap-3 mb-4 group w-fit">
              <div className="relative w-10 h-10 rounded-xl gradient-border flex items-center justify-center bg-white dark:bg-dark-card shadow-glow-sm transition-all duration-300 group-hover:shadow-glow-md group-hover:scale-105">
                <Image
                  src="/images/logo/servi.png"
                  alt="Servi"
                  width={22}
                  height={22}
                  className="object-contain"
                />
              </div>
              <span className="font-display font-bold text-xl tracking-tightest text-gray-900 dark:text-gradient">
                Servi
              </span>
            </Link>
            <p className="text-gray-600 dark:text-white/50 text-[15px] leading-relaxed mb-5 max-w-sm font-medium">
              Encuentra al profesional ideal en minutos, no en horas. El marketplace peruano que garantiza seguridad y calidad en oficios y negocios locales.
            </p>

            {/* Contacto rápido */}
            <div className="flex items-center gap-3 mb-2 text-sm">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center">
                <Mail size={14} className="text-primary" />
              </div>
              <a
                href="mailto:soporteofiapp@gmail.com"
                className="text-gray-500 dark:text-white/60 hover:text-primary dark:hover:text-primary-light transition-colors duration-300 text-[13px]"
              >
                soporteofiapp@gmail.com
              </a>
            </div>

            {/* Redes sociales */}
            <div className="flex items-center gap-1.5">
              {socialLinks.map((social) => (
                <a
                  key={social.alt}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.alt}
                  className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center hover:border-primary/40 dark:hover:border-primary/40 hover:shadow-glow-sm transition-all duration-200 group"
                >
                  <img
                    src={social.src}
                    alt={social.alt}
                    className="w-4 h-4 object-contain opacity-50 group-hover:opacity-100 transition-opacity"
                  />
                </a>
              ))}
            </div>
          </motion.div>

          {/* ─── Columnas derechas: Navegación ─── */}
          <motion.div variants={itemVariants} className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8">
            {/* Explorar */}
            <div>
              <h4 className="text-[11px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Explorar
              </h4>
              <ul className="space-y-2">
                {exploreLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-gray-600 dark:text-white/50 text-[13px] hover:text-primary dark:hover:text-primary-light transition-colors duration-200"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <button
                    onClick={() => setAboutOpen(true)}
                    className="text-gray-600 dark:text-white/50 text-[13px] hover:text-primary dark:hover:text-primary-light transition-colors duration-200"
                  >
                    Conócenos
                  </button>
                </li>
              </ul>
            </div>

            {/* Soporte */}
            <div>
              <h4 className="text-[11px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber" />
                Soporte
              </h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://mail.google.com/mail/?view=cm&fs=1&to=soporteofiapp@gmail.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 dark:text-white/50 text-[13px] hover:text-primary dark:hover:text-primary-light transition-colors duration-200"
                  >
                    Centro de ayuda
                  </a>
                </li>
                <li>
                  <a
                    href="https://mail.google.com/mail/?view=cm&fs=1&to=ronla.angarita31@gmail.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 dark:text-white/50 text-[13px] hover:text-primary dark:hover:text-primary-light transition-colors duration-200"
                  >
                    Ventas y planes
                  </a>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="text-gray-600 dark:text-white/50 text-[13px] hover:text-primary dark:hover:text-primary-light transition-colors duration-200"
                  >
                    Panel proveedor
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-[11px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Legal
              </h4>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() =>
                      setLegalModal({
                        open: true,
                        title: 'Términos y Condiciones',
                        content: TERMS_CONTENT,
                      })
                    }
                    className="text-gray-600 dark:text-white/50 text-[13px] hover:text-primary dark:hover:text-primary-light transition-colors duration-200"
                  >
                    Términos y condiciones
                  </button>
                </li>
                <li>
                  <button
                    onClick={() =>
                      setLegalModal({
                        open: true,
                        title: 'Política de Privacidad',
                        content: PRIVACY_CONTENT,
                      })
                    }
                    className="text-gray-600 dark:text-white/50 text-[13px] hover:text-primary dark:hover:text-primary-light transition-colors duration-200"
                  >
                    Política de privacidad
                  </button>
                </li>
              </ul>
            </div>
          </motion.div>
        </motion.div>

        {/* ─── Barra inferior ─── */}
        <motion.div
          variants={itemVariants}
          className="mt-8 pt-5 border-t border-gray-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex flex-col sm:flex-row items-center gap-3 text-[11px] text-gray-400 dark:text-white/30">
            <span className="font-mono tabular-nums">
              © {year} Servi. Todos los derechos reservados.
            </span>
            <span className="hidden sm:block w-1 h-1 rounded-full bg-gray-300 dark:bg-white/15" />
            <span className="inline-flex items-center gap-1.5 text-gray-400 dark:text-white/35">
              <span className="peru-stripe">
                <i /><i /><i />
              </span>
              Hecho con <Heart size={9} className="text-rose fill-rose" /> en Perú
            </span>
          </div>

          <button
            onClick={scrollToTop}
            className="group/btn flex items-center gap-1.5 text-[11px] font-medium text-gray-400 dark:text-white/35 hover:text-primary dark:hover:text-primary-light transition-all duration-300"
            aria-label="Volver arriba"
          >
            <span>Volver arriba</span>
            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center group-hover/btn:border-primary/30 dark:group-hover/btn:border-primary/30 transition-all duration-300 group-hover/btn:-translate-y-0.5">
              <ArrowUp size={12} />
            </div>
          </button>
        </motion.div>
      </div>

      <LegalModal
        isOpen={legalModal.open}
        onClose={() => setLegalModal({ open: false, title: '', content: '' })}
        title={legalModal.title}
        content={legalModal.content}
      />
      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
    </motion.footer>
  );
}
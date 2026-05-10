'use client';

import { useEffect } from 'react';
import { X, Target, Eye, Users, ShieldCheck, MapPin, TrendingUp } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ACCENT = {
  orange: { bg: 'bg-[#FBE8D6]', text: 'text-primary-darker', border: 'border-[#F4CDA3]' },
  blue:   { bg: 'bg-[#E0EAFB]', text: 'text-[#1E40AF]',     border: 'border-[#C2D5F5]' },
  green:  { bg: 'bg-[#E2F5EC]', text: 'text-[#0E5C3D]',     border: 'border-[#B8E3CD]' },
  purple: { bg: 'bg-[#EBE0FB]', text: 'text-[#5B21B6]',     border: 'border-[#D6C4F2]' },
  rose:   { bg: 'bg-[#FBE0E3]', text: 'text-[#9B1C28]',     border: 'border-[#F2BFC4]' },
  amber:  { bg: 'bg-[#FBEFCD]', text: 'text-[#7A4C00]',     border: 'border-[#EBCF8A]' },
} as const;

const ABOUT_SECTIONS = [
  {
    title: 'Nuestra Misión',
    desc: 'Conectar a profesionales y negocios verificados con clientes reales en ciudades intermedias del Perú, donde antes no existía una plataforma formal y segura para contratar servicios locales.',
    icon: Target,
    accent: 'orange' as keyof typeof ACCENT,
  },
  {
    title: 'Nuestra Visión',
    desc: 'Ser el marketplace de servicios locales más confiable del Perú, expandiéndonos a todas las regiones y convirtiéndonos en la primera opción para encontrar profesionales verificados.',
    icon: Eye,
    accent: 'blue' as keyof typeof ACCENT,
  },
  {
    title: 'Público Objetivo',
    desc: 'Clientes que buscan servicios de calidad con garantía de verificación. Profesionales independientes y pequeños negocios que quieren expandir su alcance y credibilidad.',
    icon: Users,
    accent: 'green' as keyof typeof ACCENT,
  },
  {
    title: 'Verificación y Confianza',
    desc: 'Cada profesional pasa por un proceso de validación documental antes de aparecer en la plataforma. Las reseñas con GPS garantizan experiencias reales y transparentes.',
    icon: ShieldCheck,
    accent: 'purple' as keyof typeof ACCENT,
  },
  {
    title: 'Cobertura Actual',
    desc: 'Comenzamos en Huancayo y Huanta, ciudades donde la economía local necesitaba una solución tecnológica para conectar la oferta y demanda de servicios.',
    icon: MapPin,
    accent: 'rose' as keyof typeof ACCENT,
  },
  {
    title: 'Crecimiento',
    desc: 'Gracias al boca a boca, las invitaciones entre colegas y nuestro programa de referidos con monedas, más profesionales se suman cada semana a la plataforma.',
    icon: TrendingUp,
    accent: 'amber' as keyof typeof ACCENT,
  },
];

export default function AboutModal({ isOpen, onClose }: Props) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/55 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative bg-paper border border-line rounded-2xl w-full max-w-3xl max-h-[88vh] mx-2 sm:mx-0 overflow-hidden shadow-soft-lg animate-scale-in flex flex-col">
        <div className="relative bg-surface px-6 py-6 flex-shrink-0 border-b border-line">
          <div className="relative flex items-start justify-between">
            <div>
              <span className="eyebrow">Team Less Dev</span>
              <h2 className="mt-2 font-display font-bold tracking-tightest text-ink text-[26px] sm:text-[30px] leading-tight">
                ¿Quiénes somos?
              </h2>
              <p className="text-ink-3 text-[14.5px] mt-2 max-w-md leading-relaxed">
                Una plataforma peruana construida para conectar el talento local
                con personas que valoran la seguridad y la calidad.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-paper hover:bg-surface-2 border border-line-2 flex items-center justify-center text-ink-4 hover:text-ink transition-colors flex-shrink-0"
              aria-label="Cerrar"
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ABOUT_SECTIONS.map((section) => {
              const Icon = section.icon;
              const a = ACCENT[section.accent];
              return (
                <div
                  key={section.title}
                  className="card-flat p-5 hover:border-ink-4 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-lg border ${a.border} ${a.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={16} strokeWidth={1.75} className={a.text} />
                    </div>
                    <p className="font-display font-semibold text-ink text-[14px] leading-snug">
                      {section.title}
                    </p>
                  </div>
                  <p className="text-ink-3 text-[12.5px] leading-relaxed">
                    {section.desc}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-line text-center">
            <p className="text-ink-3 text-[13px] leading-relaxed max-w-lg mx-auto">
              <strong className="text-ink">OficioApp</strong> nació de la necesidad
              de formalizar el mercado de servicios locales en ciudades donde no
              existía una alternativa digital confiable. Creemos en el talento
              peruano y trabajamos cada día para que encontrar un profesional
              de calidad sea tan fácil como pedir un taxi por app.
            </p>
            <p className="text-ink-3 text-[13px] leading-relaxed max-w-lg mx-auto mt-3">
              Desarrollado con dedicación por <strong className="text-ink">Team Less Dev</strong>,
              un equipo pequeño con grandes ideas. Porque no se trata del tamaño del
              equipo, sino del impacto que generas.
            </p>
            <p className="text-ink-5 text-[11px] mt-5">
              © {new Date().getFullYear()} Team Less Dev — Hecho en Perú con dedicación y café.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

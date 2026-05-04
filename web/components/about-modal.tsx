'use client';

import { useEffect } from 'react';
import { X, Target, Eye, Users, ShieldCheck, MapPin, TrendingUp } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ABOUT_SECTIONS = [
  {
    title: 'Nuestra Misión',
    desc: 'Conectar a profesionales y negocios verificados con clientes reales en ciudades intermedias del Perú, donde antes no existía una plataforma formal y segura para contratar servicios locales.',
    icon: Target,
    color: '#E07B39',
  },
  {
    title: 'Nuestra Visión',
    desc: 'Ser el marketplace de servicios locales más confiable del Perú, expandiéndonos a todas las regiones y convirtiéndonos en la primera opción para encontrar profesionales verificados.',
    icon: Eye,
    color: '#3B82F6',
  },
  {
    title: 'Público Objetivo',
    desc: 'Clientes que buscan servicios de calidad con garantía de verificación. Profesionales independientes y pequeños negocios que quieren expandir su alcance y credibilidad.',
    icon: Users,
    color: '#10B981',
  },
  {
    title: 'Verificación y Confianza',
    desc: 'Cada profesional pasa por un proceso de validación documental antes de aparecer en la plataforma. Las reseñas con GPS garantizan experiencias reales y transparentes.',
    icon: ShieldCheck,
    color: '#8B5CF6',
  },
  {
    title: 'Cobertura Actual',
    desc: 'Comenzamos en Huancayo y Huanta, ciudades donde la economía local necesitaba una solución tecnológica para conectar la oferta y demanda de servicios.',
    icon: MapPin,
    color: '#E4405F',
  },
  {
    title: 'Crecimiento',
    desc: 'Gracias al boca a boca, las invitaciones entre colegas y nuestro programa de referidos con monedas, más profesionales se suman cada semana a la plataforma.',
    icon: TrendingUp,
    color: '#F59E0B',
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
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal tipo página */}
      <div className="relative bg-bg-dark border border-white/10 rounded-3xl w-full max-w-3xl max-h-[90vh] sm:max-h-[85vh] mx-2 sm:mx-0 overflow-hidden shadow-2xl animate-scale-in flex flex-col">
        {/* Cabecera con gradiente */}
        <div className="relative bg-gradient-to-r from-primary/20 via-amber/10 to-primary/20 px-4 sm:px-6 py-5 sm:py-6 flex-shrink-0 border-b border-white/5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2">
                Team Less Dev
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                ¿Quiénes Somos?
              </h2>
              <p className="text-text-secondary text-sm mt-2 max-w-md">
                Una plataforma peruana construida para conectar el talento local
                con personas que valoran la seguridad y la calidad.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-muted hover:text-white transition-colors flex-shrink-0"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Grid de secciones */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {ABOUT_SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <div
                  key={section.title}
                  className="bg-bg-card border border-white/5 rounded-2xl p-5 hover:border-primary/20 transition-all duration-300 group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${section.color}20` }}
                    >
                      <Icon size={18} style={{ color: section.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-text-primary font-semibold text-sm truncate">
                        {section.title}
                      </p>
                    </div>
                  </div>
                  <p className="text-text-secondary text-xs leading-relaxed">
                    {section.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Footer del modal */}
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-text-muted text-xs leading-relaxed max-w-lg mx-auto">
              <strong className="text-primary">OficioApp</strong> nació de la
              necesidad de formalizar el mercado de servicios locales en ciudades
              donde no existía una alternativa digital confiable. Creemos en el
              talento peruano y trabajamos cada día para que encontrar un profesional
              de calidad sea tan fácil como pedir un taxi por app.
            </p>
            <p className="text-text-muted text-xs leading-relaxed max-w-lg mx-auto mt-3">
              Desarrollado con dedicación por <strong className="text-primary">Team Less Dev</strong>,
              un equipo pequeño con grandes ideas. Porque no se trata del tamaño del
              equipo, sino del impacto que generas.
            </p>
            <p className="text-text-muted/50 text-[10px] mt-4">
              © {new Date().getFullYear()} Team Less Dev — Hecho en Perú con dedicación y café. 🇵🇪
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
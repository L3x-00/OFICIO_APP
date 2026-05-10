import { Shield, MapPin, CreditCard, HeartHandshake, Zap, Star } from 'lucide-react';

const benefits = [
  {
    icon: Shield,
    title: 'Profesionales verificados',
    desc: 'Validamos identidad y documentos para que contrates con total tranquilidad.',
    accent: 'orange',
  },
  {
    icon: MapPin,
    title: 'Reseñas con GPS',
    desc: 'Opiniones geolocalizadas que garantizan autenticidad en cada experiencia.',
    accent: 'green',
  },
  {
    icon: CreditCard,
    title: 'Pagos seguros con Yape',
    desc: 'Método de pago confiable usado por millones de peruanos cada día.',
    accent: 'amber',
  },
  {
    icon: HeartHandshake,
    title: 'Soporte local',
    desc: 'Equipo peruano que entiende las necesidades de tu ciudad y negocio.',
    accent: 'orange',
  },
  {
    icon: Zap,
    title: 'Contacto directo',
    desc: 'Habla directamente con el proveedor por WhatsApp o teléfono sin intermediarios.',
    accent: 'ink',
  },
  {
    icon: Star,
    title: 'Rating transparente',
    desc: 'Sistema de calificaciones verificadas para tomar la mejor decisión.',
    accent: 'amber',
  },
] as const;

const accentMap: Record<string, { bg: string; text: string; border: string }> = {
  orange: { bg: 'bg-[#FBE8D6]',  text: 'text-primary-darker', border: 'border-[#F4CDA3]' },
  green:  { bg: 'bg-[#E2F5EC]',  text: 'text-[#0E5C3D]',      border: 'border-[#B8E3CD]' },
  amber:  { bg: 'bg-[#FBEFCD]',  text: 'text-[#7A4C00]',      border: 'border-[#EBCF8A]' },
  ink:    { bg: 'bg-[#EAE5D7]',  text: 'text-ink',            border: 'border-line-2' },
};

export default function BenefitsSection() {
  return (
    <section id="beneficios" className="relative py-24 sm:py-32 bg-paper overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">

        {/* Header */}
        <div className="max-w-2xl mb-14 sm:mb-16" data-reveal>
          <span className="eyebrow">Por qué OficioApp</span>
          <h2 className="mt-3 font-display font-bold tracking-tightest text-ink text-[34px] sm:text-[44px] leading-[1.1]">
            La plataforma que entiende cómo se contratan
            <br className="hidden sm:block" /> servicios en el Perú.
          </h2>
          <p className="mt-5 text-ink-3 text-[16px] leading-relaxed max-w-xl">
            Construido alrededor de la confianza, la transparencia y la cercanía
            que esperan los clientes peruanos.
          </p>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefits.map((b, i) => {
            const a = accentMap[b.accent];
            return (
              <article
                key={b.title}
                data-reveal
                className={`reveal-delay-${(i % 6) + 1} card-3d hover-lift p-7 group`}
              >
                <div
                  className={`w-11 h-11 rounded-xl border ${a.border} ${a.bg} flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-105`}
                >
                  <b.icon className={a.text} size={20} strokeWidth={1.75} />
                </div>
                <h3 className="font-display font-semibold text-ink text-[17px] leading-snug mb-2">
                  {b.title}
                </h3>
                <p className="text-ink-3 text-[14.5px] leading-relaxed">
                  {b.desc}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

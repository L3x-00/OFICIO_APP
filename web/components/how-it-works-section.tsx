import { Search, MessageCircle, Star } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Busca al experto que necesitas',
    desc: 'Filtra por categoría, ubicación y rating para encontrar al profesional ideal para tu servicio.',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    border: 'border-primary/30',
  },
  {
    number: '02',
    icon: MessageCircle,
    title: 'Contacta directamente',
    desc: 'Habla por WhatsApp o teléfono con el proveedor y acuerda todos los detalles del servicio.',
    iconBg: 'bg-amber/10',
    iconColor: 'text-amber',
    border: 'border-amber/30',
  },
  {
    number: '03',
    icon: Star,
    title: 'Califica el servicio',
    desc: 'Deja tu reseña geolocalizada con GPS y ayuda a la comunidad a tomar mejores decisiones.',
    iconBg: 'bg-green/10',
    iconColor: 'text-green',
    border: 'border-green/30',
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="como-funciona"
      className="relative py-20 sm:py-28 bg-gradient-to-b from-bg-dark via-bg-card/30 to-bg-dark overflow-hidden"
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16" data-reveal>
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-full px-4 py-1.5 mb-4">
            <span className="text-primary text-xs font-bold uppercase tracking-widest">
              Proceso simple
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-text-primary leading-tight">
            ¿Cómo <span className="text-gradient">funciona</span>?
          </h2>
          <p className="text-text-secondary mt-4 max-w-xl mx-auto text-lg">
            Tres pasos simples para encontrar al profesional que necesitas.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Línea conectora animada (desktop) */}
          <div
            className="hidden md:block absolute top-10 left-[16%] right-[16%] h-px"
            aria-hidden
          >
            <div className="h-full w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          </div>

          {steps.map((step, i) => (
            <div
              key={step.number}
              data-reveal
              className={`reveal-delay-${i + 1} relative text-center group`}
            >
              {/* Número grande de fondo (decorativo) */}
              <div className="absolute -top-4 right-4 text-7xl font-black text-white/[0.03] select-none pointer-events-none z-0">
                {step.number}
              </div>

              <div
                className={`relative z-10 w-20 h-20 ${step.iconBg} border-2 ${step.border} rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-glow-md`}
              >
                <step.icon className={step.iconColor} size={32} />
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-bg-dark border border-white/10 text-text-secondary text-[10px] font-bold flex items-center justify-center">
                  {step.number}
                </span>
              </div>

              <h3 className="relative z-10 text-text-primary font-semibold text-lg mb-2">
                {step.title}
              </h3>
              <p className="relative z-10 text-text-muted text-sm leading-relaxed max-w-xs mx-auto">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

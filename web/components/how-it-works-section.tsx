import { Search, MessageCircle, Star } from 'lucide-react';

const steps = [
  {
    icon: Search,
    title: 'Busca al experto que necesitas',
    desc: 'Filtra por categoría, ubicación y rating para encontrar al profesional ideal.',
  },
  {
    icon: MessageCircle,
    title: 'Contacta directamente',
    desc: 'Habla por WhatsApp o teléfono con el proveedor y acuerda los detalles.',
  },
  {
    icon: Star,
    title: 'Califica el servicio',
    desc: 'Deja tu reseña geolocalizada con GPS y ayuda a la comunidad.',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="como-funciona" className="relative py-24 sm:py-32 bg-surface border-y border-line overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">

        <div className="max-w-2xl mb-16" data-reveal>
          <span className="eyebrow">Proceso simple</span>
          <h2 className="mt-3 font-display font-bold tracking-tightest text-ink text-[34px] sm:text-[44px] leading-[1.1]">
            Tres pasos para encontrar
            <br className="hidden sm:block" /> al profesional ideal.
          </h2>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-x-10 gap-y-12 relative">
          {/* Línea conectora desktop — sutil */}
          <div
            className="hidden md:block absolute top-7 left-[10%] right-[10%] h-px bg-gradient-to-r from-line via-line-2 to-line"
            aria-hidden
          />

          {steps.map((step, i) => (
            <div
              key={step.title}
              data-reveal
              className={`reveal-delay-${i + 1} relative group`}
            >
              {/* Numbered dot */}
              <div className="relative z-10 mb-6 flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-paper border border-line-2 flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-0.5">
                  <step.icon className="text-ink" size={22} strokeWidth={1.75} />
                </div>
                <span className="font-mono tabular-nums text-[12px] text-ink-4 px-2 py-1 rounded-md border border-line-2 bg-paper">
                  PASO 0{i + 1}
                </span>
              </div>

              <h3 className="font-display font-semibold text-ink text-[20px] leading-snug mb-2 max-w-xs">
                {step.title}
              </h3>
              <p className="text-ink-3 text-[14.5px] leading-relaxed max-w-xs">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

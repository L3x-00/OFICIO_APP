import { Search, MessageCircle, Star } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Busca al experto que necesitas',
    desc: 'Filtra por categoría, ubicación y rating para encontrar al profesional ideal para tu servicio.',
    borderColor: 'border-primary/30',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    numColor: 'text-primary',
  },
  {
    number: '02',
    icon: MessageCircle,
    title: 'Contacta directamente',
    desc: 'Habla por WhatsApp o teléfono con el proveedor y acuerda todos los detalles del servicio.',
    borderColor: 'border-amber/30',
    iconBg: 'bg-amber/10',
    iconColor: 'text-amber',
    numColor: 'text-amber',
  },
  {
    number: '03',
    icon: Star,
    title: 'Califica el servicio',
    desc: 'Deja tu reseña geolocalizada con GPS y ayuda a la comunidad a tomar mejores decisiones.',
    borderColor: 'border-green/30',
    iconBg: 'bg-green/10',
    iconColor: 'text-green',
    numColor: 'text-green',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="como-funciona" className="py-20 sm:py-28 bg-bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-full px-4 py-1.5 mb-4">
            <span className="text-primary text-xs font-bold uppercase tracking-widest">
              Proceso simple
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary">
            ¿Cómo funciona?
          </h2>
          <p className="text-text-secondary mt-3 max-w-xl mx-auto text-lg">
            Tres pasos simples para encontrar al profesional que necesitas.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Líneas conectoras en desktop */}
          <div className="hidden md:block absolute top-[30px] left-[calc(33.33%+8px)] right-[calc(33.33%+8px)] h-px bg-gradient-to-r from-primary/20 via-amber/20 to-green/20" />

          {steps.map((step) => (
            <div key={step.number} className="relative text-center group">
              <div
                className={`w-16 h-16 ${step.iconBg} border-2 ${step.borderColor} rounded-2xl flex items-center justify-center mx-auto mb-5 relative z-10 group-hover:scale-110 transition-transform duration-300`}
              >
                <step.icon className={step.iconColor} size={28} />
              </div>

              <div className={`${step.numColor} text-xs font-bold mb-2 uppercase tracking-widest`}>
                Paso {step.number}
              </div>
              <h3 className="text-text-primary font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed max-w-xs mx-auto">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

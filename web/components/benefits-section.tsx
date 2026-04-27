import { Shield, MapPin, CreditCard, HeartHandshake, Zap, Star } from 'lucide-react';

const benefits = [
  {
    icon: Shield,
    title: 'Profesionales verificados',
    desc: 'Validamos identidad y documentos para que contrates con total tranquilidad.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: MapPin,
    title: 'Reseñas con GPS',
    desc: 'Opiniones geolocalizadas que garantizan autenticidad en cada experiencia.',
    color: 'text-green',
    bg: 'bg-green/10',
  },
  {
    icon: CreditCard,
    title: 'Pagos seguros con Yape',
    desc: 'Método de pago confiable usado por millones de peruanos cada día.',
    color: 'text-amber',
    bg: 'bg-amber/10',
  },
  {
    icon: HeartHandshake,
    title: 'Soporte local',
    desc: 'Equipo peruano que entiende las necesidades de tu ciudad y negocio.',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
  {
    icon: Zap,
    title: 'Contacto directo',
    desc: 'Habla directamente con el proveedor por WhatsApp o teléfono sin intermediarios.',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
  },
  {
    icon: Star,
    title: 'Rating transparente',
    desc: 'Sistema de calificaciones verificadas para ayudarte a tomar la mejor decisión.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
  },
];

export default function BenefitsSection() {
  return (
    <section id="beneficios" className="py-20 sm:py-28 bg-bg-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-full px-4 py-1.5 mb-4">
            <span className="text-primary text-xs font-bold uppercase tracking-widest">
              Por qué elegirnos
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary">
            ¿Por qué elegir OficioApp?
          </h2>
          <p className="text-text-secondary mt-3 max-w-xl mx-auto text-lg">
            La plataforma que entiende cómo se contratan servicios en el Perú.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="group bg-bg-card border border-white/5 rounded-card p-6 hover:border-primary/25 hover:-translate-y-1 transition-all duration-300 cursor-default"
            >
              <div
                className={`w-11 h-11 ${b.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
              >
                <b.icon className={b.color} size={22} />
              </div>
              <h3 className="text-text-primary font-semibold text-lg mb-2">{b.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

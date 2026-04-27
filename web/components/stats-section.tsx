import { Users, Star, MapPin, Briefcase } from 'lucide-react';

const stats = [
  {
    icon: Users,
    value: '500+',
    label: 'Profesionales registrados',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: Star,
    value: '1,200+',
    label: 'Reseñas verificadas',
    color: 'text-amber',
    bg: 'bg-amber/10',
  },
  {
    icon: MapPin,
    value: '5+',
    label: 'Ciudades atendidas',
    color: 'text-green',
    bg: 'bg-green/10',
  },
  {
    icon: Briefcase,
    value: '30+',
    label: 'Categorías de servicio',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
];

export default function StatsSection() {
  return (
    <section className="py-14 bg-bg-card/40 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center group cursor-default">
              <div
                className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300`}
              >
                <stat.icon size={22} className={stat.color} />
              </div>
              <div className={`text-3xl sm:text-4xl font-extrabold ${stat.color} mb-1`}>
                {stat.value}
              </div>
              <div className="text-text-muted text-xs sm:text-sm leading-snug">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

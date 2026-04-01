import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  alert?: boolean;
}

const colorMap = {
  blue:   { bg: 'bg-blue-500/10',   icon: 'text-blue-400',   border: 'border-blue-500/20'   },
  green:  { bg: 'bg-green-500/10',  icon: 'text-green-400',  border: 'border-green-500/20'  },
  orange: { bg: 'bg-orange-500/10', icon: 'text-orange-400', border: 'border-orange-500/20' },
  red:    { bg: 'bg-red-500/10',    icon: 'text-red-400',    border: 'border-red-500/20'    },
  purple: { bg: 'bg-purple-500/10', icon: 'text-purple-400', border: 'border-purple-500/20' },
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  alert = false,
}: MetricCardProps) {
  const colors = colorMap[color];

  return (
    <div
      className={cn(
        'bg-bg-card rounded-2xl p-6 border',
        alert ? 'border-orange-500/40 shadow-orange-500/10 shadow-lg' : 'border-white/5',
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-3 rounded-xl', colors.bg)}>
          <Icon size={22} className={colors.icon} />
        </div>
        {alert && (
          <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full border border-orange-500/30">
            ¡Alerta!
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm font-medium text-gray-400">{title}</p>
      {subtitle && (
        <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
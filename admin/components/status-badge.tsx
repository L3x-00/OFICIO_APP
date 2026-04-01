import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'muted';

interface StatusBadgeProps {
  label: string;
  variant: BadgeVariant;
}

const variantMap: Record<BadgeVariant, string> = {
  success: 'bg-green-500/15 text-green-400 border-green-500/30',
  warning: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  danger:  'bg-red-500/15 text-red-400 border-red-500/30',
  info:    'bg-blue-500/15 text-blue-400 border-blue-500/30',
  muted:   'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'text-xs font-semibold px-2.5 py-1 rounded-full border',
        variantMap[variant],
      )}
    >
      {label}
    </span>
  );
}
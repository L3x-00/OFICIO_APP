type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'purple' | 'orange';

interface StatusBadgeProps {
  label: string;
  variant: BadgeVariant;
  dot?: boolean;
  size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, { bg: string; border: string; color: string; dot: string }> = {
  success: {
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
    color: '#34D399',
    dot: '#10B981',
  },
  warning: {
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    color: '#FBB740',
    dot: '#F59E0B',
  },
  danger: {
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
    color: '#F87171',
    dot: '#EF4444',
  },
  info: {
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.2)',
    color: '#60A5FA',
    dot: '#3B82F6',
  },
  muted: {
    bg: 'rgba(100,116,139,0.08)',
    border: 'rgba(100,116,139,0.15)',
    color: '#94A3B8',
    dot: '#64748B',
  },
  purple: {
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.2)',
    color: '#A78BFA',
    dot: '#8B5CF6',
  },
  orange: {
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.2)',
    color: '#FB923C',
    dot: '#F97316',
  },
};

export function StatusBadge({ label, variant, dot = false, size = 'sm' }: StatusBadgeProps) {
  const s = variantStyles[variant];
  const fontSize = size === 'md' ? '12px' : '11px';
  const padding = size === 'md' ? '4px 10px' : '3px 8px';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding,
      borderRadius: '99px',
      fontSize,
      fontWeight: 600,
      letterSpacing: '0.01em',
      background: s.bg,
      border: `1px solid ${s.border}`,
      color: s.color,
      whiteSpace: 'nowrap',
    }}>
      {dot && (
        <span style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: s.dot,
          flexShrink: 0,
        }} />
      )}
      {label}
    </span>
  );
}
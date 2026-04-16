import { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'teal';
  alert?: boolean;
  trend?: number;
  trendLabel?: string;
}

const colorConfig = {
  blue:   { icon: '#3B82F6', iconBg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.15)', glow: '0 4px 20px rgba(59,130,246,0.08)' },
  green:  { icon: '#10B981', iconBg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.15)',  glow: '0 4px 20px rgba(16,185,129,0.08)' },
  orange: { icon: '#F97316', iconBg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.15)',  glow: '0 4px 20px rgba(249,115,22,0.08)' },
  red:    { icon: '#EF4444', iconBg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.15)',   glow: '0 4px 20px rgba(239,68,68,0.08)' },
  purple: { icon: '#8B5CF6', iconBg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.15)', glow: '0 4px 20px rgba(139,92,246,0.08)' },
  teal:   { icon: '#14B8A6', iconBg: 'rgba(20,184,166,0.1)',  border: 'rgba(20,184,166,0.15)',  glow: '0 4px 20px rgba(20,184,166,0.08)' },
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  alert = false,
  trend,
  trendLabel,
}: MetricCardProps) {
  const cfg = colorConfig[color];
  const isPositiveTrend = trend !== undefined && trend >= 0;

  return (
    <div
      style={{
        background: 'var(--surface-2)',
        border: `1px solid ${alert ? 'rgba(239,68,68,0.25)' : cfg.border}`,
        borderRadius: '16px',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        boxShadow: alert ? '0 4px 20px rgba(239,68,68,0.1)' : cfg.glow,
        cursor: 'default',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = alert
          ? '0 8px 32px rgba(239,68,68,0.18)'
          : cfg.glow.replace('0.08', '0.16');
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = alert ? '0 4px 20px rgba(239,68,68,0.1)' : cfg.glow;
      }}
    >
      {/* Subtle top accent line */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '2px',
        background: cfg.icon,
        opacity: 0.4,
        borderRadius: '16px 16px 0 0',
      }} />

      {/* Alert pulse */}
      {alert && (
        <div style={{
          position: 'absolute',
          top: '16px', right: '16px',
          width: '8px', height: '8px',
          borderRadius: '50%',
          background: '#EF4444',
          animation: 'pulse-ring 2s infinite',
        }} />
      )}

      {/* Icon + title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{
          width: '40px', height: '40px',
          borderRadius: '10px',
          background: cfg.iconBg,
          border: `1px solid ${cfg.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon size={18} color={cfg.icon} />
        </div>
        {trend !== undefined && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            padding: '3px 8px',
            borderRadius: '99px',
            background: isPositiveTrend ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${isPositiveTrend ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}>
            {isPositiveTrend
              ? <TrendingUp size={10} color="#10B981" />
              : <TrendingDown size={10} color="#EF4444" />
            }
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: isPositiveTrend ? '#10B981' : '#EF4444',
            }}>
              {Math.abs(trend)}%
            </span>
          </div>
        )}
      </div>

      {/* Value */}
      <p style={{
        fontSize: '28px',
        fontWeight: 700,
        color: 'var(--text-primary)',
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
        marginBottom: '4px',
      }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>

      {/* Title */}
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: subtitle || trendLabel ? '4px' : 0 }}>
        {title}
      </p>

      {/* Subtitle / trend label */}
      {(subtitle || trendLabel) && (
        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
          {trendLabel || subtitle}
        </p>
      )}
    </div>
  );
}
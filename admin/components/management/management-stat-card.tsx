'use client';

import { type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Tarjeta de KPI usada en el header de Gestión (y reutilizable en
 * cualquier otra página). Variante `tone` controla el acento del
 * ícono. Sin lógica de fetch — recibe `value` ya calculado.
 */
type Tone = 'orange' | 'cyan' | 'amber' | 'rose' | 'emerald';

const TONE_BG: Record<Tone, string> = {
  orange:  'bg-orange-500/15  text-orange-300  border-orange-500/20',
  cyan:    'bg-cyan-500/15    text-cyan-300    border-cyan-500/20',
  amber:   'bg-amber-500/15   text-amber-300   border-amber-500/20',
  rose:    'bg-rose-500/15    text-rose-300    border-rose-500/20',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
};

export interface ManagementStatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
  loading?: boolean;
}

export function ManagementStatCard({
  label,
  value,
  icon: Icon,
  tone = 'orange',
  hint,
  loading,
}: ManagementStatCardProps) {
  return (
    <Card className="p-5 transition-all hover:border-white/10">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wider uppercase text-white/40">
            {label}
          </p>
          {loading ? (
            <div className="mt-2 h-7 w-16 rounded bg-white/[0.06] animate-pulse" />
          ) : (
            <p className="mt-1.5 text-2xl font-bold text-white tabular-nums">
              {value}
            </p>
          )}
          {hint && (
            <p className="mt-1 text-[11.5px] text-white/35 truncate">{hint}</p>
          )}
        </div>
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl border flex-shrink-0',
            TONE_BG[tone],
          )}
        >
          <Icon size={18} strokeWidth={1.75} />
        </div>
      </div>
    </Card>
  );
}

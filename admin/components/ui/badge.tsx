'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Badge para etiquetas de estado (rol, plan, verificación). Variantes
 * mapeadas al sistema de color del admin (success/warning/danger/info)
 * + tonos brand (orange/purple) ya definidos en tailwind.config.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral:  'bg-white/5 text-white/70 border-white/10',
        success:  'bg-success/10 text-success-light border-success/25',
        warning:  'bg-warning/10 text-warning-light border-warning/25',
        danger:   'bg-danger/10 text-danger-light border-danger/25',
        info:     'bg-info/10 text-info-light border-info/25',
        orange:   'bg-orange/10 text-orange-light border-orange/25',
        purple:   'bg-purple/10 text-purple-light border-purple/25',
        emerald:  'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

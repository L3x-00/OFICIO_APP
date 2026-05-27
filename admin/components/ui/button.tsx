'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Button shadcn-style adaptado al theme oscuro del admin Servi.
 *
 * Variantes:
 *   • primary  — naranja Servi (acción principal).
 *   • default  — slate sutil (acción secundaria).
 *   • outline  — borde + transparencia.
 *   • ghost    — sin bg, ideal para íconos en toolbars.
 *   • danger   — rojo destructivo (delete / revoke).
 *   • link     — texto subrayado sin borde.
 *
 * `asChild` permite componer con `<Link>`, `<a>`, etc. sin perder
 * estilos (Radix Slot).
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-slate-950 ' +
    'transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2 ' +
    'disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-orange-500 text-white shadow-md hover:bg-orange-500/90 shadow-orange-900/30',
        default:
          'bg-white/[0.06] text-white border border-white/10 hover:bg-white/10 hover:border-white/20',
        outline:
          'border border-white/15 bg-transparent text-white/80 hover:bg-white/[0.04] hover:text-white',
        ghost:
          'text-white/60 hover:bg-white/[0.06] hover:text-white',
        danger:
          'bg-red-500/15 text-red-300 border border-red-500/25 hover:bg-red-500/25 hover:text-red-200',
        link:
          'text-orange-400 underline-offset-4 hover:underline',
      },
      size: {
        sm:   'h-8  px-3   text-xs',
        md:   'h-10 px-4',
        lg:   'h-11 px-6   text-base',
        icon: 'h-9  w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size:    'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };

'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

/**
 * Tabs shadcn-style sobre Radix.
 *
 * El indicador "active" usa `data-[state=active]:…` (Tailwind variants
 * que Radix expone automáticamente). El componente NO maneja estado
 * interno — eso lo hace Radix. Vos sólo configurás `defaultValue` o
 * `value/onValueChange` desde afuera.
 */

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex items-center gap-1 rounded-xl bg-white/[0.04] border border-white/5 p-1',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all',
      'text-white/55 hover:text-white/80',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40',
      'data-[state=active]:bg-gradient-to-b data-[state=active]:from-orange-500/25 data-[state=active]:to-orange-500/10',
      'data-[state=active]:text-orange-300 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-orange-500/20',
      'disabled:pointer-events-none disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4 focus-visible:outline-none data-[state=active]:animate-in data-[state=active]:fade-in-50',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * StatusPill — unified status badge used across Dashboard & Project Overview.
 * Consistent radius, size, padding, and color logic.
 */

type PillVariant = 'healthy' | 'watch' | 'at_risk' | 'info' | 'neutral';

const VARIANT_CLASSES: Record<PillVariant, string> = {
  healthy: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  watch: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  at_risk: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  neutral: 'bg-accent text-muted-foreground',
};

interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: PillVariant;
}

const StatusPill = React.forwardRef<HTMLSpanElement, StatusPillProps>(
  ({ variant, className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold leading-snug whitespace-nowrap',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  ),
);
StatusPill.displayName = 'StatusPill';

export { StatusPill, type PillVariant };

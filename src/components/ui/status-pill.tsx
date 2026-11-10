import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * StatusPill — unified status badge used across Dashboard & Project Overview.
 * Consistent radius, size, padding, and color logic.
 */

type PillVariant = 'healthy' | 'watch' | 'at_risk' | 'info' | 'neutral';

const VARIANT_CLASSES: Record<PillVariant, string> = {
  healthy: 'bg-state-approved-bg text-state-approved-foreground',
  watch: 'bg-state-open-bg text-state-open-foreground',
  at_risk: 'bg-destructive/10 text-destructive',
  info: 'bg-type-sov/10 text-type-sov',
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
        'inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-left text-[0.7rem] font-semibold leading-snug whitespace-normal break-words sm:whitespace-nowrap',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  ),
);
StatusPill.displayName = 'StatusPill';

export { StatusPill, type PillVariant };

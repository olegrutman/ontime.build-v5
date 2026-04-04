import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * SurfaceCard — unified card primitive for all Dashboard & Overview cards.
 * Enforces consistent radius, shadow, border, and background.
 */
interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether this card has a separated header with bottom border */
  divided?: boolean;
}

const SurfaceCard = React.forwardRef<HTMLDivElement, SurfaceCardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden',
        className,
      )}
      {...props}
    />
  ),
);
SurfaceCard.displayName = 'SurfaceCard';

/**
 * SurfaceCardHeader — top section of a divided card.
 * Renders title + optional subtitle + optional right-side action.
 */
interface SurfaceCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const SurfaceCardHeader = React.forwardRef<HTMLDivElement, SurfaceCardHeaderProps>(
  ({ title, subtitle, action, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-5 py-4 border-b border-border/40 flex items-start justify-between gap-4', className)}
      {...props}
    >
      <div className="min-w-0">
        <h3 className="text-[0.95rem] font-semibold tracking-tight text-foreground leading-tight">{title}</h3>
        {subtitle && <p className="text-[0.8rem] text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  ),
);
SurfaceCardHeader.displayName = 'SurfaceCardHeader';

/**
 * SurfaceCardBody — content area of a card. Consistent padding.
 */
const SurfaceCardBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('px-5 py-4', className)} {...props} />
  ),
);
SurfaceCardBody.displayName = 'SurfaceCardBody';

/**
 * SurfaceCardFooter — optional bottom action bar (e.g. "Show all" toggle).
 */
const SurfaceCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('border-t border-border/40', className)} {...props} />
  ),
);
SurfaceCardFooter.displayName = 'SurfaceCardFooter';

export { SurfaceCard, SurfaceCardHeader, SurfaceCardBody, SurfaceCardFooter };

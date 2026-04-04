import * as React from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { useCountUp } from '@/hooks/useCountUp';

/**
 * KPICard — shared KPI stat card used on both Dashboard and Project Overview.
 * Enforces consistent radius, padding, font, and value sizing.
 */

interface KPICardProps {
  label: string;
  value: number;
  subtitle?: string;
  delay?: number;
  suffix?: string;
  isText?: boolean;
  textValue?: string;
  className?: string;
}

export function KPICard({ label, value, subtitle, delay = 0, suffix, isText, textValue, className }: KPICardProps) {
  const animated = useCountUp(value, 900, delay);

  return (
    <div className={cn('rounded-2xl border border-border/60 bg-card p-4', className)}>
      <p className="text-[0.75rem] text-muted-foreground leading-tight">{label}</p>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className="text-xl font-semibold tracking-tight text-foreground leading-none tabular-nums"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {isText ? textValue : formatCurrency(animated)}
        </span>
        {suffix && (
          <span className="text-[0.65rem] font-semibold text-muted-foreground">{suffix}</span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1.5 text-[0.7rem] text-muted-foreground leading-tight">{subtitle}</p>
      )}
    </div>
  );
}

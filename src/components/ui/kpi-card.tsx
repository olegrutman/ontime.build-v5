import * as React from 'react';
import { ChartNoAxesCombined } from 'lucide-react';
import { C, KpiCard } from '@/components/shared/KpiCard';
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
  const tone = /cost|paid out|outstanding|pending/i.test(label) ? C.amber : /margin|collected|received|profit/i.test(label) ? C.green : C.blue;
  return (
    <KpiCard label={label} value={isText ? (textValue ?? '') : formatCurrency(animated)} sub={subtitle ?? label}
      accent={tone} iconBg={`color-mix(in srgb, ${tone} 10%, transparent)`} icon={<ChartNoAxesCombined size={18} />}
      idx={delay / 40} pills={suffix ? [{ type: 'pm', text: suffix }] : []} className={className}>
      <div className="space-y-2 p-4 text-sm text-muted-foreground">
        <p>{subtitle ?? label}</p>
        <p className="font-mono text-xl font-semibold text-foreground">{isText ? textValue : formatCurrency(value)}</p>
        {suffix && <p>{suffix}</p>}
      </div>
    </KpiCard>
  );
}

import { C, KpiCard } from '@/components/shared/KpiCard';
import { TrendingUp, TrendingDown, Minus, ChartNoAxesCombined } from 'lucide-react';
import type { PeriodComparison } from '@/hooks/usePlatformMetrics';

interface Props {
  comparisons: PeriodComparison[];
}

function formatValue(val: number, isCurrency?: boolean) {
  if (isCurrency) return `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return val.toLocaleString();
}

function DeltaIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  if (current > previous) {
    const pct = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 100;
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-state-approved">
        <TrendingUp className="h-3.5 w-3.5" />
        +{pct}%
      </span>
    );
  }
  if (current < previous) {
    const pct = Math.round(((previous - current) / previous) * 100);
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-destructive">
        <TrendingDown className="h-3.5 w-3.5" />
        -{pct}%
      </span>
    );
  }
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

export function PlatformPeriodComparison({ comparisons }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
      {comparisons.map((c, idx) => <KpiCard key={c.label} label={c.label} value={formatValue(c.current, c.isCurrency)}
        sub={`vs ${formatValue(c.previous, c.isCurrency)} last month`} accent={C.blue} iconBg={C.blueBg}
        icon={<ChartNoAxesCombined size={18} />} idx={idx} spark={<DeltaIndicator current={c.current} previous={c.previous} />}>
        <div className="space-y-2 p-4 text-sm"><p>Current month: <span className="font-mono">{formatValue(c.current, c.isCurrency)}</span></p><p>Previous month: <span className="font-mono">{formatValue(c.previous, c.isCurrency)}</span></p><DeltaIndicator current={c.current} previous={c.previous} /></div>
      </KpiCard>)}
    </div>
  );
}

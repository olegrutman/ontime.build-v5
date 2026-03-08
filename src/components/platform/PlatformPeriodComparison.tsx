import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
      <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {comparisons.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
            <div className="flex items-end justify-between gap-2">
              <span className="text-xl font-bold">{formatValue(c.current, c.isCurrency)}</span>
              <DeltaIndicator current={c.current} previous={c.previous} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              vs {formatValue(c.previous, c.isCurrency)} last month
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import { DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FinancialSnapshotProps {
  billing: {
    role: 'GC' | 'TC' | 'FC';
    outstandingToCollect: number;
    outstandingToPay: number;
    invoicesSent: number;
    invoicesReceived: number;
  };
  financials: {
    totalRevenue: number;
    totalBilled: number;
    profitMargin: number;
    outstandingBilling: number;
  };
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toLocaleString()}`;
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: string;
  subtitle?: string;
}

function MetricCard({ label, value, icon, accent = 'text-foreground', subtitle }: MetricCardProps) {
  return (
    <Card data-sasha-card="Financial Metric">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-1.5">
          {icon}
          <span className="text-[11px] sm:text-xs uppercase tracking-wide font-medium text-muted-foreground">{label}</span>
        </div>
        <p className={`text-lg sm:text-xl font-bold tabular-nums ${accent}`}>{value}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export function DashboardFinancialSnapshot({ billing, financials }: FinancialSnapshotProps) {
  const hasData = financials.totalRevenue > 0 || billing.outstandingToCollect > 0 || billing.outstandingToPay > 0;
  
  if (!hasData) return null;

  const metrics: MetricCardProps[] = [];

  if (billing.role === 'GC') {
    metrics.push({
      label: 'Total Obligations',
      value: formatCurrency(financials.totalRevenue),
      icon: <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />,
    });
    metrics.push({
      label: 'Billed by Subs',
      value: formatCurrency(financials.totalBilled),
      icon: <ArrowDownRight className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />,
      subtitle: `${billing.invoicesReceived} to review`,
    });
    metrics.push({
      label: 'To Pay',
      value: formatCurrency(billing.outstandingToPay),
      icon: <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />,
      accent: billing.outstandingToPay > 0 ? 'text-destructive' : 'text-foreground',
    });
  } else {
    // TC and FC see receivable-focused metrics
    metrics.push({
      label: 'Contract Revenue',
      value: formatCurrency(financials.totalRevenue),
      icon: <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />,
    });
    metrics.push({
      label: 'To Collect',
      value: formatCurrency(billing.outstandingToCollect),
      icon: <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />,
      accent: billing.outstandingToCollect > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground',
      subtitle: billing.invoicesSent > 0 ? `${billing.invoicesSent} sent` : undefined,
    });
    if (billing.role === 'TC' && billing.outstandingToPay > 0) {
      metrics.push({
        label: 'To Pay',
        value: formatCurrency(billing.outstandingToPay),
        icon: <ArrowDownRight className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />,
        subtitle: `${billing.invoicesReceived} to review`,
      });
    }
    if (financials.profitMargin > 0) {
      metrics.push({
        label: 'Profit Margin',
        value: `${financials.profitMargin.toFixed(0)}%`,
        icon: <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />,
        accent: 'text-emerald-600 dark:text-emerald-400',
      });
    }
  }

  // Cap at 4 metrics
  const displayMetrics = metrics.slice(0, 4);
  const gridCols = displayMetrics.length <= 2 ? 'grid-cols-2' : displayMetrics.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4';

  return (
    <div className={`grid gap-2 sm:gap-3 ${gridCols}`}>
      {displayMetrics.map((metric) => (
        <MetricCard key={metric.label} {...metric} />
      ))}
    </div>
  );
}

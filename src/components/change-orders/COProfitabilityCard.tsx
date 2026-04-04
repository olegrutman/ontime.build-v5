import { DT } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { EyeOff } from 'lucide-react';
import type { COFinancials } from '@/types/changeOrder';

interface COProfitabilityCardProps {
  isTC: boolean;
  isFC: boolean;
  financials: COFinancials;
}

function fmtCurrency(value: number) {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function COProfitabilityCard({ isTC, isFC, financials }: COProfitabilityCardProps) {
  if (!isTC && !isFC) return null;

  let revenue = 0;
  let costs = 0;
  let label = '';

  if (isTC) {
    revenue = financials.tcBillableToGC + financials.materialsTotal + financials.equipmentTotal;
    costs = financials.fcLaborTotal + financials.tcActualCostTotal;
    label = 'TC Profitability';
  } else {
    revenue = financials.fcLaborTotal;
    costs = financials.fcActualCostTotal;
    label = 'FC Profitability';
  }

  const margin = revenue - costs;
  const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
  const isPositive = margin >= 0;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-3.5 py-3 border-b border-border flex items-center justify-between">
        <h3
          className="text-[0.7rem] uppercase tracking-[0.04em] font-semibold text-muted-foreground"
         
        >
          {label}
        </h3>
        <EyeOff className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="px-3.5 py-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Revenue</span>
          <span className="font-mono font-medium text-foreground">
            {fmtCurrency(revenue)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Costs</span>
          <span className="font-mono font-medium text-foreground">
            {fmtCurrency(costs)}
          </span>
        </div>
        <div className="border-t border-border pt-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-foreground">Margin</span>
            <div className="text-right">
              <span
                className={cn('font-bold', isPositive ? 'text-emerald-600' : 'text-destructive')}
               
              >
                {fmtCurrency(margin)}
              </span>
              <span className={cn('text-xs ml-1', isPositive ? 'text-emerald-600' : 'text-destructive')}>
                ({marginPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

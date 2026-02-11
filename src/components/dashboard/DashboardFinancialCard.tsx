import { useState } from 'react';
import { DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface DashboardFinancialCardProps {
  role: 'GC' | 'TC' | 'FC';
  totalContractValue: number;
  outstandingToPay: number;
  outstandingToCollect: number;
  profitMargin?: number;
  totalRevenue?: number;
  totalCosts?: number;
  totalWorkOrders?: number;
  totalWorkOrderValue?: number;
  totalBilled?: number;
  outstandingBilling?: number;
  potentialProfit?: number;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function DashboardFinancialCard({
  role,
  totalContractValue,
  outstandingToPay,
  outstandingToCollect,
  profitMargin,
  totalRevenue,
  totalCosts,
  totalWorkOrders,
  totalWorkOrderValue,
  totalBilled,
  outstandingBilling,
  potentialProfit,
}: DashboardFinancialCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (role === 'TC') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Financial Snapshot
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8 p-0 lg:hidden"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Headline: Total Revenue */}
          <div>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue || 0)}</p>
          </div>

          <div className={cn("space-y-3", !expanded && "hidden lg:block")}>
            <Separator />

            {/* Revenue breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCell
                label="Active Contracts"
                value={formatCurrency(totalContractValue)}
              />
              <MetricCell
                label={`Work Orders (${totalWorkOrders || 0})`}
                value={formatCurrency(totalWorkOrderValue || 0)}
              />
            </div>

            <Separator />

            {/* Billing metrics */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCell
                label="Total Billed"
                value={formatCurrency(totalBilled || 0)}
                color="text-green-600"
              />
              <MetricCell
                label="Outstanding Billing"
                value={formatCurrency(outstandingBilling || 0)}
                color="text-amber-600"
              />
              <MetricCell
                label="Outstanding to Collect"
                value={formatCurrency(outstandingToCollect)}
                color="text-green-600"
              />
            </div>

            <Separator />

            {/* Cost & profit */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCell
                label="Costs"
                value={`-${formatCurrency(totalCosts || 0)}`}
                color="text-destructive"
              />
              <MetricCell
                label="Potential Profit"
                value={formatCurrency(potentialProfit || 0)}
                color={(potentialProfit || 0) >= 0 ? 'text-green-600' : 'text-destructive'}
              />
              <MetricCell
                label="Profit Margin"
                value={profitMargin !== undefined ? `${profitMargin.toFixed(1)}%` : '--'}
                color={(profitMargin || 0) >= 0 ? 'text-green-600' : 'text-destructive'}
                large
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // GC / FC layout (unchanged)
  const headlineLabel = 'Total Contracts';
  const headlineValue = totalContractValue;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Financial Snapshot
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-8 w-8 p-0 lg:hidden"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground">{headlineLabel}</p>
          <p className="text-2xl font-bold">{formatCurrency(headlineValue)}</p>
        </div>

        <div className={cn("space-y-3", !expanded && "hidden lg:block")}>
          <Separator />
          
          <div className="grid grid-cols-2 gap-3">
            {role === 'GC' && (
              <MetricCell 
                label="Outstanding to Pay" 
                value={formatCurrency(outstandingToPay)} 
                color="text-amber-600" 
              />
            )}
            
            {role === 'FC' && (
              <>
                <MetricCell 
                  label="Outstanding to Collect" 
                  value={formatCurrency(outstandingToCollect)} 
                  color="text-green-600" 
                />
                <MetricCell 
                  label="Contract Value" 
                  value={formatCurrency(totalContractValue)} 
                />
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCell({ label, value, color, large }: { label: string; value: string; color?: string; large?: boolean }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn(
        "font-semibold",
        large ? "text-xl" : "text-base",
        color
      )}>
        {value}
      </p>
    </div>
  );
}

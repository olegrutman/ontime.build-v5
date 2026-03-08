import { DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface FinancialSnapshotTileProps {
  role: 'GC' | 'TC' | 'FC';
  totalContractValue: number;
  outstandingToPay: number;
  outstandingToCollect: number;
  profitMargin?: number;
  totalRevenue?: number;
  totalCosts?: number;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${Math.round(value)}`;
}

export function FinancialSnapshotTile({ 
  role, 
  totalContractValue, 
  outstandingToPay, 
  outstandingToCollect,
  profitMargin,
  totalRevenue,
  totalCosts 
}: FinancialSnapshotTileProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-5 w-5 text-green-600" />
          Financial Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {/* Total Contracts */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total Contracts</span>
          <span className="font-semibold">{formatCurrency(totalContractValue)}</span>
        </div>
        
        {role === 'GC' && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Outstanding to Pay</span>
            <span className="font-semibold text-amber-600">{formatCurrency(outstandingToPay)}</span>
          </div>
        )}
        
        {role === 'TC' && (
          <>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Revenue</span>
              <span className="font-semibold">{formatCurrency(totalRevenue || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Costs</span>
              <span className="font-medium text-red-600">-{formatCurrency(totalCosts || 0)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Profit Margin</span>
              <span className={cn(
                "font-bold text-lg",
                (profitMargin || 0) >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {profitMargin !== undefined ? `${profitMargin.toFixed(1)}%` : '--'}
              </span>
            </div>
          </>
        )}
        
        {(role === 'TC' || role === 'FC') && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Outstanding to Collect</span>
            <span className="font-semibold text-green-600">{formatCurrency(outstandingToCollect)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

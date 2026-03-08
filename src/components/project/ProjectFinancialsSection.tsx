import { DollarSign, TrendingUp, Receipt, Percent, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ProjectFinancialsSectionProps {
  contractValue: number;
  changeOrdersTotal: number;
  billedToDate: number;
  retainagePercent: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ProjectFinancialsSection({
  contractValue,
  changeOrdersTotal,
  billedToDate,
  retainagePercent,
}: ProjectFinancialsSectionProps) {
  const totalContractValue = contractValue + changeOrdersTotal;
  const estimatedProfit = totalContractValue * 0.15; // Placeholder 15% margin
  const outstanding = totalContractValue - billedToDate;
  const retainageAmount = billedToDate * (retainagePercent / 100);
  const billingProgress = totalContractValue > 0 ? (billedToDate / totalContractValue) * 100 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Contract Value */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contract Value</p>
              <p className="text-2xl font-bold">{formatCurrency(totalContractValue)}</p>
              {changeOrdersTotal > 0 && (
                <p className="text-xs text-muted-foreground">
                  Base: {formatCurrency(contractValue)} + COs: {formatCurrency(changeOrdersTotal)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estimated Profit */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estimated Profit</p>
              <p className="text-2xl font-bold">{formatCurrency(estimatedProfit)}</p>
              <p className="text-xs text-muted-foreground">15% margin</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billed to Date */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
              <Receipt className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Billed to Date</p>
              <p className="text-2xl font-bold">{formatCurrency(billedToDate)}</p>
              <p className="text-xs text-muted-foreground">
                Outstanding: {formatCurrency(outstanding)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retainage */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/20">
              <Percent className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Retainage Held</p>
              <p className="text-2xl font-bold">{formatCurrency(retainageAmount)}</p>
              <p className="text-xs text-muted-foreground">{retainagePercent}% of billed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Progress - Full Width */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20">
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Billing Progress</p>
                <p className="text-sm text-muted-foreground">{billingProgress.toFixed(1)}%</p>
              </div>
            </div>
          </div>
          <Progress value={billingProgress} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Billed: {formatCurrency(billedToDate)}</span>
            <span>Remaining: {formatCurrency(outstanding)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Receipt, CheckCircle, Clock, Percent } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectRoleData } from '@/hooks/useProjectRole';
import { cn } from '@/lib/utils';

interface InvoiceProgressProps {
  roleData: ProjectRoleData;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function InvoiceProgress({ roleData }: InvoiceProgressProps) {
  const { role, invoices, contracts, loading } = roleData;
  const isGC = role === 'General Contractor';

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  // Get contract value for progress calculation
  const contractValue = isGC 
    ? contracts.downstream?.contract_sum || 0
    : contracts.upstream?.contract_sum || 0;
  
  const invoicedPercent = contractValue > 0 
    ? (invoices.invoicedAmount / contractValue) * 100 
    : 0;
  const paidPercent = contractValue > 0 
    ? (invoices.paidAmount / contractValue) * 100 
    : 0;

  // GC View: Show received invoices
  if (isGC) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Invoice Progress</h3>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {/* Invoices Received */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20 shrink-0">
                  <Receipt className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Invoices Received</p>
                  <p className="text-2xl font-bold">{invoices.invoicesReceived}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {formatCurrency(invoices.receivedAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Paid */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20 shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Paid</p>
                  <p className="text-2xl font-bold truncate">{formatCurrency(invoices.paidAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Outstanding */}
          <Card className={invoices.outstandingAmount > 0 ? 'border-amber-200 dark:border-amber-800' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
                  invoices.outstandingAmount > 0 
                    ? 'bg-amber-100 dark:bg-amber-900/20' 
                    : 'bg-muted'
                )}>
                  <Clock className={cn(
                    'h-5 w-5',
                    invoices.outstandingAmount > 0 ? 'text-amber-600' : 'text-muted-foreground'
                  )} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                  <p className="text-2xl font-bold truncate">
                    {formatCurrency(invoices.outstandingAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // FC / TC View: Show billing progress
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Invoice Progress</h3>
      
      {/* Progress bar card */}
      {contractValue > 0 && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Invoiced Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Invoiced</span>
                <span className="font-medium">
                  {formatCurrency(invoices.invoicedAmount)} ({invoicedPercent.toFixed(0)}%)
                </span>
              </div>
              <Progress value={invoicedPercent} className="h-2" />
            </div>

            {/* Paid Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-medium">
                  {formatCurrency(invoices.paidAmount)} ({paidPercent.toFixed(0)}%)
                </span>
              </div>
              <Progress value={paidPercent} className="h-2 [&>div]:bg-green-500" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary tiles */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Invoiced */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20 shrink-0">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">Invoiced</p>
                <p className="text-xl font-bold truncate">{formatCurrency(invoices.invoicedAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paid */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20 shrink-0">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-xl font-bold truncate">{formatCurrency(invoices.paidAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Retainage Held */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/20 shrink-0">
                <Percent className="h-5 w-5 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">Retainage</p>
                <p className="text-xl font-bold truncate">{formatCurrency(invoices.retainageHeld)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Outstanding */}
        <Card className={invoices.outstandingAmount > 0 ? 'border-amber-200 dark:border-amber-800' : ''}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
                invoices.outstandingAmount > 0 
                  ? 'bg-orange-100 dark:bg-orange-900/20' 
                  : 'bg-muted'
              )}>
                <Clock className={cn(
                  'h-5 w-5',
                  invoices.outstandingAmount > 0 ? 'text-orange-600' : 'text-muted-foreground'
                )} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-xl font-bold truncate">{formatCurrency(invoices.outstandingAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { ClipboardCheck, Clock, ClipboardList, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectRoleData } from '@/hooks/useProjectRole';
import { cn } from '@/lib/utils';

interface WorkOrderSummaryProps {
  roleData: ProjectRoleData;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function WorkOrderSummary({ roleData }: WorkOrderSummaryProps) {
  const { role, workOrders, workOrderProfit, loading } = roleData;
  const isTrade = role === 'Trade Contractor';

  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Work Orders</h3>
      <div className={cn(
        'grid gap-4',
        isTrade ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'
      )}>
        {/* Approved Work Orders */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20 shrink-0">
                <ClipboardCheck className="h-5 w-5 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{workOrders.approved}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {formatCurrency(workOrders.approvedAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Work Orders */}
        <Card className={workOrders.pending > 0 ? 'border-amber-200 dark:border-amber-800' : ''}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
                workOrders.pending > 0 
                  ? 'bg-amber-100 dark:bg-amber-900/20' 
                  : 'bg-muted'
              )}>
                <Clock className={cn(
                  'h-5 w-5',
                  workOrders.pending > 0 ? 'text-amber-600' : 'text-muted-foreground'
                )} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{workOrders.pending}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {formatCurrency(workOrders.pendingAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Work Orders */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20 shrink-0">
                <ClipboardList className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{workOrders.total}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {formatCurrency(workOrders.totalAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Order Profit - Trade Contractor Only */}
        {isTrade && (
          <Card className={cn(
            'border-l-4',
            workOrderProfit > 0 ? 'border-l-green-500' : 'border-l-muted'
          )}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
                  workOrderProfit > 0 
                    ? 'bg-green-100 dark:bg-green-900/20' 
                    : 'bg-muted'
                )}>
                  <TrendingUp className={cn(
                    'h-5 w-5',
                    workOrderProfit > 0 ? 'text-green-600' : 'text-muted-foreground'
                  )} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Work Order Profit</p>
                  <p className="text-2xl font-bold">{formatCurrency(workOrderProfit)}</p>
                  <p className="text-xs text-muted-foreground">
                    Approved margin
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

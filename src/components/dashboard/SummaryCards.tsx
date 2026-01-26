import { Briefcase, AlertCircle, DollarSign, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SummaryCardsProps {
  activeProjects: number;
  needsAttention: {
    changeOrders: number;
    invoices: number;
    pendingInvites: number;
  };
  billing: {
    role: 'GC' | 'TC' | 'FC';
    invoicesReceived?: number;
    invoicesSent?: number;
    outstandingToPay?: number;
    outstandingToCollect?: number;
    profit?: number;
  };
  thisMonth: {
    invoices: number;
    changeOrders: number;
  };
  onActiveClick: () => void;
  onAttentionClick: () => void;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

export function SummaryCards({
  activeProjects,
  needsAttention,
  billing,
  thisMonth,
  onActiveClick,
  onAttentionClick,
}: SummaryCardsProps) {
  const totalAttention = needsAttention.changeOrders + needsAttention.invoices + needsAttention.pendingInvites;

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {/* Active Projects */}
      <Card 
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={onActiveClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Projects</p>
              <p className="text-2xl font-bold">{activeProjects}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Needs Attention */}
      <Card 
        className={cn(
          "cursor-pointer hover:bg-accent/50 transition-colors",
          totalAttention > 0 && "border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10"
        )}
        onClick={onAttentionClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              totalAttention > 0 ? "bg-amber-500/10" : "bg-muted"
            )}>
              <AlertCircle className={cn(
                "h-5 w-5",
                totalAttention > 0 ? "text-amber-600" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Needs Attention</p>
              <p className="text-2xl font-bold">{totalAttention}</p>
              {totalAttention > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {needsAttention.changeOrders > 0 && `${needsAttention.changeOrders} COs`}
                  {needsAttention.changeOrders > 0 && needsAttention.invoices > 0 && ', '}
                  {needsAttention.invoices > 0 && `${needsAttention.invoices} invoices`}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Snapshot - Role Aware */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">Billing</p>
              {billing.role === 'GC' && (
                <>
                  <p className="text-lg font-bold truncate">
                    {formatCurrency(billing.outstandingToPay || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Outstanding to pay</p>
                </>
              )}
              {billing.role === 'TC' && (
                <>
                  <p className="text-lg font-bold truncate">
                    {formatCurrency(billing.outstandingToCollect || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Outstanding to collect</p>
                </>
              )}
              {billing.role === 'FC' && (
                <>
                  <p className="text-lg font-bold truncate">
                    {formatCurrency(billing.invoicesSent || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Invoices submitted</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* This Month */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-lg font-bold">{thisMonth.invoices} invoices</p>
              <p className="text-xs text-muted-foreground">
                {thisMonth.changeOrders} work orders
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

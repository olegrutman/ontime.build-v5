import { DollarSign, TrendingUp, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectRoleData } from '@/hooks/useProjectRole';
import { cn } from '@/lib/utils';

interface ContractTilesProps {
  roleData: ProjectRoleData;
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function ContractTiles({ roleData }: ContractTilesProps) {
  const { role, contracts, estimatedProfit, loading } = roleData;

  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  const upstreamValue = contracts.upstream?.contract_sum || 0;
  const downstreamValue = contracts.downstream?.contract_sum || 0;
  const upstreamRetainage = contracts.upstream?.retainage_percent || 0;
  const downstreamRetainage = contracts.downstream?.retainage_percent || 0;

  // Field Crew: Show single contract with Trade Contractor
  if (role === 'Field Crew') {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <ContractCard
          title="Contract with Trade Contractor"
          value={upstreamValue}
          retainage={upstreamRetainage}
          colorClass="border-l-primary"
          iconBgClass="bg-primary/10"
          iconClass="text-primary"
        />
      </div>
    );
  }

  // General Contractor: Show single contract with Trade Contractor
  if (role === 'General Contractor') {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <ContractCard
          title="Contract with Trade Contractor"
          value={downstreamValue}
          retainage={downstreamRetainage}
          colorClass="border-l-primary"
          iconBgClass="bg-primary/10"
          iconClass="text-primary"
        />
      </div>
    );
  }

  // Trade Contractor: Show both contracts + profit
  const hasBoth = upstreamValue > 0 && downstreamValue > 0;
  const profitPercent = hasBoth && upstreamValue > 0 
    ? (estimatedProfit / upstreamValue) * 100 
    : 0;

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {/* Contract with GC (Revenue) */}
      <ContractCard
        title="Contract with General Contractor"
        value={upstreamValue}
        retainage={upstreamRetainage}
        colorClass="border-l-primary"
        iconBgClass="bg-primary/10"
        iconClass="text-primary"
        subtitle="Revenue"
      />

      {/* Contract with FC (Cost) */}
      <ContractCard
        title="Contract with Field Crew"
        value={downstreamValue}
        retainage={downstreamRetainage}
        colorClass="border-l-orange-500"
        iconBgClass="bg-orange-100 dark:bg-orange-900/20"
        iconClass="text-orange-600"
        subtitle="Cost"
      />

      {/* Estimated Profit */}
      <Card className={cn(
        'border-l-4',
        hasBoth 
          ? estimatedProfit > 0 
            ? 'border-l-green-500' 
            : 'border-l-red-500'
          : 'border-l-muted'
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
              hasBoth 
                ? estimatedProfit > 0 
                  ? 'bg-green-100 dark:bg-green-900/20' 
                  : 'bg-red-100 dark:bg-red-900/20'
                : 'bg-muted'
            )}>
              <TrendingUp className={cn(
                'h-5 w-5',
                hasBoth 
                  ? estimatedProfit > 0 ? 'text-green-600' : 'text-red-600'
                  : 'text-muted-foreground'
              )} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">Estimated Profit</p>
              {hasBoth ? (
                <>
                  <p className={cn(
                    'text-2xl font-bold truncate',
                    estimatedProfit < 0 && 'text-red-600'
                  )}>
                    {formatCurrency(estimatedProfit)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profitPercent.toFixed(1)}% margin
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Add both contracts to calculate
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ContractCardProps {
  title: string;
  value: number;
  retainage: number;
  colorClass: string;
  iconBgClass: string;
  iconClass: string;
  subtitle?: string;
}

function ContractCard({ 
  title, 
  value, 
  retainage, 
  colorClass, 
  iconBgClass, 
  iconClass,
  subtitle 
}: ContractCardProps) {
  const hasValue = value > 0;
  
  return (
    <Card className={cn('border-l-4', hasValue ? colorClass : 'border-l-muted border-dashed')}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
            hasValue ? iconBgClass : 'bg-muted'
          )}>
            {hasValue ? (
              <DollarSign className={cn('h-5 w-5', iconClass)} />
            ) : (
              <FileText className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            {hasValue ? (
              <>
                <p className="text-2xl font-bold truncate">{formatCurrency(value)}</p>
                <p className="text-xs text-muted-foreground">
                  {retainage}% retainage{subtitle && ` • ${subtitle}`}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic mt-1">
                Not configured
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

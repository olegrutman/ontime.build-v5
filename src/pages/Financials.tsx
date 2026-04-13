import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useFinancialTrends } from '@/hooks/useFinancialTrends';
import { AppLayout } from '@/components/layout';
import { DashboardFinancialCard } from '@/components/dashboard/DashboardFinancialCard';
import { FinancialTrendCharts } from '@/components/dashboard/FinancialTrendCharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock } from 'lucide-react';

export default function Financials() {
  const { userOrgRoles, permissions, loading: authLoading } = useAuth();
  const { billing, financials, loading: dataLoading } = useDashboardData();
  const { spendTrend, woTrend, loading: trendsLoading } = useFinancialTrends();

  const currentOrg = userOrgRoles[0]?.organization;
  const isSupplier = currentOrg?.type === 'SUPPLIER';
  const canViewFinancials = permissions?.canViewRates ?? false;

  if (authLoading || dataLoading) {
    return (
      <AppLayout title="Financials">
        <div className="p-4 sm:p-6 max-w-2xl">
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (isSupplier || !canViewFinancials) {
    return (
      <AppLayout title="Financials">
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {isSupplier ? 'Not available' : 'Access restricted'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {isSupplier
              ? 'Financial snapshots are not available for Supplier organizations.'
              : 'You do not have permission to view financial data. Contact your administrator.'}
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Financials">
      <div className="p-4 sm:p-6 space-y-5 max-w-4xl">
        <div className="max-w-2xl">
          <DashboardFinancialCard
            role={billing.role}
            totalContractValue={financials.totalContracts}
            outstandingToPay={billing.outstandingToPay}
            outstandingToCollect={billing.outstandingToCollect}
            profitMargin={financials.profitMargin}
            totalRevenue={financials.totalRevenue}
            totalCosts={financials.totalCosts}
            totalBilled={financials.totalBilled}
            outstandingBilling={financials.outstandingBilling}
            potentialProfit={financials.potentialProfit}
          />
        </div>
        <FinancialTrendCharts
          spendTrend={spendTrend}
          woTrend={woTrend}
          loading={trendsLoading}
        />
      </div>
    </AppLayout>
  );
}

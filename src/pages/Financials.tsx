import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { AppLayout } from '@/components/layout';
import { DashboardFinancialCard } from '@/components/dashboard/DashboardFinancialCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function Financials() {
  const { userOrgRoles, loading: authLoading } = useAuth();
  const { billing, financials, loading: dataLoading } = useDashboardData();

  const currentOrg = userOrgRoles[0]?.organization;
  const isSupplier = currentOrg?.type === 'SUPPLIER';

  if (authLoading || dataLoading) {
    return (
      <AppLayout title="Financials">
        <div className="p-4 sm:p-6 max-w-2xl">
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (isSupplier) {
    return (
      <AppLayout title="Financials">
        <div className="p-6 text-muted-foreground">
          Financial snapshots are not available for Supplier organizations.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Financials">
      <div className="max-w-2xl">
        <DashboardFinancialCard
          role={billing.role}
          totalContractValue={financials.totalContracts}
          outstandingToPay={billing.outstandingToPay}
          outstandingToCollect={billing.outstandingToCollect}
          profitMargin={financials.profitMargin}
          totalRevenue={financials.totalRevenue}
          totalCosts={financials.totalCosts}
          totalWorkOrders={financials.totalWorkOrders}
          totalWorkOrderValue={financials.totalWorkOrderValue}
          totalBilled={financials.totalBilled}
          outstandingBilling={financials.outstandingBilling}
          potentialProfit={financials.potentialProfit}
        />
      </div>
    </AppLayout>
  );
}

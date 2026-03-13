import { useSupplierDashboardData } from '@/hooks/useSupplierDashboardData';
import { AppLayout } from '@/components/layout';
import { Skeleton } from '@/components/ui/skeleton';
import { SupplierKPIStrip } from './supplier/SupplierKPIStrip';
import { SupplierActionQueue } from './supplier/SupplierActionQueue';
import { SupplierDeliverySchedule } from './supplier/SupplierDeliverySchedule';
import { SupplierReceivables } from './supplier/SupplierReceivables';
import { SupplierEstimateCatalog } from './supplier/SupplierEstimateCatalog';
import { SupplierProjectHealth } from './supplier/SupplierProjectHealth';
import { SupplierProjectList } from './supplier/SupplierProjectList';
import { SupplierOpenOrders } from './supplier/SupplierOpenOrders';
import { SupplierReturnsQueue } from './supplier/SupplierReturnsQueue';
import { OrgInviteBanner } from './OrgInviteBanner';
import { PendingInvitesPanel, type PendingInvite } from './PendingInvitesPanel';

interface SupplierDashboardProps {
  pendingInvites?: PendingInvite[];
  onRefreshInvites?: () => void;
}

export function SupplierDashboard({ pendingInvites = [], onRefreshInvites }: SupplierDashboardProps) {
  const {
    kpis, actionItems, deliveryDays, deliveryRows,
    agingBuckets, velocityTrend, oldestInvoiceDays,
    estimates, projectHealth, acceptedProjects, openPOs, returns, loading,
  } = useSupplierDashboardData();

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-40" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-2.5">
        <OrgInviteBanner />

        {pendingInvites.length > 0 && onRefreshInvites && (
          <PendingInvitesPanel invites={pendingInvites} onRefresh={onRefreshInvites} />
        )}

        {/* Section 1: KPI Strip */}
        <SupplierKPIStrip kpis={kpis} />

        {/* Section 2: Action Queue */}
        <SupplierActionQueue items={actionItems} />

        {/* Section 2.5: Projects */}
        <SupplierProjectList projects={projectHealth} />

        {/* Section 3: Delivery Schedule + Receivables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          <SupplierDeliverySchedule days={deliveryDays} rows={deliveryRows} />
          <SupplierReceivables
            buckets={agingBuckets}
            velocity={velocityTrend}
            oldestDays={oldestInvoiceDays}
          />
        </div>

        {/* Section 4: Estimate Catalog + Project Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          <SupplierEstimateCatalog estimates={estimates} />
          <SupplierProjectHealth rows={projectHealth} />
        </div>

        {/* Section 5: Open POs + Returns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          <SupplierOpenOrders pos={openPOs} />
          <SupplierReturnsQueue returns={returns} />
        </div>
      </div>
    </AppLayout>
  );
}

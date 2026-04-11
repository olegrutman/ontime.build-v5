import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus } from 'lucide-react';
import { useChangeOrders } from '@/hooks/useChangeOrders';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { COWizard } from './wizard/COWizard';
import { COBoardCard } from './COBoardCard';
import { FCHomeScreen } from './FCHomeScreen';
import { useCORoleContext } from '@/hooks/useCORoleContext';
import { useIsMobile } from '@/hooks/use-mobile';


interface COListPageProps {
  projectId: string;
  isTM?: boolean;
}

type FilterKey = 'all' | 'my_action' | 'in_progress' | 'approved_filter';

export function COListPage({ projectId }: COListPageProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { userOrgRoles } = useAuth();
  const { changeOrders, isLoading } = useChangeOrders(projectId);

  // Determine if FC role
  const orgType = userOrgRoles?.[0]?.organization?.type;
  const isFC = orgType === 'FC';

  const [wizardOpen, setWizardOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');
  function handleCardClick(id: string) {
    navigate(`/project/${projectId}/change-orders/${id}`);
  }

  const orgId = userOrgRoles?.[0]?.organization_id ?? null;
  const total = changeOrders.length;

  // Stats — preserves BUG 2, 3 fixes
  const stats = useMemo(() => {
    let totalValue = 0;
    let pendingApproval = 0;
    let awaitingPricing = 0;
    let approvedBillableValue = 0;
    let approvedCount = 0;
    let myActionCount = 0;
    let inProgressCount = 0;

    for (const co of changeOrders) {
      if (co.status !== 'draft') totalValue += (co.tc_submitted_price ?? 0);
      if (co.status === 'submitted' && co.org_id === orgId) pendingApproval++;
      if (co.status === 'closed_for_pricing') awaitingPricing++;
      if (co.status === 'approved') {
        approvedBillableValue += (co.tc_submitted_price ?? 0);
        approvedCount++;
      }
      if (['draft', 'shared', 'work_in_progress', 'closed_for_pricing', 'submitted'].includes(co.status)) {
        inProgressCount++;
      }
      if (
        (co.status === 'submitted' && co.org_id === orgId) ||
        (co.status === 'closed_for_pricing' && (co.org_id === orgId || co.assigned_to_org_id === orgId)) ||
        (co.status === 'work_in_progress' && co.assigned_to_org_id === orgId)
      ) myActionCount++;
    }

    return { totalValue, pendingApproval, awaitingPricing, approvedBillableValue, approvedCount, myActionCount, inProgressCount };
  }, [changeOrders, orgId]);

  // Filter
  const filteredCOs = useMemo(() => {
    if (filter === 'all') return changeOrders;
    if (filter === 'my_action') return changeOrders.filter(co =>
      (co.status === 'submitted' && co.org_id === orgId) ||
      (co.status === 'closed_for_pricing' && (co.org_id === orgId || co.assigned_to_org_id === orgId)) ||
      (co.status === 'work_in_progress' && co.assigned_to_org_id === orgId)
    );
    if (filter === 'in_progress') return changeOrders.filter(co =>
      ['draft', 'shared', 'work_in_progress', 'closed_for_pricing', 'submitted'].includes(co.status)
    );
    if (filter === 'approved_filter') return changeOrders.filter(co =>
      ['approved', 'contracted'].includes(co.status)
    );
    return changeOrders;
  }, [changeOrders, filter, orgId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // FC gets their own home screen
  if (isFC) {
    return <FCHomeScreen projectId={projectId} />;
  }

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      {/* Page Header */}
      <div className="co-light-shell p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-semibold text-foreground">Change Orders</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{total === 0 ? 'No change orders yet' : `${total} total`}</p>
          </div>

          <Button size="sm" onClick={() => setWizardOpen(true)} className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New CO</span>
          </Button>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
          {([
            { key: 'all', label: 'All', count: total },
            { key: 'my_action', label: 'Action', count: stats.myActionCount },
            { key: 'in_progress', label: 'Active', count: stats.inProgressCount },
            { key: 'approved_filter', label: 'Approved', count: stats.approvedCount },
          ] as { key: FilterKey; label: string; count: number }[]).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'shrink-0 inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-colors border',
                filter === f.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:bg-accent',
              )}
            >
              {f.label}
              <span className={cn(
                'text-[10px] px-1 py-0.5 rounded-full',
                filter === f.key ? 'bg-primary-foreground/20' : 'bg-muted',
              )}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Stats row */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-3 sm:overflow-visible sm:mx-0 sm:px-0">
          {[
            { label: 'Total CO value', value: `$${stats.totalValue.toLocaleString()}`, color: '#F5A623' },
            { label: 'Pending', value: String(stats.pendingApproval), color: '#F59E0B' },
            { label: 'Pricing', value: String(stats.awaitingPricing), color: '#3B82F6' },
            { label: 'Approved', value: `$${stats.approvedBillableValue.toLocaleString()}`, color: '#10B981' },
          ].map(tile => (
            <div
              key={tile.label}
              className="bg-card rounded-lg px-2.5 py-2 sm:px-3 sm:py-2.5 border border-border shrink-0 min-w-[80px] sm:min-w-0"
              style={{ borderTopWidth: '3px', borderTopColor: tile.color }}
            >
              <p className="text-[9px] sm:text-[0.6rem] uppercase tracking-wider text-muted-foreground font-medium">{tile.label}</p>
              <p className="text-foreground leading-none mt-1 text-sm sm:text-[1.25rem]" style={{ fontWeight: 900 }}>
                {tile.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Card Grid */}
      {total === 0 ? (
        <div className="co-light-shell flex flex-col items-center justify-center py-16 text-center gap-3 px-4">
          <p className="text-lg font-medium text-foreground">No change orders yet</p>
          <p className="text-sm text-muted-foreground max-w-sm">Create a change order to track scope changes on this project.</p>
          <Button onClick={() => setWizardOpen(true)} className="gap-1.5 mt-2">
            <Plus className="h-4 w-4" />
            New Change Order
          </Button>
        </div>
      ) : (
        <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {filteredCOs.map(co => (
            <COBoardCard
              key={co.id}
              co={co}
              isActive={false}
              onClick={handleCardClick}
            />
          ))}
        </div>
      )}

      <COWizard open={wizardOpen} onOpenChange={setWizardOpen} projectId={projectId} />

    </div>
  );
}

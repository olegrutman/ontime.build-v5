import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus } from 'lucide-react';
import { useChangeOrders } from '@/hooks/useChangeOrders';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { coLabel, coAbbrev, docTypeFromMode } from '@/lib/coLabel';

import { COMoneyBar } from './COMoneyBar';
import { CORow } from './CORow';


import { useCORoleContext } from '@/hooks/useCORoleContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePermission } from '@/components/auth/RequirePermission';




interface COListPageProps {
  projectId: string;
  isTM?: boolean;
}

type FilterKey = 'all' | 'my_action' | 'in_progress' | 'approved_filter' | 'withdrawn_filter';

export function COListPage({ projectId, isTM = false }: COListPageProps) {
  const dt = docTypeFromMode(isTM);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { userOrgRoles } = useAuth();
  const { changeOrders, isLoading } = useChangeOrders(projectId);


  const canCreateCO = usePermission('canCreateChangeOrders');
  // Navigate to the new Picker v3 full-page wizard
  const openNewPicker = () => navigate(`/project/${projectId}/change-orders/start`);
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
    let withdrawnCount = 0;

    for (const co of changeOrders) {
      if (co.status !== 'draft' && co.status !== 'withdrawn') totalValue += (co.tc_submitted_price ?? 0);
      if (co.status === 'submitted' && co.org_id === orgId) pendingApproval++;
      if (co.status === 'closed_for_pricing') awaitingPricing++;
      if (co.status === 'approved') {
        approvedBillableValue += (co.tc_submitted_price ?? 0);
        approvedCount++;
      }
      if (['draft', 'shared', 'work_in_progress', 'closed_for_pricing', 'submitted'].includes(co.status)) {
        inProgressCount++;
      }
      if (co.status === 'withdrawn') withdrawnCount++;
      if (
        (co.status === 'submitted' && co.org_id === orgId) ||
        (co.status === 'closed_for_pricing' && (co.org_id === orgId || co.assigned_to_org_id === orgId)) ||
        (co.status === 'work_in_progress' && co.assigned_to_org_id === orgId)
      ) myActionCount++;
    }

    return { totalValue, pendingApproval, awaitingPricing, approvedBillableValue, approvedCount, myActionCount, inProgressCount, withdrawnCount };
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
    if (filter === 'withdrawn_filter') return changeOrders.filter(co => co.status === 'withdrawn');
    return changeOrders;
  }, [changeOrders, filter, orgId]);

  // Float COs needing this org's action to the top
  const sortedCOs = useMemo(() => {
    const isAction = (co: typeof filteredCOs[number]) =>
      (co.status === 'submitted' && co.org_id === orgId) ||
      (co.status === 'closed_for_pricing' && (co.org_id === orgId || co.assigned_to_org_id === orgId)) ||
      (co.status === 'work_in_progress' && co.assigned_to_org_id === orgId);
    return [...filteredCOs].sort((a, b) => Number(isAction(b)) - Number(isAction(a)));
  }, [filteredCOs, orgId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const needsAction = (co: typeof changeOrders[number]) =>
    (co.status === 'submitted' && co.org_id === orgId) ||
    (co.status === 'closed_for_pricing' && (co.org_id === orgId || co.assigned_to_org_id === orgId)) ||
    (co.status === 'work_in_progress' && co.assigned_to_org_id === orgId);

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      {/* Page Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">{coLabel(dt, true)}</h2>
          <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {total === 0 ? `No ${coLabel(dt, true).toLowerCase()} yet` : `${total} total records`}
          </p>
        </div>

        {canCreateCO && (
          <Button
            onClick={openNewPicker}
            className="gap-1.5 shrink-0"
            aria-label={`New ${coLabel(dt, false)}`}
          >
            <Plus className="h-4 w-4" />
            New {coAbbrev(dt)}
          </Button>
        )}
      </div>

      {/* Money hero + metric tiles */}
      {total > 0 && <COMoneyBar changeOrders={changeOrders} abbrev={coAbbrev(dt)} />}

      {/* Filter pills */}
      <div className="pill-row pb-1">
        {([
          { key: 'all', label: 'All', count: total },
          { key: 'my_action', label: 'Action', count: stats.myActionCount },
          { key: 'in_progress', label: 'Active', count: stats.inProgressCount },
          { key: 'approved_filter', label: 'Approved', count: stats.approvedCount },
          ...(stats.withdrawnCount > 0 ? [{ key: 'withdrawn_filter' as FilterKey, label: 'Withdrawn', count: stats.withdrawnCount }] : []),
        ] as { key: FilterKey; label: string; count: number }[]).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-colors border whitespace-nowrap',
              filter === f.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:bg-accent',
            )}
          >
            {f.label}
            <span className="text-[11px] sm:text-xs tabular-nums opacity-70 ml-0.5">
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Ledger */}
      {total === 0 ? (
        <div className="co-light-shell flex flex-col items-center justify-center py-16 text-center gap-3 px-4">
          <p className="text-lg font-medium text-foreground">No {coLabel(dt, true).toLowerCase()} yet</p>
          <p className="text-sm text-muted-foreground max-w-sm">Create a {coLabel(dt).toLowerCase()} to track scope changes on this project.</p>
          {canCreateCO && (
            <Button onClick={openNewPicker} className="gap-1.5 mt-2">
              <Plus className="h-4 w-4" />
              New {coLabel(dt)}
            </Button>
          )}
        </div>
      ) : sortedCOs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border py-14 text-center">
          <p className="text-sm font-semibold text-foreground">Nothing in this view</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different filter above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Column headers — desktop only */}
          <div className="hidden md:grid md:grid-cols-12 md:gap-4 px-6 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <div className="col-span-5">Description &amp; reference</div>
            <div className="col-span-3">Approval trail</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-2 text-right">Age</div>
          </div>

          {sortedCOs.map(co => (
            <CORow
              key={co.id}
              co={co}
              onClick={handleCardClick}
              needsAction={needsAction(co)}
            />
          ))}
        </div>
      )}


      {/* Legacy wizard removed — now using Picker v3 full-page route */}

      
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, List, Loader2, Plus } from 'lucide-react';
import { useChangeOrders, type ChangeOrderWithMembers } from '@/hooks/useChangeOrders';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { COWizard } from './wizard/COWizard';
import { COBoard } from './COBoard';
import { COBoardCard } from './COBoardCard';
import { COSlideOver } from './COSlideOver';
import type { COStatus } from '@/types/changeOrder';
import { CO_STATUS_LABELS } from '@/types/changeOrder';

interface COListPageProps {
  projectId: string;
}

type ViewMode = 'board' | 'list';

type FilterKey = 'all' | 'my_action' | 'in_progress' | 'approved_filter';

export function COListPage({ projectId }: COListPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { user, userOrgRoles, currentRole } = useAuth();
  const { changeOrders, boardColumns, isLoading } = useChangeOrders(projectId);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [filter, setFilter] = useState<FilterKey>('all');

  // Slide-over: open CO from URL ?co=<id>
  const activeCOId = searchParams.get('co');

  const storageKey = `co_view_mode_v2_${user?.id ?? 'anon'}`;
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored === 'board' || stored === 'list') setViewMode(stored);
  }, [storageKey]);
  useEffect(() => {
    localStorage.setItem(storageKey, viewMode);
  }, [storageKey, viewMode]);

  // Auto-open CO if URL param present
  useEffect(() => {
    const coParam = searchParams.get('co');
    if (coParam && changeOrders.length > 0) {
      const exists = changeOrders.some(c => c.id === coParam);
      if (!exists) {
        setSearchParams({}, { replace: true });
      }
    }
  }, [changeOrders, searchParams, setSearchParams]);

  function handleCardClick(id: string) {
    setSearchParams({ co: id });
  }

  function handleClosePanel() {
    setSearchParams({}, { replace: true });
  }

  const orgId = userOrgRoles?.[0]?.organization_id ?? null;
  const total = changeOrders.length;

  // Stats
  const stats = useMemo(() => {
    let totalValue = 0;
    let pendingApproval = 0;
    let awaitingPricing = 0;
    let approvedBillable = 0;

    for (const co of changeOrders) {
      if (co.status === 'submitted' && co.org_id === orgId) pendingApproval++;
      if (co.status === 'closed_for_pricing') awaitingPricing++;
      if (co.status === 'approved') approvedBillable++;
    }

    return { totalValue, pendingApproval, awaitingPricing, approvedBillable };
  }, [changeOrders, orgId]);

  // Mobile filter
  const filteredCOs = useMemo(() => {
    if (filter === 'all') return changeOrders;
    if (filter === 'my_action') return changeOrders.filter(co =>
      (co.status === 'submitted' && co.org_id === orgId) ||
      (co.status === 'closed_for_pricing' && (co.assigned_to_org_id === orgId || co.org_id === orgId))
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

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      {/* Page Header */}
      <div className="co-light-shell p-4 md:p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Change Orders</h2>
            <p className="text-sm text-muted-foreground mt-1">{total === 0 ? 'No change orders yet' : `${total} total`}</p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* View toggle — hidden on mobile */}
            <div className="co-light-toggle hidden md:flex">
              <button
                type="button"
                className={cn('co-light-toggle-btn inline-flex items-center gap-1.5', viewMode === 'board' && 'co-light-toggle-btn--active')}
                onClick={() => setViewMode('board')}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Board
              </button>
              <button
                type="button"
                className={cn('co-light-toggle-btn inline-flex items-center gap-1.5', viewMode === 'list' && 'co-light-toggle-btn--active')}
                onClick={() => setViewMode('list')}
              >
                <List className="h-3.5 w-3.5" />
                List
              </button>
            </div>

            <Button onClick={() => setWizardOpen(true)} className="gap-2 flex-1 md:flex-none">
              <Plus className="h-4 w-4" />
              New CO
            </Button>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {([
            { key: 'all', label: `All COs`, count: total },
            { key: 'my_action', label: 'Needs my action', count: stats.pendingApproval },
            { key: 'in_progress', label: 'In progress', count: stats.awaitingPricing },
            { key: 'approved_filter', label: 'Approved', count: stats.approvedBillable },
          ] as { key: FilterKey; label: string; count: number }[]).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                filter === f.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:bg-accent',
              )}
            >
              {f.label}
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full',
                filter === f.key ? 'bg-primary-foreground/20' : 'bg-muted',
              )}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="co-light-kpi">
            <p className="co-light-kpi-label">Total COs</p>
            <p className="co-light-kpi-value">{total}</p>
          </div>
          <div className="co-light-kpi">
            <p className="co-light-kpi-label">Pending approval</p>
            <p className="co-light-kpi-value">{stats.pendingApproval}</p>
          </div>
          <div className="co-light-kpi">
            <p className="co-light-kpi-label">Awaiting pricing</p>
            <p className="co-light-kpi-value">{stats.awaitingPricing}</p>
          </div>
          <div className="co-light-kpi">
            <p className="co-light-kpi-label">Approved & billable</p>
            <p className="co-light-kpi-value">{stats.approvedBillable}</p>
          </div>
        </div>
      </div>

      {/* Board or List */}
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
        <>
          {/* Desktop: board or list */}
          {!isMobile && viewMode === 'board' ? (
            <COBoard
              columns={boardColumns}
              activeCOId={activeCOId}
              onCardClick={handleCardClick}
              onNewCO={() => setWizardOpen(true)}
            />
          ) : (
            /* Mobile always list, desktop list when toggled */
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {filteredCOs.map(co => (
                <COBoardCard
                  key={co.id}
                  co={co}
                  isActive={co.id === activeCOId}
                  onClick={handleCardClick}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Slide-over panel */}
      {activeCOId && (
        <COSlideOver
          coId={activeCOId}
          projectId={projectId}
          onClose={handleClosePanel}
        />
      )}

      <COWizard open={wizardOpen} onOpenChange={setWizardOpen} projectId={projectId} />
    </div>
  );
}

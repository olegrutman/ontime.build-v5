import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, GitMerge, LayoutGrid, List, Loader2, Plus } from 'lucide-react';
import { useChangeOrders, type ChangeOrderWithMembers } from '@/hooks/useChangeOrders';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { COWizard } from './wizard/COWizard';
import { CombineDrawer } from './CombineDrawer';
import type { COReasonCode, COStatus } from '@/types/changeOrder';
import { CO_REASON_LABELS, CO_STATUS_LABELS } from '@/types/changeOrder';

interface COListPageProps {
  projectId: string;
}

type COViewMode = 'card' | 'list';

const STATUS_ORDER: COStatus[] = [
  'draft',
  'shared',
  'combined',
  'submitted',
  'approved',
  'rejected',
  'contracted',
];

const STATUS_BADGE_STYLES: Record<COStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  shared: 'bg-accent text-accent-foreground border-border',
  combined: 'bg-secondary/15 text-secondary border-secondary/25',
  submitted: 'bg-primary/15 text-primary border-primary/25',
  approved: 'bg-primary text-primary-foreground border-primary',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  contracted: 'bg-secondary text-secondary-foreground border-secondary',
};
...
  const isCombinedParent = !!co.memberPreviews && co.memberPreviews.length > 0;
  const title = co.title ?? co.co_number ?? (isCombinedParent ? 'Combined CO' : 'Untitled CO');
  const age = co.created_at
    ? formatDistanceToNow(new Date(co.created_at), { addSuffix: true })
    : 'just now';
...
  const isCombinedParent = !!co.memberPreviews && co.memberPreviews.length > 0;
  const title = co.title ?? co.co_number ?? (isCombinedParent ? 'Combined CO' : 'Untitled CO');
  const age = co.created_at
    ? formatDistanceToNow(new Date(co.created_at), { addSuffix: true })
    : 'just now';
...
  const statusGroups = useMemo(
    () => STATUS_ORDER.map(status => ({ status, items: mine[status] })).filter(group => group.items.length > 0),
    [mine],
  );

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function handleOpenCO(id: string) {
    navigate(`/projects/${projectId}/change-orders/${id}`);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-5 pb-20 md:pb-0">
      <div className="co-light-shell p-4 md:p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Change Orders</h2>
            <p className="text-sm text-muted-foreground mt-1">{total === 0 ? 'No change orders yet' : `${total} total`}</p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="co-light-toggle">
              <button
                type="button"
                className={cn('co-light-toggle-btn inline-flex items-center gap-1.5', viewMode === 'card' && 'co-light-toggle-btn--active')}
                onClick={() => setViewMode('card')}
                aria-pressed={viewMode === 'card'}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Card
              </button>
              <button
                type="button"
                className={cn('co-light-toggle-btn inline-flex items-center gap-1.5', viewMode === 'list' && 'co-light-toggle-btn--active')}
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
              >
                <List className="h-3.5 w-3.5" />
                List
              </button>
            </div>

            {canCombine && (
              <Button
                variant="outline"
                size={isMobile ? 'default' : 'sm'}
                onClick={() => setCombineOpen(true)}
                className="gap-1.5 flex-1 md:flex-none"
              >
                <GitMerge className="h-4 w-4" />
                Combine ({selectedIds.size})
              </Button>
            )}
            <Button onClick={() => setWizardOpen(true)} className="gap-2 flex-1 md:flex-none">
              <Plus className="h-4 w-4" />
              New CO
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="co-light-kpi">
            <p className="co-light-kpi-label">Draft + Shared</p>
            <p className="co-light-kpi-value">{mine.draft.length + mine.shared.length}</p>
          </div>
          <div className="co-light-kpi">
            <p className="co-light-kpi-label">Submitted</p>
            <p className="co-light-kpi-value">{mine.submitted.length}</p>
          </div>
          <div className="co-light-kpi">
            <p className="co-light-kpi-label">Approved</p>
            <p className="co-light-kpi-value">{mine.approved.length + mine.contracted.length}</p>
          </div>
          <div className="co-light-kpi">
            <p className="co-light-kpi-label">Shared With Me</p>
            <p className="co-light-kpi-value">{sharedWithMe.length}</p>
          </div>
        </div>
      </div>

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
        <div className="space-y-4">
          {totalMine > 0 && (
            <section className="co-light-shell p-3 md:p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">My change orders</span>
                {selectableCOs.length > 0 && selectedIds.size === 0 && (
                  <span className="text-xs text-muted-foreground">Select drafts/shared to combine</span>
                )}
              </div>

              <div className="space-y-2">
                {statusGroups.map(group => (
                  <div key={group.status} className="space-y-2">
                    <SectionHeader label={CO_STATUS_LABELS[group.status]} count={group.items.length} />
                    {viewMode === 'card' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                        {group.items.map(co => (
                          <COCard
                            key={co.id}
                            co={co}
                            selectable={group.status === 'draft' || group.status === 'shared'}
                            selected={selectedIds.has(co.id)}
                            onSelect={toggleSelect}
                            onClick={handleOpenCO}
                          />
                        ))}
                      </div>
                    ) : (
                      group.items.map(co => (
                        <CORow
                          key={co.id}
                          co={co}
                          selectable={group.status === 'draft' || group.status === 'shared'}
                          selected={selectedIds.has(co.id)}
                          onSelect={toggleSelect}
                          onClick={handleOpenCO}
                          mobile={isMobile}
                        />
                      ))
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {totalSharedWithMe > 0 && (
            <section className="co-light-shell p-3 md:p-4">
              <div className="pb-2">
                <span className="text-sm font-semibold text-foreground">Shared with me</span>
              </div>

              {viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {sharedWithMe.map(co => (
                    <COCard
                      key={co.id}
                      co={co}
                      selectable={false}
                      selected={false}
                      onSelect={() => {}}
                      onClick={handleOpenCO}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {sharedWithMe.map(co => (
                    <CORow
                      key={co.id}
                      co={co}
                      selectable={false}
                      selected={false}
                      onSelect={() => {}}
                      onClick={handleOpenCO}
                      mobile={isMobile}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      <COWizard open={wizardOpen} onOpenChange={setWizardOpen} projectId={projectId} />

      <CombineDrawer
        open={combineOpen}
        onOpenChange={setCombineOpen}
        selectedIds={Array.from(selectedIds)}
        projectId={projectId}
        onCombined={() => {
          setSelectedIds(new Set());
          setCombineOpen(false);
        }}
      />
    </div>
  );
}

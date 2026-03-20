import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, LayoutGrid, List, Loader2, Plus } from 'lucide-react';
import { useChangeOrders, type ChangeOrderWithMembers } from '@/hooks/useChangeOrders';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { COWizard } from './wizard/COWizard';
import type { COReasonCode, COStatus } from '@/types/changeOrder';
import { CO_REASON_LABELS, CO_STATUS_LABELS } from '@/types/changeOrder';

interface COListPageProps {
  projectId: string;
}

type COViewMode = 'card' | 'list';

const STATUS_ORDER: COStatus[] = [
  'draft',
  'shared',
  'work_in_progress',
  'closed_for_pricing',
  'submitted',
  'approved',
  'rejected',
  'contracted',
];

const STATUS_BADGE_STYLES: Record<COStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  shared: 'bg-accent text-accent-foreground border-border',
  work_in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  closed_for_pricing: 'bg-amber-100 text-amber-700 border-amber-200',
  submitted: 'bg-primary/15 text-primary border-primary/25',
  approved: 'bg-primary text-primary-foreground border-primary',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  contracted: 'bg-secondary text-secondary-foreground border-secondary',
};

const PRICING_BADGE: Record<string, string> = {
  fixed: 'Fixed',
  tm: 'T&M',
  nte: 'NTE',
};

function ReasonChip({ reason }: { reason: COReasonCode }) {
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
      {CO_REASON_LABELS[reason]}
    </span>
  );
}

function CORow({
  co,
  onClick,
  mobile,
}: {
  co: ChangeOrderWithMembers;
  onClick: (id: string) => void;
  mobile: boolean;
}) {
  const title = co.co_number ? `${co.co_number} · ${co.created_at ? new Date(co.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}` : (co.title ?? 'Untitled CO');
  const age = co.created_at
    ? formatDistanceToNow(new Date(co.created_at), { addSuffix: true })
    : 'just now';

  return (
    <div
      className={cn(
        'co-light-shell cursor-pointer transition-all hover:border-primary/40 hover:shadow-md',
        mobile ? 'px-3 py-3' : 'px-4 py-3',
      )}
      onClick={() => onClick(co.id)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground truncate">{title}</span>
            <Badge variant="outline" className={cn('text-[11px] shrink-0', STATUS_BADGE_STYLES[co.status as COStatus])}>
              {CO_STATUS_LABELS[co.status as COStatus]}
            </Badge>
            {co.pricing_type && (
              <Badge variant="secondary" className="text-[11px] shrink-0">
                {PRICING_BADGE[co.pricing_type] ?? co.pricing_type}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-muted-foreground">
            <div className="flex items-center gap-2 flex-wrap">
              {co.reason && <ReasonChip reason={co.reason as COReasonCode} />}
              {co.location_tag && (() => {
                const locs = co.location_tag.split(' | ');
                return <span className="truncate max-w-[180px]">{locs[0]}{locs.length > 1 ? ` +${locs.length - 1} more` : ''}</span>;
              })()}
            </div>
            <span>{age}</span>
          </div>
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      </div>
    </div>
  );
}

function COCard({
  co,
  onClick,
}: {
  co: ChangeOrderWithMembers;
  onClick: (id: string) => void;
}) {
  const title = co.title ?? co.co_number ?? 'Untitled CO';
  const age = co.created_at
    ? formatDistanceToNow(new Date(co.created_at), { addSuffix: true })
    : 'just now';

  return (
    <article
      className="co-light-shell cursor-pointer transition-all hover:border-primary/40 hover:shadow-md p-4 space-y-3"
      onClick={() => onClick(co.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          {co.co_number && <p className="text-[11px] font-medium text-muted-foreground">{co.co_number}</p>}
          <h3 className="text-sm font-semibold text-foreground line-clamp-2">{title}</h3>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={cn('text-[11px]', STATUS_BADGE_STYLES[co.status as COStatus])}>
          {CO_STATUS_LABELS[co.status as COStatus]}
        </Badge>
        {co.pricing_type && (
          <Badge variant="secondary" className="text-[11px]">
            {PRICING_BADGE[co.pricing_type] ?? co.pricing_type}
          </Badge>
        )}
        {co.reason && <ReasonChip reason={co.reason as COReasonCode} />}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate max-w-[60%]">{co.location_tag ? (() => {
          const locs = co.location_tag.split(' | ');
          return locs[0] + (locs.length > 1 ? ` +${locs.length - 1} more` : '');
        })() : 'No location'}</span>
        <span>{age}</span>
      </div>
    </article>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-2 pt-3 pb-1">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </div>
  );
}

export function COListPage({ projectId }: COListPageProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { grouped, isLoading } = useChangeOrders(projectId);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [viewMode, setViewMode] = useState<COViewMode>('card');

  const storageKey = `co_view_mode_${user?.id ?? 'anon'}`;

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored === 'card' || stored === 'list') setViewMode(stored);
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, viewMode);
  }, [storageKey, viewMode]);

  const mine = grouped.mine;
  const allMine: ChangeOrderWithMembers[] = [
    ...mine.draft,
    ...mine.shared,
    ...mine.work_in_progress,
    ...mine.closed_for_pricing,
    ...mine.submitted,
    ...mine.approved,
    ...mine.rejected,
    ...mine.contracted,
  ];
  const sharedWithMe = grouped.sharedWithMe;

  const totalMine = allMine.length;
  const totalSharedWithMe = sharedWithMe.length;
  const total = totalMine + totalSharedWithMe;

  const statusGroups = useMemo(
    () => STATUS_ORDER.map(status => ({ status, items: mine[status] })).filter(group => group.items.length > 0),
    [mine],
  );

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
            <p className="co-light-kpi-label">In Progress</p>
            <p className="co-light-kpi-value">{mine.work_in_progress.length + mine.closed_for_pricing.length + mine.submitted.length}</p>
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
                            onClick={handleOpenCO}
                          />
                        ))}
                      </div>
                    ) : (
                      group.items.map(co => (
                        <CORow
                          key={co.id}
                          co={co}
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
    </div>
  );
}

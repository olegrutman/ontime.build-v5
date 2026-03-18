import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, GitMerge, Loader2, Plus } from 'lucide-react';
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

const STATUS_BADGE_STYLES: Record<COStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  shared: 'bg-accent text-accent-foreground border-border',
  combined: 'bg-secondary/15 text-secondary border-secondary/25',
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
  selectable,
  selected,
  onSelect,
  onClick,
  mobile,
}: {
  co: ChangeOrderWithMembers;
  selectable: boolean;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onClick: (id: string) => void;
  mobile: boolean;
}) {
  const isCombinedParent = !!co.memberPreviews && co.memberPreviews.length > 0;
  const title = co.title ?? co.co_number ?? (isCombinedParent ? 'Combined CO' : 'Untitled CO');
  const age = formatDistanceToNow(new Date(co.created_at), { addSuffix: true });

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card cursor-pointer transition-colors hover:bg-accent/40',
        mobile ? 'px-3 py-3' : 'px-4 py-3',
      )}
      onClick={() => onClick(co.id)}
    >
      <div className="flex items-start gap-3">
        {selectable && (
          <div onClick={e => e.stopPropagation()} className="pt-0.5">
            <Checkbox checked={selected} onCheckedChange={v => onSelect(co.id, !!v)} />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {isCombinedParent && <GitMerge className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            <span className="font-medium text-foreground truncate">{title}</span>
            <Badge variant="outline" className={cn('text-[11px] shrink-0', STATUS_BADGE_STYLES[co.status as COStatus])}>
              {CO_STATUS_LABELS[co.status as COStatus]}
            </Badge>
            {co.pricing_type && (
              <Badge variant="secondary" className="text-[11px] shrink-0">
                {PRICING_BADGE[co.pricing_type] ?? co.pricing_type}
              </Badge>
            )}
            {isCombinedParent && (
              <Badge variant="secondary" className="text-[11px] shrink-0">
                {co.memberPreviews!.length} scopes
              </Badge>
            )}
          </div>

          {isCombinedParent && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {co.memberPreviews!.map((m, i) => (
                <span key={m.id} className="text-xs text-muted-foreground">
                  {i > 0 && <span className="mr-1.5">+</span>}
                  {m.title ?? 'Untitled'}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-muted-foreground">
            <div className="flex items-center gap-2 flex-wrap">
              {co.reason && <ReasonChip reason={co.reason as COReasonCode} />}
              {co.location_tag && <span className="truncate max-w-[180px]">{co.location_tag}</span>}
            </div>
            <span>{age}</span>
          </div>
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      </div>
    </div>
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
  const { userOrgRoles } = useAuth();
  const { grouped, isLoading } = useChangeOrders(projectId);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [combineOpen, setCombineOpen] = useState(false);

  const mine = grouped.mine;
  const allMine: ChangeOrderWithMembers[] = [
    ...mine.draft,
    ...mine.shared,
    ...mine.combined,
    ...mine.submitted,
    ...mine.approved,
    ...mine.rejected,
    ...mine.contracted,
  ];
  const sharedWithMe = grouped.sharedWithMe;

  const selectableCOs = [...mine.draft, ...mine.shared];
  const canCombine = selectedIds.size >= 2;

  const totalMine = allMine.length;
  const totalSharedWithMe = sharedWithMe.length;
  const total = totalMine + totalSharedWithMe;

  const statusOrder: COStatus[] = ['draft', 'shared', 'combined', 'submitted', 'approved', 'rejected', 'contracted'];

  const statusGroups = useMemo(
    () => statusOrder.map(status => ({ status, items: mine[status] })).filter(group => group.items.length > 0),
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
      <div className="rounded-xl border border-border bg-card p-4 md:p-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Change Orders</h2>
          <p className="text-sm text-muted-foreground mt-1">{total === 0 ? 'No change orders yet' : `${total} total`}</p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
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

      {total === 0 ? (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 text-center gap-3 px-4">
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
            <section className="rounded-xl border border-border bg-card p-3 md:p-4">
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
                    {group.items.map(co => (
                      <CORow
                        key={co.id}
                        co={co}
                        selectable={group.status === 'draft' || group.status === 'shared'}
                        selected={selectedIds.has(co.id)}
                        onSelect={toggleSelect}
                        onClick={handleOpenCO}
                        mobile={isMobile}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </section>
          )}

          {totalSharedWithMe > 0 && (
            <section className="rounded-xl border border-border bg-card p-3 md:p-4">
              <div className="pb-2">
                <span className="text-sm font-semibold text-foreground">Shared with me</span>
              </div>
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

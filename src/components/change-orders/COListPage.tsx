import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChangeOrders, type ChangeOrderWithMembers } from '@/hooks/useChangeOrders';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, ChevronRight, GitMerge, Loader2 } from 'lucide-react';
import { COWizard } from './wizard/COWizard';
import { CombineDrawer } from './CombineDrawer';
import type { COStatus, COReasonCode } from '@/types/changeOrder';
import { CO_STATUS_LABELS, CO_REASON_LABELS, CO_REASON_COLORS } from '@/types/changeOrder';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface COListPageProps {
  projectId: string;
}

const STATUS_BADGE_STYLES: Record<COStatus, string> = {
  draft:      'bg-gray-100 text-gray-700 border-gray-200',
  shared:     'bg-blue-100 text-blue-700 border-blue-200',
  combined:   'bg-purple-100 text-purple-700 border-purple-200',
  submitted:  'bg-amber-100 text-amber-700 border-amber-200',
  approved:   'bg-green-100 text-green-700 border-green-200',
  rejected:   'bg-red-100 text-red-700 border-red-200',
  contracted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const PRICING_BADGE: Record<string, string> = {
  fixed: 'Fixed',
  tm:    'T&M',
  nte:   'NTE',
};

function ReasonChip({ reason }: { reason: COReasonCode }) {
  const colors = CO_REASON_COLORS[reason];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
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
}: {
  co:         ChangeOrderWithMembers;
  selectable: boolean;
  selected:   boolean;
  onSelect:   (id: string, checked: boolean) => void;
  onClick:    (id: string) => void;
}) {
  const isCombinedParent = !!co.memberPreviews && co.memberPreviews.length > 0;
  const title = co.title ?? co.co_number ?? (isCombinedParent ? 'Combined CO' : 'Untitled CO');
  const age   = formatDistanceToNow(new Date(co.created_at), { addSuffix: true });

  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => onClick(co.id)}
    >
      {selectable && (
        <div onClick={e => e.stopPropagation()}>
          <Checkbox
            checked={selected}
            onCheckedChange={v => onSelect(co.id, !!v)}
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {isCombinedParent && <GitMerge className="h-3.5 w-3.5 text-purple-600 shrink-0" />}
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
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {co.memberPreviews!.map((m, i) => (
              <span key={m.id} className="text-xs text-muted-foreground">
                {i > 0 && <span className="mr-1.5">+</span>}
                {m.title ?? 'Untitled'}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
          {co.reason && <ReasonChip reason={co.reason as COReasonCode} />}
          {co.location_tag && (
            <span className="truncate max-w-[120px]">
              {co.location_tag}
            </span>
          )}
          <span>{age}</span>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </div>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-2 pt-4 pb-1">
      <span className="text-sm font-semibold text-foreground">
        {label}
      </span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </div>
  );
}

export function COListPage({ projectId }: COListPageProps) {
  const navigate               = useNavigate();
  const { userOrgRoles }       = useAuth();
  const orgId                  = userOrgRoles?.[0]?.organization_id ?? null;
  const { grouped, isLoading, combineCOs } = useChangeOrders(projectId);

  const [wizardOpen,   setWizardOpen]   = useState(false);
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [combineOpen,  setCombineOpen]  = useState(false);

  const mine = grouped.mine;
  const allMine: ChangeOrder[] = [
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
  const canCombine    = selectedIds.size >= 2;

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

  const totalMine         = allMine.length;
  const totalSharedWithMe = sharedWithMe.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Change Orders</h2>
          <p className="text-sm text-muted-foreground">
            {totalMine + totalSharedWithMe === 0
              ? 'No change orders yet'
              : `${totalMine + totalSharedWithMe} total`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canCombine && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCombineOpen(true)}
              className="gap-1.5"
            >
              <GitMerge className="h-4 w-4" />
              Combine ({selectedIds.size})
            </Button>
          )}
          <Button onClick={() => setWizardOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New CO
          </Button>
        </div>
      </div>

      {totalMine === 0 && totalSharedWithMe === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <p className="text-lg font-medium text-foreground">No change orders yet</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Create a change order to track scope changes on this project
          </p>
          <Button onClick={() => setWizardOpen(true)} className="gap-1.5 mt-2">
            <Plus className="h-4 w-4" />
            New Change Order
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {totalMine > 0 && (
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">My change orders</span>
                {selectableCOs.length > 0 && selectedIds.size === 0 && (
                  <span className="text-xs text-muted-foreground">
                    Select to combine
                  </span>
                )}
              </div>

              {(['draft','shared','combined','submitted','approved','rejected','contracted'] as COStatus[]).map(status => {
                const cos = mine[status];
                if (cos.length === 0) return null;
                return (
                  <div key={status} className="space-y-1.5">
                    <SectionHeader label={CO_STATUS_LABELS[status]} count={cos.length} />
                    {cos.map(co => (
                      <CORow
                        key={co.id}
                        co={co}
                        selectable={status === 'draft' || status === 'shared'}
                        selected={selectedIds.has(co.id)}
                        onSelect={toggleSelect}
                        onClick={handleOpenCO}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {totalSharedWithMe > 0 && (
            <div>
              <div className="pt-4 pb-1">
                <span className="text-sm font-semibold text-foreground">Shared with me</span>
              </div>
              {sharedWithMe.map(co => (
                <CORow
                  key={co.id}
                  co={co}
                  selectable={false}
                  selected={false}
                  onSelect={() => {}}
                  onClick={handleOpenCO}
                />
              ))}
            </div>
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

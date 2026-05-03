import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Package, Zap, ChevronRight, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useChangeOrders } from '@/hooks/useChangeOrders';
import { CO_STATUS_LABELS } from '@/types/changeOrder';
import type { COReasonCode, COStatus } from '@/types/changeOrder';

interface FCHomeScreenProps {
  projectId: string;
}

const HERO_ACTIONS = [
  {
    key: 'something_happened',
    label: 'Something happened',
    icon: Zap,
    description: 'Log extra work',
    primary: true,
    reason: null as COReasonCode | null,
  },
  {
    key: 'log_hours',
    label: 'Log my hours',
    icon: Clock,
    description: 'Add hours to a CO',
    primary: false,
    reason: null,
  },
  {
    key: 'need_material',
    label: 'Need material',
    icon: Package,
    description: 'Request materials',
    primary: false,
    reason: null,
  },
  {
    key: 'saw_damage',
    label: 'Saw damage',
    icon: AlertTriangle,
    description: 'Report damage',
    primary: false,
    reason: 'damaged_by_others' as COReasonCode,
  },
];

export function FCHomeScreen({ projectId }: FCHomeScreenProps) {
  const navigate = useNavigate();
  const { userOrgRoles } = useAuth();
  const { changeOrders } = useChangeOrders(projectId);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [preSelectedReason, setPreSelectedReason] = useState<COReasonCode | undefined>();

  const orgId = userOrgRoles?.[0]?.organization_id ?? '';

  // COs needing FC input: where FC is collaborator and status requires action
  const actionableCOs = changeOrders.filter(co => {
    if (co.collaboratorOrgId !== orgId) return false;
    if (co.collaboratorStatus !== 'active') return false;
    return ['draft', 'closed_for_pricing', 'work_in_progress', 'shared'].includes(co.status);
  });

  // COs created by the FC org (also catch historical misassigned ones)
  const myCOs = changeOrders.filter(co =>
    co.org_id === orgId ||
    (co.created_by_role === 'FC' && co.collaboratorOrgId === orgId)
  );

  // Active WOs where FC is collaborator but not needing immediate input
  const actionableIds = new Set(actionableCOs.map(co => co.id));
  const activeCOs = changeOrders.filter(co => {
    if (co.collaboratorOrgId !== orgId) return false;
    if (co.collaboratorStatus !== 'active' && co.collaboratorStatus !== 'completed') return false;
    if (actionableIds.has(co.id)) return false;
    return ['submitted', 'work_in_progress', 'shared', 'closed_for_pricing', 'approved', 'contracted'].includes(co.status);
  });

  // Approved/billable COs where FC was a collaborator
  const billableCOs = changeOrders.filter(co => {
    if (co.collaboratorOrgId !== orgId) return false;
    if (co.collaboratorStatus !== 'completed') return false;
    return ['approved', 'contracted'].includes(co.status);
  });

  function handleHeroTap(key: string, reason: COReasonCode | null) {
    if (key === 'something_happened' || key === 'saw_damage') {
      setPreSelectedReason(reason ?? undefined);
      setWizardOpen(true);
    } else if (key === 'log_hours' || key === 'need_material') {
      // Navigate to CO list — these are secondary flows
      navigate(`/project/${projectId}/change-orders`);
    }
  }

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      {/* Hero action block */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'hsl(var(--navy))' }}>
        <div className="px-4 pt-5 pb-2">
          <h2
            className="text-lg font-bold uppercase tracking-wide"
            style={{ color: 'hsl(var(--amber))' }}
          >
            What do you need?
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'hsl(220 27% 80%)' }}>
            Tap to get started
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 px-4 pb-4 pt-2">
          {HERO_ACTIONS.map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                type="button"
                onClick={() => handleHeroTap(action.key, action.reason)}
                className={cn(
                  'flex flex-col items-start gap-2 p-4 rounded-xl transition-all min-h-[88px] text-left',
                  action.primary
                    ? 'bg-primary text-primary-foreground shadow-amber'
                    : 'border border-white/15 text-white/90 hover:bg-white/10',
                )}
              >
                <Icon className={cn('h-5 w-5', action.primary ? 'text-primary-foreground' : 'text-primary')} />
                <div>
                  <p className="text-sm font-semibold leading-tight">{action.label}</p>
                  <p className={cn('text-[11px] leading-tight mt-0.5', action.primary ? 'text-primary-foreground/80' : 'text-white/60')}>
                    {action.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Open COs requiring input */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground px-1">
          Open COs requiring your input
        </h3>

        {actionableCOs.length === 0 ? (
          <div className="co-light-shell flex items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No COs need your attention right now</p>
          </div>
        ) : (
          <div className="space-y-2">
            {actionableCOs.map(co => (
              <button
                key={co.id}
                type="button"
                onClick={() => navigate(`/project/${projectId}/change-orders/${co.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-left min-h-[56px]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{co.co_number ?? '—'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {co.status === 'closed_for_pricing' ? 'Log hours' : 'TC is waiting'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground mt-0.5 truncate">
                    {co.title ?? 'Change order'}
                  </p>
                  {co.location_tag && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate">{co.location_tag}</span>
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Work Orders */}
      {activeCOs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground px-1">
            Active Work Orders
          </h3>
          <div className="space-y-2">
            {activeCOs.map(co => (
              <button
                key={co.id}
                type="button"
                onClick={() => navigate(`/project/${projectId}/change-orders/${co.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-left min-h-[56px]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{co.co_number ?? '—'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                      {CO_STATUS_LABELS[co.status as COStatus] ?? co.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground mt-0.5 truncate">
                    {co.title ?? 'Change order'}
                  </p>
                  {co.location_tag && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate">{co.location_tag}</span>
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* My Change Orders */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground px-1">
          My Change Orders
        </h3>

        {myCOs.length === 0 ? (
          <div className="co-light-shell flex items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No change orders created yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {myCOs.map(co => (
              <button
                key={co.id}
                type="button"
                onClick={() => navigate(`/project/${projectId}/change-orders/${co.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-left min-h-[56px]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{co.co_number ?? '—'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                      {CO_STATUS_LABELS[co.status as COStatus] ?? co.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground mt-0.5 truncate">
                    {co.title ?? 'Change order'}
                  </p>
                  {co.location_tag && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate">{co.location_tag}</span>
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Approved / Billable COs */}
      {billableCOs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground px-1">
            Approved / Billable
          </h3>
          <div className="space-y-2">
            {billableCOs.map(co => (
              <button
                key={co.id}
                type="button"
                onClick={() => navigate(`/project/${projectId}/change-orders/${co.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-left min-h-[56px]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{co.co_number ?? '—'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {CO_STATUS_LABELS[co.status as COStatus] ?? co.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground mt-0.5 truncate">
                    {co.title ?? 'Change order'}
                  </p>
                  {co.location_tag && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate">{co.location_tag}</span>
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      <COWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        projectId={projectId}
        preSelectedReason={preSelectedReason}
      />
    </div>
  );
}

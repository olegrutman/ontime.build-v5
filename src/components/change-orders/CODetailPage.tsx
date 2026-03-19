import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, ChevronDown, GitMerge, MapPin } from 'lucide-react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useDefaultSidebarOpen } from '@/hooks/use-sidebar-default';
import { useChangeOrderDetail } from '@/hooks/useChangeOrderDetail';
import { useCORealtime } from '@/hooks/useCORealtime';
import { useProjectFCOrgs } from '@/hooks/useProjectFCOrgs';
import { COLineItemRow } from './COLineItemRow';
import { COMaterialsPanel } from './COMaterialsPanel';
import { COEquipmentPanel } from './COEquipmentPanel';
import { COStatusActions } from './COStatusActions';
import { CONTEPanel } from './CONTEPanel';
import { COActivityFeed } from './COActivityFeed';
import { FCInputRequestCard } from './FCInputRequestCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CO_REASON_LABELS, CO_STATUS_LABELS } from '@/types/changeOrder';
import type { COCreatedByRole, COFCOrgOption, COReasonCode, COStatus, ChangeOrder } from '@/types/changeOrder';

const STATUS_BADGE: Record<COStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  shared: 'bg-accent text-accent-foreground border-border',
  combined: 'bg-secondary/15 text-secondary border-secondary/25',
  submitted: 'bg-primary/15 text-primary border-primary/25',
  approved: 'bg-primary text-primary-foreground border-primary',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  contracted: 'bg-secondary text-secondary-foreground border-secondary',
};

const PRICING_LABEL: Record<string, string> = {
  fixed: 'Fixed price',
  tm: 'Time & material',
  nte: 'Not to exceed',
};

const VALID_PRICING = ['fixed', 'tm', 'nte'] as const;
type ValidPricing = typeof VALID_PRICING[number];

function fmtCurrency(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function CODetailPage() {
  const { projectId, coId } = useParams<{ projectId: string; coId: string }>();
  const navigate = useNavigate();
  const defaultOpen = useDefaultSidebarOpen();
  const { currentRole, user, userOrgRoles } = useAuth();

  const {
    co,
    memberCOs,
    collaborators,
    lineItems,
    laborEntries,
    materials,
    equipment,
    nteLog,
    activity,
    financials,
    isLoading,
    requestFCInput,
    completeFCInput,
    requestNTEIncrease,
    approveNTEIncrease,
    rejectNTEIncrease,
  } = useChangeOrderDetail(coId ?? null);

  useCORealtime(coId ?? null);

  const activeMembership =
    userOrgRoles.find(({ organization_id }) => organization_id === co?.assigned_to_org_id) ??
    userOrgRoles.find(({ organization_id }) => organization_id === co?.org_id) ??
    userOrgRoles[0];

  const activeRole = activeMembership?.role ?? currentRole;
  const activeOrgType = activeMembership?.organization?.type;

  const isFC = activeOrgType === 'FC' || activeRole === 'FC_PM';
  const isGC = activeOrgType === 'GC' || activeRole === 'GC_PM';
  const isTC = !isGC && !isFC && (activeOrgType === 'TC' || activeRole === 'TC_PM' || activeRole === 'FS');
  const role: COCreatedByRole = isGC ? 'GC' : isTC ? 'TC' : 'FC';
  const myOrgId = activeMembership?.organization_id ?? co?.assigned_to_org_id ?? co?.org_id ?? '';

  const queryClient = useQueryClient();
  const [fcActionPending, setFCActionPending] = useState(false);
  const { data: projectFCOrgs = [] } = useProjectFCOrgs(projectId ?? null);
  function refreshDetail() {
    queryClient.invalidateQueries({ queryKey: ['co-detail', coId] });
  }

  const collaboratorOrgIds = new Set(collaborators.map(collaborator => collaborator.organization_id));

  const isActiveStatus =
    co?.status === 'draft' ||
    co?.status === 'shared' ||
    co?.status === 'combined' ||
    co?.status === 'submitted';

  const isRunningPricing =
    co?.pricing_type === 'tm' ||
    co?.pricing_type === 'nte';

  const currentCollaborator = collaborators.find(collaborator => collaborator.status === 'active') ?? null;
  const isCollaboratorOrg = collaborators.some(
    collaborator => collaborator.organization_id === myOrgId && collaborator.status === 'active'
  );
  const canRequestFCInput = !!co && isTC && co.assigned_to_org_id === myOrgId && (co.status === 'shared' || co.status === 'rejected' || co.status === 'combined');
  const canCompleteFCInput = !!co && isFC && isCollaboratorOrg;
  const canEdit = (isActiveStatus || (isRunningPricing && co?.status === 'submitted')) && (isTC || !currentCollaborator || isCollaboratorOrg);

  const nteUsedPercent = financials.nteUsedPercent ?? 0;
  const showNTEWarning = co?.pricing_type === 'nte' && !!co?.nte_cap && nteUsedPercent >= 80;

  const scopeSections = useMemo(() => {
    const isCombinedParent = memberCOs.length > 0;
    const sections: { memberCO: ChangeOrder | null; items: typeof lineItems }[] = [];

    if (isCombinedParent) {
      for (const mco of memberCOs) {
        const items = lineItems.filter(li => li.co_id === mco.id);
        sections.push({ memberCO: mco, items });
      }
      return sections;
    }

    return [{ memberCO: null, items: lineItems }];
  }, [memberCOs, lineItems]);

  if (isLoading) {
    return (
      <SidebarProvider defaultOpen={defaultOpen}>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset>
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-72" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </SidebarInset>
          <BottomNav />
        </div>
      </SidebarProvider>
    );
  }

  if (!co) {
    return (
      <SidebarProvider defaultOpen={defaultOpen}>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <p className="text-lg font-medium text-foreground">Change order not found</p>
              <Button variant="outline" onClick={() => navigate(-1)}>
                Go back
              </Button>
            </div>
          </SidebarInset>
          <BottomNav />
        </div>
      </SidebarProvider>
    );
  }

  const isCombinedParent = memberCOs.length > 0;
  const displayTitle = co.title ?? co.co_number ?? (isCombinedParent ? 'Combined change order' : 'Change order');
  const pricingType: ValidPricing = VALID_PRICING.includes(co.pricing_type as ValidPricing)
    ? (co.pricing_type as ValidPricing)
    : 'fixed';
  const fcOrgOptions: COFCOrgOption[] = projectFCOrgs.filter(
    option => !collaboratorOrgIds.has(option.id) || option.id === currentCollaborator?.organization_id
  );

  async function handleRequestFCInput(orgId: string) {
    try {
      setFCActionPending(true);
      await requestFCInput.mutateAsync(orgId);
      refreshDetail();
    } finally {
      setFCActionPending(false);
    }
  }

  async function handleCompleteFCInput() {
    try {
      setFCActionPending(true);
      await completeFCInput.mutateAsync();
      refreshDetail();
    } finally {
      setFCActionPending(false);
    }
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset>
          <div className="pb-20 md:pb-6">
            <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
              <div className="px-4 md:px-6 py-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/project/${projectId}?tab=change-orders`)}
                      className="shrink-0"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isCombinedParent && <GitMerge className="h-4 w-4 text-muted-foreground" />}
                        <h1 className="text-lg md:text-xl font-semibold truncate">{displayTitle}</h1>
                        <Badge variant="outline" className={cn('text-[11px]', STATUS_BADGE[co.status as COStatus])}>
                          {CO_STATUS_LABELS[co.status as COStatus]}
                        </Badge>
                        <Badge variant="secondary" className="text-[11px]">
                          {PRICING_LABEL[co.pricing_type] ?? co.pricing_type}
                        </Badge>
                      </div>

                      <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                        {co.co_number && <span>{co.co_number}</span>}
                        {co.location_tag && co.location_tag.split(' | ').map((loc, i) => (
                          <span key={i} className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {loc}
                          </span>
                        ))}
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {co.created_at ? format(new Date(co.created_at), 'MMM d, yyyy') : '—'}
                        </span>
                        <span>{role} view</span>
                      </div>
                    </div>
                  </div>

                  {showNTEWarning && (
                    <Badge variant="outline" className="shrink-0 border-primary/40 bg-primary/10 text-primary">
                      NTE {nteUsedPercent.toFixed(0)}% used
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
                  <div className="co-light-kpi">
                    <p className="co-light-kpi-label">{isTC ? 'TC labor' : 'Labor'}</p>
                    <p className="co-light-kpi-value">{fmtCurrency(financials.laborTotal)}</p>
                  </div>
                  {isTC && financials.fcLaborTotal > 0 && (
                    <div className="co-light-kpi">
                      <p className="co-light-kpi-label">FC cost to TC</p>
                      <p className="co-light-kpi-value">{fmtCurrency(financials.fcLaborTotal)}</p>
                    </div>
                  )}
                  {co.materials_needed && (
                    <div className="co-light-kpi">
                      <p className="co-light-kpi-label">Materials</p>
                      <p className="co-light-kpi-value">{fmtCurrency(financials.materialsTotal)}</p>
                    </div>
                  )}
                  {co.equipment_needed && (
                    <div className="co-light-kpi">
                      <p className="co-light-kpi-label">Equipment</p>
                      <p className="co-light-kpi-value">{fmtCurrency(financials.equipmentTotal)}</p>
                    </div>
                  )}
                  <div className="co-light-kpi">
                    <p className="co-light-kpi-label">Grand total</p>
                    <p className="co-light-kpi-value">{fmtCurrency(financials.grandTotal)}</p>
                  </div>
                </div>

                {showNTEWarning && (
                  <div className="co-light-warning rounded-xl px-3 py-2 text-xs">
                    Action required: NTE cap is nearing limit ({nteUsedPercent.toFixed(1)}% used).
                  </div>
                )}
              </div>
            </header>

            <div className="px-4 md:px-6 py-4 md:py-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4 md:gap-5">
              <div className="space-y-4 md:space-y-5">
                <section className="co-light-shell overflow-hidden">
                  <div className="px-4 py-3 border-b border-border co-light-header">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold text-foreground">Scope & labor</h2>
                      <span className="text-xs text-muted-foreground">Tap row to expand</span>
                    </div>
                  </div>

                  <div>
                    {scopeSections.map(({ memberCO, items }) => {
                      const label = memberCO?.title ?? memberCO?.co_number ?? 'Scope section';
                      const sectionLabor = laborEntries.filter(e => e.co_id === (memberCO?.id ?? co.id));

                      if (memberCO) {
                        return (
                          <Collapsible key={memberCO.id} defaultOpen>
                            <CollapsibleTrigger className="w-full px-4 py-3 border-b border-border bg-muted/20 hover:bg-muted/30 transition-colors text-left">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {items.length} line item{items.length === 1 ? '' : 's'}
                                  </p>
                                </div>
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              {items.length === 0 ? (
                                <p className="px-4 py-4 text-sm text-muted-foreground">No scope items in this section</p>
                              ) : (
                                items.map(item => (
                                  <COLineItemRow
                                    key={item.id}
                                    item={item}
                                    laborEntries={sectionLabor.filter(e => e.co_line_item_id === item.id)}
                                    role={role}
                                    isGC={isGC}
                                    isTC={isTC}
                                    isFC={isFC}
                                    coId={co.id}
                                    orgId={myOrgId}
                                    pricingType={pricingType}
                                    nteCap={co.nte_cap}
                                    nteUsed={financials.laborTotal}
                                    canAddLabor={canEdit && (isTC || isFC)}
                                    onRefresh={refreshDetail}
                                  />
                                ))
                              )}
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      }

                      return items.length === 0 ? (
                        <p key="empty-scope" className="px-4 py-4 text-sm text-muted-foreground">
                          No scope items added yet
                        </p>
                      ) : (
                        <div key="single-scope">
                          {items.map(item => (
                            <COLineItemRow
                              key={item.id}
                              item={item}
                              laborEntries={sectionLabor.filter(e => e.co_line_item_id === item.id)}
                              role={role}
                              isGC={isGC}
                              isTC={isTC}
                              isFC={isFC}
                              coId={co.id}
                              orgId={myOrgId}
                              pricingType={pricingType}
                              nteCap={co.nte_cap}
                              nteUsed={financials.laborTotal}
                              canAddLabor={canEdit && (isTC || isFC)}
                              onRefresh={refreshDetail}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </section>

                {co.materials_needed && (
                  <COMaterialsPanel
                    coId={co.id}
                    orgId={myOrgId}
                    projectId={projectId ?? ''}
                    coTitle={displayTitle}
                    materials={materials}
                    isTC={isTC}
                    isGC={isGC}
                    isFC={isFC}
                    materialsOnSite={co.materials_on_site}
                    canEdit={canEdit}
                    onRefresh={refreshDetail}
                  />
                )}

                {co.equipment_needed && (
                  <COEquipmentPanel
                    coId={co.id}
                    orgId={myOrgId}
                    equipment={equipment}
                    isTC={isTC}
                    isGC={isGC}
                    isFC={isFC}
                    canEdit={canEdit}
                    onRefresh={refreshDetail}
                  />
                )}

                <COActivityFeed activity={activity} />
              </div>

              <aside className="space-y-4 md:space-y-5">
                <div className="co-light-shell p-4 space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Current role</p>
                  <p className="text-sm font-semibold text-foreground">{role}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email ?? 'Authenticated user'}</p>
                </div>

                <COStatusActions
                  co={co}
                  isGC={isGC}
                  isTC={isTC}
                  isFC={isFC}
                  currentOrgId={myOrgId}
                  projectId={projectId ?? ''}
                  financials={financials}
                  collaborators={collaborators}
                  onRefresh={refreshDetail}
                />

                <FCInputRequestCard
                  canRequest={canRequestFCInput}
                  canComplete={canCompleteFCInput}
                  options={fcOrgOptions}
                  collaborators={collaborators}
                  acting={fcActionPending}
                  onRequest={handleRequestFCInput}
                  onComplete={handleCompleteFCInput}
                />

                <div className="co-light-shell overflow-hidden">
                  <div className="px-4 py-3 border-b border-border co-light-header">
                    <h3 className="text-sm font-semibold text-foreground">Financial</h3>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    {isGC && (
                      <>
                        <FinRow label="Labor" value={financials.laborTotal} />
                        {co.materials_needed && <FinRow label="Materials" value={financials.materialsTotal} />}
                        {co.equipment_needed && <FinRow label="Equipment" value={financials.equipmentTotal} />}
                        <div className="border-t border-border pt-2 mt-2">
                          <FinRow label="Total billed" value={financials.grandTotal} bold />
                        </div>
                      </>
                    )}

                    {isTC && (
                      <>
                        {financials.fcLaborTotal > 0 && <FinRow label="FC cost to TC" value={financials.fcLaborTotal} muted />}
                        <FinRow label="TC labor" value={financials.tcLaborTotal} />
                        {co.materials_needed && (
                          <>
                            <FinRow label="Materials cost" value={financials.materialsCost ?? 0} muted />
                            <FinRow label="Materials billed" value={financials.materialsTotal} />
                          </>
                        )}
                        {co.equipment_needed && (
                          <>
                            <FinRow label="Equipment cost" value={financials.equipmentCost ?? 0} muted />
                            <FinRow label="Equipment billed" value={financials.equipmentTotal} />
                          </>
                        )}
                        <div className="border-t border-border pt-2 mt-2">
                          <FinRow label="Reviewed total" value={financials.grandTotal} bold />
                        </div>
                      </>
                    )}

                    {isFC && (
                      <>
                        <FinRow label="My labor" value={financials.fcLaborTotal} />
                        <div className="border-t border-border pt-2 mt-2">
                          <FinRow label="Total" value={financials.fcLaborTotal} bold />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {co.pricing_type === 'nte' && co.nte_cap && (
                  <CONTEPanel
                    co={co}
                    nteLog={nteLog}
                    usedAmount={financials.laborTotal}
                    isGC={isGC}
                    isTC={isTC}
                    isFC={isFC}
                    requestNTEIncrease={requestNTEIncrease}
                    approveNTEIncrease={approveNTEIncrease}
                    rejectNTEIncrease={rejectNTEIncrease}
                    onRefresh={refreshDetail}
                  />
                )}

                <div className="co-light-shell overflow-hidden">
                  <div className="px-4 py-3 border-b border-border co-light-header">
                    <h3 className="text-sm font-semibold text-foreground">Details</h3>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <DetailRow label="Status" value={CO_STATUS_LABELS[co.status as COStatus]} />
                    <DetailRow label="Pricing" value={PRICING_LABEL[co.pricing_type] ?? co.pricing_type} />
                    {co.reason && <DetailRow label="Reason" value={CO_REASON_LABELS[co.reason as COReasonCode]} />}
                    {co.location_tag && <DetailRow label="Location" value={co.location_tag} />}
                    <DetailRow label="Created by" value={co.created_by_role} />
                    <DetailRow label="Created" value={co.created_at ? format(new Date(co.created_at), 'MMM d, yyyy') : '—'} />
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </SidebarInset>
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}

function FinRow({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: number;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={cn(muted ? 'text-muted-foreground' : 'text-foreground', bold && 'font-semibold')}>{label}</span>
      <span className={cn(bold ? 'font-semibold text-foreground' : muted ? 'text-muted-foreground' : 'font-medium text-foreground')}>
        {fmtCurrency(value)}
      </span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

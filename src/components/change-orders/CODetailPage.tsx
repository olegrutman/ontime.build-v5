import { useParams, useNavigate } from 'react-router-dom';
import { useChangeOrderDetail } from '@/hooks/useChangeOrderDetail';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { CONTEPanel } from './CONTEPanel';
import { COActivityFeed } from './COActivityFeed';
import { useCORealtime } from '@/hooks/useCORealtime';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, MapPin, Calendar, Loader2, GitMerge, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { useDefaultSidebarOpen } from '@/hooks/use-sidebar-default';
import {
  CO_STATUS_LABELS,
  CO_REASON_LABELS,
  CO_REASON_COLORS,
} from '@/types/changeOrder';
import type { COStatus, COReasonCode, COCreatedByRole, ChangeOrder } from '@/types/changeOrder';
import { cn } from '@/lib/utils';
import { COLineItemRow } from './COLineItemRow';
import { COMaterialsPanel } from './COMaterialsPanel';
import { COEquipmentPanel } from './COEquipmentPanel';
import { COStatusActions } from './COStatusActions';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const STATUS_BADGE: Record<COStatus, string> = {
  draft:      'bg-gray-100 text-gray-700 border-gray-200',
  shared:     'bg-blue-100 text-blue-700 border-blue-200',
  combined:   'bg-purple-100 text-purple-700 border-purple-200',
  submitted:  'bg-amber-100 text-amber-700 border-amber-200',
  approved:   'bg-green-100 text-green-700 border-green-200',
  rejected:   'bg-red-100 text-red-700 border-red-200',
  contracted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const PRICING_LABEL: Record<string, string> = {
  fixed: 'Fixed price',
  tm:    'Time & material',
  nte:   'Not to exceed',
};

export function CODetailPage() {
  const { projectId, coId } = useParams<{ projectId: string; coId: string }>();
  const navigate = useNavigate();
  const defaultOpen = useDefaultSidebarOpen();
  const { currentRole, userOrgRoles } = useAuth();

  const {
    co,
    memberCOs,
    lineItems,
    laborEntries,
    materials,
    equipment,
    nteLog,
    activity,
    financials,
    isLoading,
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
  function refreshDetail() {
    queryClient.invalidateQueries({ queryKey: ['co-detail', coId] });
  }
...
                {/* Materials */}
                {co.materials_needed && (
                  <COMaterialsPanel
                    coId={co.id}
                    orgId={myOrgId}
                    projectId={projectId!}
                    materials={materials}
                    isTC={isTC}
                    isGC={isGC}
                    isFC={isFC}
                    materialsOnSite={co.materials_on_site}
                    canEdit={canEdit}
                    onRefresh={refreshDetail}
                  />
                )}

                {/* Equipment */}
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

                {/* Activity feed */}
                <COActivityFeed activity={activity} />
              </div>

              {/* Sidebar column */}
              <div className="space-y-6">
                {/* Status actions */}
                <COStatusActions
                  co={co}
                  isGC={isGC}
                  isTC={isTC}
                  isFC={isFC}
                  projectId={projectId ?? ''}
                  financials={financials}
                  onRefresh={refreshDetail}
                />

                {/* Financials */}
                <div className="rounded-lg border border-border bg-card">
                  <div className="px-4 py-3 border-b border-border">
                    <h3 className="text-sm font-semibold text-foreground">Financial summary</h3>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    {isGC && (
                      <>
                        <FinRow label="Labor" value={financials.laborTotal} />
                        {co.materials_needed && <FinRow label="Materials" value={financials.materialsTotal} />}
                        {co.equipment_needed && <FinRow label="Equipment" value={financials.equipmentTotal} />}
                        <div className="border-t border-border pt-2 mt-2">
                          <FinRow label="Total" value={financials.grandTotal} bold />
                        </div>
                      </>
                    )}

                    {isTC && (
                      <>
                        {financials.fcLaborTotal > 0 && (
                          <FinRow label="FC labor" value={financials.fcLaborTotal} muted />
                        )}
                        <FinRow label="TC labor" value={financials.tcLaborTotal} />
                        {co.materials_needed && (
                          <>
                            <FinRow label="Materials cost" value={financials.materialsCost} muted />
                            {financials.materialsMarkup > 0 && (
                              <FinRow label="Materials markup" value={financials.materialsMarkup} amber />
                            )}
                            <FinRow label="Materials billed" value={financials.materialsTotal} />
                          </>
                        )}
                        {co.equipment_needed && (
                          <>
                            <FinRow label="Equipment cost" value={financials.equipmentCost} muted />
                            {financials.equipmentMarkup > 0 && (
                              <FinRow label="Equipment markup" value={financials.equipmentMarkup} amber />
                            )}
                            <FinRow label="Equipment billed" value={financials.equipmentTotal} />
                          </>
                        )}
                        <div className="border-t border-border pt-2 mt-2">
                          <FinRow label="Grand total" value={financials.grandTotal} bold />
                        </div>
                        {financials.profitMargin !== null && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Running margin</span>
                            <span className={cn(
                              'font-semibold',
                              financials.profitMargin > 0  ? 'text-green-600' :
                              financials.profitMargin < 0  ? 'text-red-600'   : 'text-amber-600'
                            )}>
                              {financials.profitMargin.toFixed(1)}%
                            </span>
                          </div>
                        )}
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

                    {/* Fallback if no role matched */}
                    {!isGC && !isTC && !isFC && (
                      <FinRow label="Total" value={financials.grandTotal} bold />
                    )}
                  </div>
                </div>

                {/* NTE panel */}
                {co.pricing_type === 'nte' && co.nte_cap && (
                  <CONTEPanel
                    co={co}
                    nteLog={nteLog}
                    usedAmount={financials.laborTotal}
                    isGC={isGC}
                    isTC={isTC}
                    isFC={isFC}
                    onRefresh={refreshDetail}
                  />
                )}

                {/* Details */}
                <div className="rounded-lg border border-border bg-card">
                  <div className="px-4 py-3 border-b border-border">
                    <h3 className="text-sm font-semibold text-foreground">Details</h3>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <DetailRow label="Status" value={CO_STATUS_LABELS[co.status as COStatus]} />
                    <DetailRow label="Pricing" value={PRICING_LABEL[co.pricing_type] ?? co.pricing_type} />
                    {co.reason && (
                      <DetailRow label="Reason" value={CO_REASON_LABELS[co.reason as COReasonCode]} />
                    )}
                    {co.location_tag && (
                      <DetailRow label="Location" value={co.location_tag} />
                    )}
                    {co.materials_needed && (
                      <DetailRow label="Materials" value={co.materials_on_site ? 'On site' : 'Needed'} />
                    )}
                    {co.equipment_needed && (
                      <DetailRow label="Equipment" value="Needed" />
                    )}
                  </div>
                </div>
              </div>
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
  amber,
}: {
  label: string;
  value: number;
  bold?:  boolean;
  muted?: boolean;
  amber?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={cn(muted ? 'text-muted-foreground' : 'text-foreground', bold && 'font-semibold')}>
        {label}
      </span>
      <span className={cn(
        bold ? 'font-semibold text-foreground' :
        amber ? 'text-amber-600' :
        muted ? 'text-muted-foreground' : 'font-medium text-foreground'
      )}>
        ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

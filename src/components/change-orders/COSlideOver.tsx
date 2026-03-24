import { useState, useMemo } from 'react';
import { X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useChangeOrderDetail } from '@/hooks/useChangeOrderDetail';
import { useCORealtime } from '@/hooks/useCORealtime';
import { useChangeOrders } from '@/hooks/useChangeOrders';
import { useProjectFCOrgs } from '@/hooks/useProjectFCOrgs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { COStatusActions } from './COStatusActions';
import { COActivityFeed } from './COActivityFeed';
import { COLineItemRow } from './COLineItemRow';
import { COMaterialsPanel } from './COMaterialsPanel';
import { COEquipmentPanel } from './COEquipmentPanel';
import { CONTEPanel } from './CONTEPanel';
import { FCInputRequestCard } from './FCInputRequestCard';
import { CORoleBanner } from './CORoleBanner';
import { CO_STATUS_LABELS } from '@/types/changeOrder';
import type { COCreatedByRole, COFinancials, COStatus, ChangeOrder, COCollaborator, COFCOrgOption } from '@/types/changeOrder';

interface COSlideOverProps {
  coId: string;
  projectId: string;
  onClose: () => void;
}

const PRICING_LABEL: Record<string, string> = { fixed: 'Fixed price', tm: 'Time & material', nte: 'Not to exceed' };
const STATUS_BADGE: Record<COStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  shared: 'bg-accent text-accent-foreground',
  work_in_progress: 'bg-blue-100 text-blue-700',
  closed_for_pricing: 'bg-amber-100 text-amber-700',
  submitted: 'bg-primary/15 text-primary',
  approved: 'bg-primary text-primary-foreground',
  rejected: 'bg-destructive/10 text-destructive',
  contracted: 'bg-secondary text-secondary-foreground',
};

function fmtCurrency(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function COSlideOver({ coId, projectId, onClose }: COSlideOverProps) {
  const { currentRole, user, userOrgRoles } = useAuth();
  const [activeTab, setActiveTab] = useState('details');
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const {
    co, collaborators, lineItems, laborEntries, materials, equipment,
    nteLog, activity, financials, isLoading,
    requestFCInput, completeFCInput,
    requestNTEIncrease, approveNTEIncrease, rejectNTEIncrease,
  } = useChangeOrderDetail(coId);
  useCORealtime(coId);
  const { data: projectFCOrgs = [] } = useProjectFCOrgs(projectId);

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

  const collaboratorOrgIds = new Set(collaborators.map(c => c.organization_id));
  const currentCollaborator = collaborators.find(c => c.status === 'active') ?? null;
  const isCollaboratorOrg = collaborators.some(c => c.organization_id === myOrgId && c.status === 'active');
  const fcOrgOptions: COFCOrgOption[] = projectFCOrgs.filter(
    o => !collaboratorOrgIds.has(o.id) || o.id === currentCollaborator?.organization_id
  );

  const canRequestFCInput = !!co && isTC && (
    (co.assigned_to_org_id === myOrgId && ['shared', 'rejected', 'work_in_progress', 'closed_for_pricing'].includes(co.status)) ||
    (co.org_id === myOrgId && co.status === 'draft')
  );
  const canCompleteFCInput = !!co && isFC && isCollaboratorOrg;

  const isActiveStatus = ['draft', 'shared', 'work_in_progress', 'closed_for_pricing', 'submitted'].includes(co?.status ?? '');
  const isRunningPricing = co?.pricing_type === 'tm' || co?.pricing_type === 'nte';
  const canEdit = (isActiveStatus || (isRunningPricing && co?.status === 'submitted')) && (isGC || isTC || isFC);
  const nteBlocked = co?.pricing_type === 'nte' && !!co?.nte_cap && (financials.nteUsedPercent ?? 0) >= 100;

  const pricingType = co && ['fixed', 'tm', 'nte'].includes(co.pricing_type) ? co.pricing_type as 'fixed' | 'tm' | 'nte' : 'fixed';

  function refreshDetail() {
    // re-fetch via react-query invalidation happens from the hooks
  }

  async function handleSendComment() {
    if (!comment.trim() || !user || !co) return;
    setSendingComment(true);
    try {
      await supabase.from('co_activity').insert({
        co_id: co.id,
        project_id: projectId,
        actor_user_id: user.id,
        actor_role: role,
        action: 'comment',
        detail: comment.trim(),
      });
      setComment('');
      toast.success('Comment added');
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setSendingComment(false);
    }
  }

  if (isLoading || !co) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-[rgba(7,14,29,0.45)] backdrop-blur-sm" onClick={onClose} />
        <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[660px] bg-card border-l border-border shadow-2xl flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  const displayTitle = co.co_number
    ? `${co.co_number} · ${co.created_at ? format(new Date(co.created_at), 'MMM d, yyyy') : ''}`
    : (co.title ?? 'Change order');

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-[rgba(7,14,29,0.45)] backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[660px] bg-card border-l border-border shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="shrink-0 border-b border-border px-4 py-3 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-mono text-muted-foreground">{co.co_number ?? '—'}</p>
              <h2 className="text-base font-semibold text-foreground truncate">{displayTitle}</h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={cn('text-[11px]', STATUS_BADGE[co.status as COStatus])}>
                {CO_STATUS_LABELS[co.status as COStatus]}
              </Badge>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Action buttons */}
          <COStatusActions
            co={co}
            isGC={isGC}
            isTC={isTC}
            isFC={isFC}
            currentOrgId={myOrgId}
            projectId={projectId}
            financials={financials}
            collaborators={collaborators}
            onRefresh={refreshDetail}
          />
        </div>

        {/* Role banner */}
        <div className="shrink-0 px-4 pt-3">
          <CORoleBanner role={role} financials={financials} />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="shrink-0 mx-4 mt-3 bg-muted/50 w-fit">
            <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
            <TabsTrigger value="pricing" className="text-xs">Pricing</TabsTrigger>
            <TabsTrigger value="line-items" className="text-xs">Line Items</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {/* Details Tab */}
            <TabsContent value="details" className="space-y-3 mt-3">
              <div className="co-light-shell p-3 space-y-2">
                <DetailRow label="Status" value={CO_STATUS_LABELS[co.status as COStatus]} />
                <DetailRow label="Pricing" value={PRICING_LABEL[co.pricing_type] ?? co.pricing_type} />
                {co.location_tag && <DetailRow label="Location" value={co.location_tag} />}
                <DetailRow label="Created" value={co.created_at ? format(new Date(co.created_at), 'MMM d, yyyy') : '—'} />
              </div>

              <FCInputRequestCard
                canRequest={canRequestFCInput}
                canComplete={canCompleteFCInput}
                options={fcOrgOptions}
                collaborators={collaborators}
                acting={false}
                onRequest={async (orgId) => { await requestFCInput.mutateAsync(orgId); }}
                onComplete={async () => { await completeFCInput.mutateAsync(); }}
              />
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="space-y-3 mt-3">
              <div className="co-light-shell p-3 space-y-2">
                {isGC && (
                  <>
                    <FinRow label="Labor" value={financials.tcBillableToGC} />
                    {(co.materials_needed || financials.materialsTotal > 0) && <FinRow label="Materials" value={financials.materialsTotal} />}
                    {(co.equipment_needed || financials.equipmentTotal > 0) && <FinRow label="Equipment" value={financials.equipmentTotal} />}
                    <div className="border-t border-border pt-2 mt-2">
                      <FinRow label="Total billed" value={financials.tcBillableToGC + financials.materialsTotal + financials.equipmentTotal} bold />
                    </div>
                  </>
                )}
                {isTC && (() => {
                  const tcMat = (co.materials_needed || financials.materialsTotal > 0) && co.materials_responsible === 'TC' ? financials.materialsTotal : 0;
                  const tcEq = (co.equipment_needed || financials.equipmentTotal > 0) && co.equipment_responsible === 'TC' ? financials.equipmentTotal : 0;
                  return (
                    <>
                      {financials.fcLaborTotal > 0 && <FinRow label="FC cost" value={financials.fcLaborTotal} muted />}
                      <FinRow label="Billable to GC" value={financials.tcBillableToGC} />
                      {tcMat > 0 && <FinRow label="Materials" value={tcMat} />}
                      {tcEq > 0 && <FinRow label="Equipment" value={tcEq} />}
                      <div className="border-t border-border pt-2 mt-2">
                        <FinRow label="Total" value={financials.tcBillableToGC + tcMat + tcEq} bold />
                      </div>
                    </>
                  );
                })()}
                {isFC && (
                  <>
                    <FinRow label="My labor" value={financials.fcLaborTotal} />
                    <div className="border-t border-border pt-2 mt-2">
                      <FinRow label="Total" value={financials.fcLaborTotal} bold />
                    </div>
                  </>
                )}
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
            </TabsContent>

            {/* Line Items Tab */}
            <TabsContent value="line-items" className="space-y-3 mt-3">
              {co.materials_needed && (
                <COMaterialsPanel
                  coId={co.id}
                  orgId={myOrgId}
                  projectId={projectId}
                  coTitle={displayTitle}
                  materials={materials}
                  isTC={isTC}
                  isGC={isGC}
                  isFC={isFC}
                  materialsOnSite={co.materials_on_site}
                  materialsResponsible={co.materials_responsible}
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
                  equipmentResponsible={co.equipment_responsible}
                  canEdit={canEdit}
                  onRefresh={refreshDetail}
                />
              )}

              <div className="co-light-shell overflow-hidden">
                <div className="px-3 py-2 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">Scope & Labor</h3>
                </div>
                <div>
                  {lineItems.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-muted-foreground">No scope items</p>
                  ) : (
                    lineItems.map(item => (
                      <COLineItemRow
                        key={item.id}
                        item={item}
                        laborEntries={laborEntries.filter(e => e.co_line_item_id === item.id)}
                        role={role}
                        isGC={isGC}
                        isTC={isTC}
                        isFC={isFC}
                        coId={co.id}
                        orgId={myOrgId}
                        pricingType={pricingType}
                        nteCap={co.nte_cap}
                        nteUsed={financials.laborTotal}
                        canAddLabor={canEdit && (isTC || isFC) && !nteBlocked}
                        onRefresh={refreshDetail}
                      />
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-3">
              <COActivityFeed activity={activity} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Comment bar */}
        <div className="shrink-0 border-t border-border px-4 py-3 bg-card">
          <div className="flex items-center gap-2">
            <span className={cn(
              'inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold text-white shrink-0',
              role === 'GC' ? 'bg-blue-500' : role === 'TC' ? 'bg-emerald-500' : 'bg-amber-500',
            )}>
              {role.charAt(0)}
            </span>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Add a note or @mention a team member…"
              className="min-h-[36px] h-9 resize-none text-sm flex-1"
              rows={1}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendComment();
                }
              }}
            />
            <Button
              size="sm"
              disabled={!comment.trim() || sendingComment}
              onClick={handleSendComment}
              className="h-9"
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function FinRow({ label, value, bold, muted }: { label: string; value: number; bold?: boolean; muted?: boolean }) {
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

import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Send, Copy, MoreHorizontal, Hammer, Plus, ShieldCheck, Camera, ExternalLink, Download, Receipt } from 'lucide-react';
import { VoiceInputButton } from '@/components/VoiceInputButton';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/components/auth/RequirePermission';
import { useIsMobile } from '@/hooks/use-mobile';
import { useChangeOrderDetail } from '@/hooks/useChangeOrderDetail';
import { useCORealtime } from '@/hooks/useCORealtime';
import { useProjectFCOrgs } from '@/hooks/useProjectFCOrgs';
import { useCORoleContext } from '@/hooks/useCORoleContext';
import { useCOResponsibility } from '@/hooks/useCOResponsibility';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { CONextActionBanner } from './CONextActionBanner';
import { COKPIStrip } from './COKPIStrip';
import { COHeaderStrip } from './COHeaderStrip';
import { COSidebar } from './COSidebar';
import { COStickyFooter } from './COStickyFooter';
import { COLineItemRow } from './COLineItemRow';
import { COMaterialsPanel } from './COMaterialsPanel';
import { COEquipmentPanel } from './COEquipmentPanel';
import { COActivityFeed } from './COActivityFeed';
import { COAuditLog } from './COAuditLog';
import { COPhotosCard, type COPhotosCardHandle } from './COPhotosCard';
import { COPhotoNudgeBanner } from './COPhotoNudgeBanner';
import { COAcceptBanner } from './COAcceptBanner';
import { COExternalApprovalBanner } from './COExternalApprovalBanner';
import { useCOAuditLog } from '@/hooks/useCOAuditLog';
import { useCOPhotos } from '@/hooks/useCOPhotos';
import { CORFIBlockBanner } from './CORFIBlockBanner';
import { COExternalInviteDialog } from './COExternalInviteDialog';
import { COExternalInvitesCard } from './COExternalInvitesCard';
import { CreateInvoiceFromCOs } from '@/components/invoices/CreateInvoiceFromCOs';


import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { COStatus, COFCOrgOption } from '@/types/changeOrder';

interface CODetailLayoutProps {
  coId: string;
  projectId: string;
}

export function CODetailLayout({ coId, projectId }: CODetailLayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canApprove = usePermission('canApprove');
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const scopeRef = useRef<HTMLDivElement>(null);
  const materialsRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const photosCardRef = useRef<COPhotosCardHandle>(null);

  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [externalInviteOpen, setExternalInviteOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  async function handleDownloadPdf() {
    if (!co) return;
    setDownloadingPdf(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-co-pdf`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ co_id: co.id }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CO-${co.co_number ?? co.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to download PDF');
    } finally {
      setDownloadingPdf(false);
    }
  }

  const { data: auditEntries = [] } = useCOAuditLog(coId);
  const {
    co, collaborators, lineItems, laborEntries, materials, equipment,
    nteLog, activity, financials, isLoading,
    requestFCInput, completeFCInput, closeForPricing,
    requestNTEIncrease, approveNTEIncrease, rejectNTEIncrease,
    submitCO, approveCO, rejectCO,
  } = useChangeOrderDetail(coId);
  useCORealtime(coId);
  const { data: projectFCOrgs = [] } = useProjectFCOrgs(projectId);
  const { photos } = useCOPhotos(coId);

  // Project-level photo requirement setting
  const { data: projectSettings } = useQuery({
    queryKey: ['project-co-settings', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('require_photos_on_submit, tc_markup_visibility')
        .eq('id', projectId)
        .single();
      return data;
    },
    enabled: !!projectId,
    staleTime: Infinity,
  });
  const requirePhotos = !!(projectSettings as any)?.require_photos_on_submit;
  const photosBlocked = requirePhotos && photos.length === 0;
  const markupVisibility = ((projectSettings as any)?.tc_markup_visibility ?? 'hidden') as import('@/hooks/useMarkupVisibility').MarkupVisibility;

  // Check for existing invoice linked to this CO
  const { data: linkedInvoice } = useQuery({
    queryKey: ['co-linked-invoice', coId],
    enabled: !!coId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, status')
        .contains('co_ids', [coId])
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const {
    isGC, isTC, isFC, role, myOrgId, myOrgName,
    canEdit, canEditExternal, canEditInternal, canRequestFCInput, canCompleteFCInput, nteBlocked,
    pricingType, collaboratorOrgIds, currentCollaborator, fcCollabName,
  } = useCORoleContext(co ?? null, collaborators, financials);

  const responsibility = useCOResponsibility(
    co?.id, projectId,
    (co as any)?.co_material_responsible_override,
    (co as any)?.co_equipment_responsible_override,
    (co as any)?.materials_responsible,
    (co as any)?.equipment_responsible,
  );

  const fcOrgOptions: COFCOrgOption[] = projectFCOrgs.filter(
    o => !collaboratorOrgIds.has(o.id) || o.id === currentCollaborator?.organization_id
  );

  function refreshDetail() {
    queryClient.invalidateQueries({ queryKey: ['co-detail', coId] });
    queryClient.invalidateQueries({ queryKey: ['change-orders', projectId] });
  }

  function handleBack() { navigate(`/project/${projectId}/change-orders`); }

  async function handleAction(action: string) {
    switch (action) {
      case 'scroll_scope': scopeRef.current?.scrollIntoView({ behavior: 'smooth' }); break;
      case 'scroll_materials': materialsRef.current?.scrollIntoView({ behavior: 'smooth' }); break;
      case 'scroll_pricing': pricingRef.current?.scrollIntoView({ behavior: 'smooth' }); break;
      case 'scroll_fc': scopeRef.current?.scrollIntoView({ behavior: 'smooth' }); break;
      case 'log_hours': scopeRef.current?.scrollIntoView({ behavior: 'smooth' }); break;
      case 'request_fc':
        if (fcOrgOptions.length === 0) {
          toast.info('No field crews found on this project');
        } else if (fcOrgOptions.length === 1) {
          try {
            await requestFCInput.mutateAsync(fcOrgOptions[0].id);
            toast.success(`Requested hours from ${fcOrgOptions[0].name}`);
          } catch { toast.error('Failed to request FC input'); }
        } else {
          // Multi-FC: prefer scrolling to the dedicated card; if it isn't on screen
          // (mobile/condensed sidebar) fall back to a simple prompt.
          const el = document.getElementById('fc-request-card');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          } else {
            const labels = fcOrgOptions.map((o, i) => `${i + 1}. ${o.name}`).join('\n');
            const choice = window.prompt(`Pick a field crew to request hours from:\n${labels}\n\nEnter number 1-${fcOrgOptions.length}`);
            const idx = choice ? parseInt(choice, 10) - 1 : -1;
            if (idx >= 0 && idx < fcOrgOptions.length) {
              try {
                await requestFCInput.mutateAsync(fcOrgOptions[idx].id);
                toast.success(`Requested hours from ${fcOrgOptions[idx].name}`);
              } catch { toast.error('Failed to request FC input'); }
            }
          }
        }
        break;
      case 'submit_to_tc':
        if (co) {
          if (photosBlocked) {
            toast.error('At least 1 photo is required before submitting. This project has photo requirements enabled.');
            photosCardRef.current?.openAdd('during');
            break;
          }
          try {
            // FC-as-creator submits the CO itself; FC-as-collaborator marks input complete.
            const isFCCreator = co.created_by_role === 'FC' && co.org_id === myOrgId;
            if (isFCCreator) {
              await submitCO.mutateAsync(co.id);
            } else {
              await completeFCInput.mutateAsync();
            }
            toast.success('Submitted to Trade Contractor');
          } catch (e: any) { toast.error(e?.message ?? 'Failed to submit to TC'); }
        }
        break;
      case 'close_for_pricing':
        if (co) {
          try {
            await closeForPricing.mutateAsync(co.id);
            toast.success('Closed for pricing');
          } catch (e: any) { toast.error(e?.message ?? 'Failed to close for pricing'); }
        }
        break;
      case 'submit':
        if (co) {
          if (rfiBlocked) {
            toast.error('This change order is blocked by an open RFI. Resolve the RFI first.');
            break;
          }
          if (photosBlocked) {
            toast.error('At least 1 photo is required before submitting. This project has photo requirements enabled.');
            photosCardRef.current?.openAdd('during');
            break;
          }
          try {
            await submitCO.mutateAsync(co.id);
            toast.success('Submitted for approval');
          } catch (e: any) { toast.error(e?.message ?? 'Failed to submit'); }
        }
        break;
      case 'approve':
        if (co) {
          if (!canApprove) { toast.error('You do not have permission to approve'); break; }
          try {
            await approveCO.mutateAsync(co.id);
            toast.success('Approved');
          } catch (e: any) { toast.error(e?.message ?? 'Failed to approve'); }
        }
        break;
      case 'reject':
        if (co) {
          if (!canApprove) { toast.error('You do not have permission to reject'); break; }
          const note = window.prompt('Rejection reason:');
          if (note) {
            try {
              await rejectCO.mutateAsync({ coId: co.id, note });
              toast.success('Rejected');
            } catch (e: any) { toast.error(e?.message ?? 'Failed to reject'); }
          }
        }
        break;
      default: window.scrollTo({ top: 0, behavior: 'smooth' }); break;
    }
  }

  async function handleSendComment() {
    if (!comment.trim() || !user || !co) return;
    setSendingComment(true);
    try {
      await supabase.from('co_activity').insert({
        co_id: co.id, project_id: projectId,
        actor_user_id: user.id, actor_role: role,
        action: 'comment', detail: comment.trim(),
      });
      setComment('');
      toast.success('Comment added');
      refreshDetail();
    } catch { toast.error('Failed to add comment'); }
    finally { setSendingComment(false); }
  }

  if (isLoading || !co) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const status = co.status as COStatus;
  const rfiBlocked = !!(co as any).blocked_by_rfi_id;
  const displayTitle = co.title ?? co.co_number ?? (co.document_type === 'WO' ? 'Work Order' : 'Change Order');

  // Creation checklist flags (shown for draft COs)
  const isDraft = status === 'draft';
  const hasLocation = !!(co.location_tag);
  const hasReason = !!(co.reason);
  const hasScopeItems = lineItems.length > 0;
  const hasPricing = lineItems.length > 0 && laborEntries.some(e => !e.is_actual_cost);
  const creationReady = hasLocation && hasReason && hasScopeItems;

  // Scope & Labor totals
  const pricedCount = lineItems.filter(li =>
    laborEntries.some(e => e.co_line_item_id === li.id && !e.is_actual_cost)
  ).length;
  const totalLogged = laborEntries.filter(e => !e.is_actual_cost).reduce((s, e) => s + (e.line_total ?? 0), 0);
  const roleActualCost = isTC ? financials.tcActualCostTotal : financials.fcActualCostTotal;
  const displayBillable = isTC ? financials.grandTotal : totalLogged;
  const grossMargin = displayBillable - roleActualCost;
  const grossMarginPct = displayBillable > 0 ? (grossMargin / displayBillable) * 100 : 0;

  const sidebarProps = {
    co, isGC, isTC, isFC, role, myOrgId, projectId,
    financials, collaborators, fcOrgOptions, fcCollabName,
    canEdit, canRequestFCInput, canCompleteFCInput,
    nteLog, requestFCInput, completeFCInput,
    requestNTEIncrease, approveNTEIncrease, rejectNTEIncrease,
    onRefresh: refreshDetail,
    lineItemCount: lineItems.length,
    markupVisibility,
  };

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: 'hsl(var(--background))' }}>
      {/* Breadcrumb bar */}
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 text-xs text-muted-foreground truncate">
              <span className="hidden sm:inline">{co.document_type === 'WO' ? 'Work Orders' : 'Change Orders'} › </span>
              <span className="font-medium text-foreground font-mono">{co.co_number ?? displayTitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1 text-muted-foreground"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} PDF
            </Button>
            {/* Invoice: show linked or generate */}
            {linkedInvoice ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1 text-emerald-600"
                onClick={() => navigate(`/project/${projectId}/invoices`)}
              >
                <Receipt className="h-3.5 w-3.5" /> {linkedInvoice.invoice_number}
              </Button>
            ) : (isTC || isFC) && (status === 'approved' || status === 'contracted') ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1 text-primary"
                onClick={() => setCreateInvoiceOpen(true)}
              >
                <Receipt className="h-3.5 w-3.5" /> Generate Invoice
              </Button>
            ) : null}
            {isGC && (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={() => setExternalInviteOpen(true)}>
                <ExternalLink className="h-3.5 w-3.5" /> Invite External
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground">
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Accept Banner */}
      <div className="max-w-7xl mx-auto w-full px-4 pt-3 space-y-3">
        <COAcceptBanner co={co} projectId={projectId} myOrgId={myOrgId} collaborators={collaborators} onRefresh={refreshDetail} />
        <CORFIBlockBanner blockedByRfiId={(co as any).blocked_by_rfi_id} projectId={projectId} />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto pb-24 md:pb-4">
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">


          {/* Full-width Header Card + Pipeline */}
          <COHeaderStrip co={co} role={role} myOrgName={myOrgName} />

          {/* Next Action Banner */}
          <CONextActionBanner co={co} isGC={isGC} isTC={isTC} isFC={isFC} financials={financials} fcCollabName={fcCollabName} onAction={handleAction} />

          {/* Photo nudge banner */}
          <COPhotoNudgeBanner
            status={co.status}
            photos={photos}
            onTakePhoto={(type) => photosCardRef.current?.openAdd(type)}
          />

          {/* KPI Row */}
          <COKPIStrip co={co} isGC={isGC} isTC={isTC} isFC={isFC} financials={financials} hasMaterials={co.materials_needed || materials.length > 0 || (isTC && canEdit)} hasEquipment={co.equipment_needed || equipment.length > 0 || (isTC && canEdit)} materialResponsible={responsibility.materialResponsible} equipmentResponsible={responsibility.equipmentResponsible} onRefresh={refreshDetail} markupVisibility={markupVisibility} />

          {/* Two-column layout */}
          <div className="flex gap-4">
            <div className="flex-1 min-w-0 space-y-4" ref={pricingRef}>

              {/* ====== SCOPE & LABOR ====== */}
              <div ref={scopeRef} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                {/* Card header */}
                <div className="px-5 py-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--navy))' }}>
                        <Hammer className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-heading text-base font-bold uppercase tracking-wide text-foreground">Scope & Labor</h3>
                      </div>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: 'hsl(var(--navy)/0.08)', color: 'hsl(var(--navy))' }}>
                        {lineItems.length} item{lineItems.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {canEdit && !nteBlocked && co && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => navigate(`/project/${projectId}/change-orders/${co.id}/add-items`)}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add item
                      </Button>
                    )}
                  </div>

                  {/* Totals strip */}
                  {lineItems.length > 0 && !isFC && (
                    <div className="flex items-center mt-3 rounded-lg border border-border overflow-hidden text-xs">
                      <div className={cn("flex-1 px-3 py-2 text-center", (isTC || isFC) && "border-r border-border")}>
                        <p className="text-muted-foreground font-medium">{isGC ? 'TC Submitted' : isTC ? 'Billable to GC' : 'Billed to TC'}</p>
                        <p className="font-mono font-bold text-foreground mt-0.5">
                          ${ (isGC ? financials.grandTotal : displayBillable).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
                        </p>
                      </div>
                      {(isTC || isFC) && (
                        <>
                          <div className="flex-1 px-3 py-2 text-center border-r border-border">
                            <p className="text-muted-foreground font-medium">Internal Cost</p>
                            <p className="font-mono font-bold text-foreground mt-0.5">${roleActualCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                          </div>
                          <div className="flex-1 px-3 py-2 text-center" style={{ background: grossMargin >= 0 ? 'hsl(152 82% 39% / 0.06)' : 'hsl(0 84% 60% / 0.06)' }}>
                            <p className="text-muted-foreground font-medium">Gross Margin</p>
                            <p className={cn('font-mono font-bold mt-0.5', grossMargin >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400')}>
                              ${grossMargin.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({grossMarginPct.toFixed(0)}%)
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Progress bar */}
                  {lineItems.length > 0 && (
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${lineItems.length > 0 ? (pricedCount / lineItems.length) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                        {pricedCount}/{lineItems.length} priced
                        {isTC && totalLogged > 0 && <> · <span className="font-mono font-semibold text-foreground">${totalLogged.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span> logged</>}
                      </span>
                    </div>
                  )}
                </div>

                {/* Line items */}
                <div>
                  {lineItems.length === 0 ? (
                    <div className="px-6 py-10 text-center">
                      <Hammer className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-foreground">No scope items yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Add a scope item to start tracking work and pricing</p>
                    </div>
                  ) : (
                    lineItems.map((item, idx) => (
                      <COLineItemRow
                        key={item.id} item={item}
                        laborEntries={laborEntries.filter(e => e.co_line_item_id === item.id)}
                        role={role} isGC={isGC} isTC={isTC} isFC={isFC}
                        coId={co.id} orgId={myOrgId} coPricingType={pricingType}
                        coNteCap={co.nte_cap} coNteUsed={financials.laborTotal}
                        canAddLabor={canEdit && (isTC || isFC) && !nteBlocked}
                        canEditExternal={canEditExternal}
                        canEditInternal={canEditInternal}
                        onRefresh={refreshDetail}
                        isEven={idx % 2 === 0}
                        index={idx + 1}
                        markupVisibility={markupVisibility}
                      />
                    ))
                  )}
                </div>

                {/* Add another scope item row */}
                {canEdit && !nteBlocked && lineItems.length > 0 && co && (
                  <div className="border-t border-dashed border-border p-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1 text-muted-foreground"
                      onClick={() => navigate(`/project/${projectId}/change-orders/${co.id}/add-items`)}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add another item
                    </Button>
                  </div>
                )}
              </div>

              {/* Materials */}
              {(co.materials_needed || materials.length > 0 || (isTC && canEdit)) && (
                <div ref={materialsRef}>
                <COMaterialsPanel
                    coId={co.id} orgId={myOrgId} projectId={projectId}
                    coTitle={displayTitle} materials={materials}
                    isTC={isTC} isGC={isGC} isFC={isFC}
                    materialsOnSite={co.materials_on_site}
                    materialsResponsible={responsibility.materialResponsible}
                    canEdit={canEdit}
                    canEditExternal={canEditExternal}
                    onRefresh={refreshDetail}
                  />
                </div>
              )}

              {/* Equipment */}
              {(co.equipment_needed || equipment.length > 0 || (isTC && canEdit)) && (
                <COEquipmentPanel
                  coId={co.id} orgId={myOrgId} equipment={equipment}
                  isTC={isTC} isGC={isGC} isFC={isFC}
                  equipmentResponsible={responsibility.equipmentResponsible}
                  canEdit={canEdit}
                  canEditExternal={canEditExternal}
                  onRefresh={refreshDetail}
                />
              )}

              {/* Photos */}
              <COPhotosCard ref={photosCardRef} coId={co.id} role={role} lineItems={lineItems} />

              {/* External Invites */}
              <COExternalInvitesCard coId={co.id} coNumber={co.co_number} coTitle={displayTitle} />

              {/* Activity — Collapsible */}
              <Collapsible open={activityOpen} onOpenChange={setActivityOpen}>
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                  <CollapsibleTrigger asChild>
                    <button type="button" className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-accent/30 transition-colors">
                      <h3 className="font-heading text-[0.75rem] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-2">
                        💬 Activity
                        <span className="text-[10px] bg-muted rounded-full px-2 py-0.5">{activity.length}</span>
                      </h3>
                      <span className={cn('h-4 w-4 text-muted-foreground transition-transform', activityOpen && 'rotate-180')}>▾</span>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-5 py-2 border-t border-border">
                      <COActivityFeed activity={activity} />
                    </div>
                    <div className="border-t border-border px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold text-white shrink-0',
                          role === 'GC' ? 'bg-blue-500' : role === 'TC' ? 'bg-emerald-500' : 'bg-amber-500',
                        )}>
                          {role.charAt(0)}
                        </span>
                        <Textarea
                          value={comment} onChange={e => setComment(e.target.value)}
                          placeholder="Add a note…" className="min-h-[36px] h-9 resize-none text-sm flex-1" rows={1}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                        />
                        <VoiceInputButton onTranscript={(text) => setComment(prev => prev ? prev + ' ' + text : text)} />
                        <Button size="sm" disabled={!comment.trim() || sendingComment} onClick={handleSendComment} className="h-9">
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Audit Log — Collapsible */}
              <Collapsible open={auditOpen} onOpenChange={setAuditOpen}>
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                  <CollapsibleTrigger asChild>
                    <button type="button" className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-accent/30 transition-colors">
                      <h3 className="font-heading text-[0.75rem] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" /> Audit Log
                        <span className="text-[10px] bg-muted rounded-full px-2 py-0.5">{auditEntries.length}</span>
                      </h3>
                      <span className={cn('h-4 w-4 text-muted-foreground transition-transform', auditOpen && 'rotate-180')}>▾</span>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-border">
                      <COAuditLog entries={auditEntries} viewerRole={role} />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>

            {/* Sidebar */}
            {!isMobile && (
              <div className="w-[300px] shrink-0 space-y-3 sticky top-14 self-start">
                <COSidebar {...sidebarProps} />
              </div>
            )}
          </div>

          {isMobile && <COSidebar {...sidebarProps} />}
        </div>
      </div>

      <COStickyFooter
        status={status} isGC={isGC} isTC={isTC} isFC={isFC}
        financials={financials} fcCollabName={fcCollabName} onAction={handleAction}
        photoCount={photos.length} photosBlocked={photosBlocked}
        onOpenCamera={() => photosCardRef.current?.openAdd()}
      />

      <COExternalInviteDialog
        open={externalInviteOpen}
        onOpenChange={setExternalInviteOpen}
        coId={co.id}
        coNumber={co.co_number}
        coTitle={displayTitle}
        projectId={projectId}
        onInviteSent={refreshDetail}
      />

      <CreateInvoiceFromCOs
        open={createInvoiceOpen}
        onOpenChange={setCreateInvoiceOpen}
        projectId={projectId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['co-linked-invoice', coId] });
          refreshDetail();
        }}
        isTM={co.document_type === 'WO'}
      />
    </div>
  );
}

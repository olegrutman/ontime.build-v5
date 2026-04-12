import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { DT } from '@/lib/design-tokens';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useChangeOrderDetail } from '@/hooks/useChangeOrderDetail';
import { useCORealtime } from '@/hooks/useCORealtime';
import { useProjectFCOrgs } from '@/hooks/useProjectFCOrgs';
import { useCORoleContext } from '@/hooks/useCORoleContext';
import { useCOResponsibility } from '@/hooks/useCOResponsibility';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { COHeroBlock } from './COHeroBlock';
import { COKPIStrip } from './COKPIStrip';
import { COHeaderStrip } from './COHeaderStrip';
import { COSidebar } from './COSidebar';
import { COStickyFooter } from './COStickyFooter';
import { COHourEntryInline } from './COHourEntryInline';
import { COContextualAlert } from './COContextualAlert';
import { COWhosHere } from './COWhosHere';
import { COLineItemRow } from './COLineItemRow';
import { COMaterialsPanel } from './COMaterialsPanel';
import { COEquipmentPanel } from './COEquipmentPanel';
import { COActivityFeed } from './COActivityFeed';
import { COAcceptBanner } from './COAcceptBanner';
import { COTeamCard } from './COTeamCard';
import { AddScopeItemButton } from './AddScopeItemButton';
import { CO_STATUS_LABELS } from '@/types/changeOrder';
import type { COStatus, COFCOrgOption } from '@/types/changeOrder';

interface CODetailLayoutProps {
  coId: string;
  projectId: string;
  isTM?: boolean;
}

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

export function CODetailLayout({ coId, projectId, isTM = false }: CODetailLayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const scopeRef = useRef<HTMLDivElement>(null);
  const materialsRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

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

  const {
    isGC, isTC, isFC, role, myOrgId, myOrgName,
    canEdit, canRequestFCInput, canCompleteFCInput, nteBlocked,
    pricingType, collaboratorOrgIds, currentCollaborator, fcCollabName,
  } = useCORoleContext(co ?? null, collaborators, financials);

  const responsibility = useCOResponsibility(
    co?.id,
    projectId,
    (co as any)?.co_material_responsible_override,
    (co as any)?.co_equipment_responsible_override,
  );

  const fcOrgOptions: COFCOrgOption[] = projectFCOrgs.filter(
    o => !collaboratorOrgIds.has(o.id) || o.id === currentCollaborator?.organization_id
  );

  function refreshDetail() {
    queryClient.invalidateQueries({ queryKey: ['co-detail', coId] });
    queryClient.invalidateQueries({ queryKey: ['change-orders', projectId] });
  }

  function handleBack() {
    navigate(`/project/${projectId}/change-orders`);
  }

  function handleHeroAction(action: string) {
    switch (action) {
      case 'scroll_scope': scopeRef.current?.scrollIntoView({ behavior: 'smooth' }); break;
      case 'scroll_materials': materialsRef.current?.scrollIntoView({ behavior: 'smooth' }); break;
      case 'scroll_pricing': pricingRef.current?.scrollIntoView({ behavior: 'smooth' }); break;
      case 'scroll_fc': scopeRef.current?.scrollIntoView({ behavior: 'smooth' }); break;
      case 'log_hours': scopeRef.current?.scrollIntoView({ behavior: 'smooth' }); break;
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
  const displayTitle = co.title ?? co.co_number ?? (isTM ? 'Work Order' : 'Change Order');
  const firstLineItem = lineItems[0];

  const mainContent = (
    <>
      {/* Team Card */}
      <COTeamCard co={co} collaborators={collaborators} />

      {/* Scope & Labor — Primary section */}
      {(() => {
        const pricedCount = lineItems.filter(li =>
          laborEntries.some(e => e.co_line_item_id === li.id && !e.is_actual_cost)
        ).length;
        const totalLogged = laborEntries
          .filter(e => !e.is_actual_cost)
          .reduce((s, e) => s + (e.line_total ?? 0), 0);

        return (
          <div ref={scopeRef} className="bg-card border border-border rounded-lg overflow-hidden border-l-4 border-l-primary shadow-sm">
            <div className="px-3.5 py-3 border-b border-border bg-primary/[0.02]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-sm font-semibold text-foreground">
                    Scope & Labor
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold">
                    {lineItems.length} item{lineItems.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {canEdit && !nteBlocked && co && (
                  <AddScopeItemButton
                    coId={co.id} orgId={myOrgId} projectId={projectId}
                    role={role} co={co} collaborators={collaborators} onAdded={refreshDetail}
                  />
                )}
              </div>
              {/* Progress strip */}
              {lineItems.length > 0 && (
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${lineItems.length > 0 ? (pricedCount / lineItems.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                    {pricedCount}/{lineItems.length} priced
                    {totalLogged > 0 && <> · <span className="text-foreground font-semibold">${totalLogged.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span> logged</>}
                  </span>
                </div>
              )}
            </div>
            <div>
              {lineItems.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">No scope items yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Add a scope item to start tracking work</p>
                </div>
              ) : (
                lineItems.map((item, idx) => (
                  <COLineItemRow
                    key={item.id} item={item}
                    laborEntries={laborEntries.filter(e => e.co_line_item_id === item.id)}
                    role={role} isGC={isGC} isTC={isTC} isFC={isFC}
                    coId={co.id} orgId={myOrgId} pricingType={pricingType}
                    nteCap={co.nte_cap} nteUsed={financials.laborTotal}
                    canAddLabor={canEdit && (isTC || isFC) && !nteBlocked}
                    onRefresh={refreshDetail}
                    isEven={idx % 2 === 0}
                    index={idx + 1}
                  />
                ))
              )}
            </div>
          </div>
        );
      })()}

      {/* Materials */}
      {(co.materials_needed || materials.length > 0) && (
        <div ref={materialsRef}>
          <COMaterialsPanel
            coId={co.id} orgId={myOrgId} projectId={projectId}
            coTitle={displayTitle} materials={materials}
            isTC={isTC} isGC={isGC} isFC={isFC}
            materialsOnSite={co.materials_on_site}
            materialsResponsible={co.materials_responsible}
            canEdit={canEdit} onRefresh={refreshDetail}
          />
        </div>
      )}

      {/* Equipment */}
      {(co.equipment_needed || equipment.length > 0) && (
        <COEquipmentPanel
          coId={co.id} orgId={myOrgId} equipment={equipment}
          isTC={isTC} isGC={isGC} isFC={isFC}
          equipmentResponsible={co.equipment_responsible}
          canEdit={canEdit} onRefresh={refreshDetail}
        />
      )}

      {/* Activity */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-3.5 py-3 border-b border-border">
          <h3 className="font-heading text-[0.7rem] uppercase tracking-[0.04em] font-semibold text-muted-foreground">
            💬 Activity
          </h3>
        </div>
        <div className="px-3.5 py-2">
          <COActivityFeed activity={activity} />
        </div>
        <div className="border-t border-border px-3.5 py-3">
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
            <Button size="sm" disabled={!comment.trim() || sendingComment} onClick={handleSendComment} className="h-9">
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );

  const sidebarProps = {
    co, isGC, isTC, isFC, role, myOrgId, projectId,
    financials, collaborators, fcOrgOptions, fcCollabName,
    canEdit, canRequestFCInput, canCompleteFCInput,
    nteLog, requestFCInput, completeFCInput,
    requestNTEIncrease, approveNTEIncrease, rejectNTEIncrease,
    onRefresh: refreshDetail,
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Topbar */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 text-xs text-muted-foreground truncate">
              <span className="hidden sm:inline">{isTM ? 'Work Orders' : 'Change Orders'} › </span>
              <span className="font-medium text-foreground">{co.co_number ?? displayTitle}</span>
            </div>
          </div>
          <Badge variant="outline" className={cn('text-[11px]', STATUS_BADGE[status])}>
            {CO_STATUS_LABELS[status]}
          </Badge>
        </div>
      </header>

      {/* Accept Banner */}
      <div className="max-w-6xl mx-auto w-full px-4 pt-2">
        <COAcceptBanner co={co} projectId={projectId} myOrgId={myOrgId} collaborators={collaborators} onRefresh={refreshDetail} />
      </div>

      {/* Who's Here */}
      <COWhosHere coId={coId} role={role} activeTab="detail" />

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-24 md:pb-4">
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
          <COHeaderStrip co={co} role={role} myOrgName={myOrgName} />
          <COKPIStrip co={co} isGC={isGC} isTC={isTC} isFC={isFC} financials={financials} hasMaterials={co.materials_needed || materials.length > 0} hasEquipment={co.equipment_needed || equipment.length > 0} />
          <COHeroBlock co={co} isGC={isGC} isTC={isTC} isFC={isFC} financials={financials} fcCollabName={fcCollabName} onAction={handleHeroAction} isTM={isTM} />


          <COContextualAlert co={co} isGC={isGC} isTC={isTC} isFC={isFC} fcCollabName={fcCollabName} financials={financials} />

          {/* Two-column layout */}
          <div className="flex gap-4">
            <div className="flex-1 min-w-0 space-y-3" ref={pricingRef}>{mainContent}</div>
            {!isMobile && (
              <div className="w-[300px] shrink-0 space-y-3">
                <COSidebar {...sidebarProps} />
              </div>
            )}
          </div>

          {isMobile && <COSidebar {...sidebarProps} />}
        </div>
      </div>

      <COStickyFooter status={status} isGC={isGC} isTC={isTC} isFC={isFC} financials={financials} fcCollabName={fcCollabName} onAction={handleHeroAction} />
    </div>
  );
}

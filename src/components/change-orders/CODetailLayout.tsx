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
import { CO_STATUS_LABELS } from '@/types/changeOrder';
import type { COStatus, COFCOrgOption } from '@/types/changeOrder';

interface CODetailLayoutProps {
  coId: string;
  projectId: string;
  onClose?: () => void;
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

export function CODetailLayout({ coId, projectId, onClose }: CODetailLayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const scopeRef = useRef<HTMLDivElement>(null);
  const materialsRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [showHourEntry, setShowHourEntry] = useState(false);

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

  const fcOrgOptions: COFCOrgOption[] = projectFCOrgs.filter(
    o => !collaboratorOrgIds.has(o.id) || o.id === currentCollaborator?.organization_id
  );

  function refreshDetail() {
    queryClient.invalidateQueries({ queryKey: ['co-detail', coId] });
    queryClient.invalidateQueries({ queryKey: ['change-orders', projectId] });
  }

  function handleBack() {
    if (onClose) onClose();
    else navigate(`/project/${projectId}/change-orders`);
  }

  function handleHeroAction(action: string) {
    switch (action) {
      case 'scroll_scope':
        scopeRef.current?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'scroll_materials':
        materialsRef.current?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'scroll_pricing':
        pricingRef.current?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'log_hours':
        setShowHourEntry(true);
        break;
      default:
        // Actions like approve, reject, submit, etc. are handled by COStatusActions
        // For now scroll to top where actions live
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
    }
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
      refreshDetail();
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setSendingComment(false);
    }
  }

  if (isLoading || !co) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const status = co.status as COStatus;
  const displayTitle = co.title ?? co.co_number ?? 'Change Order';
  const firstLineItem = lineItems[0];

  const mainContent = (
    <>
      {/* Scope & Labor */}
      <div ref={scopeRef} className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-3.5 py-3 border-b border-border">
          <h3 className="text-[0.7rem] uppercase tracking-[0.04em] font-semibold text-muted-foreground" style={DT.heading}>
            📋 Scope & Labor
          </h3>
        </div>
        <div>
          {lineItems.length === 0 ? (
            <p className="px-3.5 py-4 text-sm text-muted-foreground">No scope items</p>
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

      {/* Materials */}
      {(co.materials_needed || materials.length > 0) && (
        <div ref={materialsRef}>
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
        </div>
      )}

      {/* Equipment */}
      {(co.equipment_needed || equipment.length > 0) && (
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

      {/* Activity */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-3.5 py-3 border-b border-border">
          <h3 className="text-[0.7rem] uppercase tracking-[0.04em] font-semibold text-muted-foreground" style={DT.heading}>
            💬 Activity
          </h3>
        </div>
        <div className="px-3.5 py-2">
          <COActivityFeed activity={activity} />
        </div>
        {/* Comment bar */}
        <div className="border-t border-border px-3.5 py-3">
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
              placeholder="Add a note…"
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
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className={cn('flex flex-col', isSlideOver ? 'h-full' : 'min-h-screen bg-background')}>
      {/* Topbar */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 text-xs text-muted-foreground truncate">
              <span className="hidden sm:inline">Change Orders › </span>
              <span className="font-medium text-foreground">{co.co_number ?? displayTitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={cn('text-[11px]', STATUS_BADGE[status])}>
              {CO_STATUS_LABELS[status]}
            </Badge>
          </div>
        </div>
      </header>

      {/* Who's Here */}
      <COWhosHere coId={coId} role={role} activeTab="detail" />

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-24 md:pb-4">
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
          {/* Header strip */}
          <COHeaderStrip co={co} role={role} myOrgName={myOrgName} />

          {/* KPI strip */}
          <COKPIStrip co={co} isGC={isGC} isTC={isTC} isFC={isFC} financials={financials} />

          {/* Hero block */}
          <COHeroBlock
            co={co}
            isGC={isGC}
            isTC={isTC}
            isFC={isFC}
            financials={financials}
            fcCollabName={fcCollabName}
            onAction={handleHeroAction}
          />

          {/* FC Hour Entry (inline, shown when hero "Log hours" tapped) */}
          {isFC && showHourEntry && firstLineItem && canEdit && !nteBlocked && (
            <COHourEntryInline
              coId={co.id}
              lineItemId={firstLineItem.id}
              orgId={myOrgId}
              pricingType={pricingType}
              nteCap={co.nte_cap}
              nteUsed={financials.laborTotal}
              onSaved={() => { setShowHourEntry(false); refreshDetail(); }}
            />
          )}

          {/* Contextual alert */}
          <COContextualAlert
            co={co}
            isGC={isGC}
            isTC={isTC}
            isFC={isFC}
            fcCollabName={fcCollabName}
            financials={financials}
          />

          {/* Two-column layout */}
          <div className="flex gap-4">
            {/* Left: main content */}
            <div className="flex-1 min-w-0 space-y-3" ref={pricingRef}>
              {mainContent}
            </div>

            {/* Right sidebar — desktop only */}
            {!isMobile && (
              <div className="w-[300px] shrink-0 space-y-3">
                <COSidebar
                  co={co}
                  isGC={isGC}
                  isTC={isTC}
                  isFC={isFC}
                  role={role}
                  myOrgId={myOrgId}
                  projectId={projectId}
                  financials={financials}
                  collaborators={collaborators}
                  fcOrgOptions={fcOrgOptions}
                  fcCollabName={fcCollabName}
                  canEdit={canEdit}
                  canRequestFCInput={canRequestFCInput}
                  canCompleteFCInput={canCompleteFCInput}
                  nteLog={nteLog}
                  requestFCInput={requestFCInput}
                  completeFCInput={completeFCInput}
                  requestNTEIncrease={requestNTEIncrease}
                  approveNTEIncrease={approveNTEIncrease}
                  rejectNTEIncrease={rejectNTEIncrease}
                  onRefresh={refreshDetail}
                />
              </div>
            )}
          </div>

          {/* Mobile: sidebar content stacks below */}
          {isMobile && (
            <COSidebar
              co={co}
              isGC={isGC}
              isTC={isTC}
              isFC={isFC}
              role={role}
              myOrgId={myOrgId}
              projectId={projectId}
              financials={financials}
              collaborators={collaborators}
              fcOrgOptions={fcOrgOptions}
              fcCollabName={fcCollabName}
              canEdit={canEdit}
              canRequestFCInput={canRequestFCInput}
              canCompleteFCInput={canCompleteFCInput}
              nteLog={nteLog}
              requestFCInput={requestFCInput}
              completeFCInput={completeFCInput}
              requestNTEIncrease={requestNTEIncrease}
              approveNTEIncrease={approveNTEIncrease}
              rejectNTEIncrease={rejectNTEIncrease}
              onRefresh={refreshDetail}
            />
          )}
        </div>
      </div>

      {/* Sticky footer — mobile only */}
      <COStickyFooter
        status={status}
        isGC={isGC}
        isTC={isTC}
        isFC={isFC}
        financials={financials}
        fcCollabName={fcCollabName}
        onAction={handleHeroAction}
      />
    </div>
  );
}

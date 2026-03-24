import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronDown, ChevronUp, MapPin, Send, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useChangeOrderDetail } from '@/hooks/useChangeOrderDetail';
import { useCORealtime } from '@/hooks/useCORealtime';
import { useCORoleContext } from '@/hooks/useCORoleContext';
import { COContextualAlert } from './COContextualAlert';
import { GCApprovalCard } from './GCApprovalCard';
import { InlineHourEntry } from './InlineHourEntry';
import { COActivityFeed } from './COActivityFeed';
import { CO_STATUS_LABELS, CO_REASON_LABELS } from '@/types/changeOrder';
import type { COStatus, COReasonCode } from '@/types/changeOrder';
import { Loader2 } from 'lucide-react';

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

export function COJobTicket() {
  const { projectId, coId } = useParams<{ projectId: string; coId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    co, collaborators, lineItems, laborEntries, materials, equipment,
    activity, financials, isLoading,
  } = useChangeOrderDetail(coId ?? null);
  useCORealtime(coId ?? null);

  const {
    isGC, isTC, isFC, role, myOrgId, myOrgName,
    canEdit, nteBlocked, pricingType, fcCollabName,
  } = useCORoleContext(co ?? null, collaborators, financials);

  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['hours']));
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  function toggleSection(key: string) {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function refreshDetail() {
    queryClient.invalidateQueries({ queryKey: ['co-detail', coId] });
    queryClient.invalidateQueries({ queryKey: ['change-orders', projectId] });
  }

  async function handleSendComment() {
    if (!comment.trim() || !user || !co) return;
    setSendingComment(true);
    try {
      await supabase.from('co_activity').insert({
        co_id: co.id,
        project_id: projectId!,
        actor_user_id: user.id,
        actor_role: role,
        action: 'comment',
        detail: comment.trim(),
      });
      setComment('');
      refreshDetail();
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setSendingComment(false);
    }
  }

  if (isLoading || !co) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const status = co.status as COStatus;
  const displayTitle = co.title ?? co.co_number ?? 'Change Order';
  const firstLineItem = lineItems[0];

  // Sticky button config
  const stickyButton = getStickyButtonConfig(status, isGC, isTC, isFC, financials, fcCollabName);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => navigate(`/project/${projectId}/change-orders`)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <p className="text-[11px] font-mono text-muted-foreground">{co.co_number ?? '—'}</p>
                <h1 className="text-base font-semibold text-foreground truncate">{displayTitle}</h1>
              </div>
            </div>
            <Badge variant="outline" className={cn('text-[11px] shrink-0', STATUS_BADGE[status])}>
              {CO_STATUS_LABELS[status]}
            </Badge>
          </div>

          {co.location_tag && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{co.location_tag}</span>
            </div>
          )}
        </div>

        {/* Contextual alert */}
        <div className="px-4 pb-3">
          <COContextualAlert
            co={co}
            isGC={isGC}
            isTC={isTC}
            isFC={isFC}
            tcName={myOrgName}
            fcCollabName={fcCollabName}
            financials={financials}
          />
        </div>
      </header>

      {/* GC Approval Card */}
      {isGC && status === 'submitted' && (
        <div className="px-4 pt-4">
          <GCApprovalCard
            co={co}
            financials={financials}
            projectId={projectId!}
            onRefresh={refreshDetail}
          />
        </div>
      )}

      {/* Accordion sections */}
      <div className="flex-1 px-4 py-4 space-y-2 pb-28">
        {/* Section 1 — What's the job */}
        <Collapsible open={openSections.has('job')} onOpenChange={() => toggleSection('job')}>
          <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card min-h-[56px]">
            <div className="flex items-center gap-3">
              <span className="text-lg">📋</span>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">What's the job</p>
                <p className="text-xs text-muted-foreground">
                  {lineItems.length} scope item{lineItems.length !== 1 ? 's' : ''}
                  {co.reason ? ` · ${CO_REASON_LABELS[co.reason as COReasonCode] ?? co.reason}` : ''}
                </p>
              </div>
            </div>
            {openSections.has('job') ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 py-3 space-y-3">
            {co.reason_note && (
              <p className="text-sm text-foreground">{co.reason_note}</p>
            )}
            {co.reason && (
              <Badge variant="secondary" className="text-xs">
                {CO_REASON_LABELS[co.reason as COReasonCode] ?? co.reason}
              </Badge>
            )}
            {lineItems.length > 0 && (
              <div className="space-y-1">
                {lineItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2 py-1.5 text-sm">
                    <span className="text-muted-foreground">•</span>
                    <span className="text-foreground">{item.item_name}</span>
                    {item.qty && <span className="text-muted-foreground text-xs">×{item.qty}</span>}
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Section 2 — Hours */}
        <Collapsible open={openSections.has('hours')} onOpenChange={() => toggleSection('hours')}>
          <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card min-h-[56px]">
            <div className="flex items-center gap-3">
              <span className="text-lg">⏱️</span>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">
                  {isFC ? 'My hours' : isTC ? 'Labor & pricing' : 'Cost breakdown'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isFC
                    ? (financials.fcTotalHours > 0 ? `${financials.fcTotalHours} hrs logged` : 'Not yet logged')
                    : isTC
                    ? (financials.fcTotalHours > 0 ? `FC: ${financials.fcTotalHours} hrs` : 'No FC hours')
                    : (financials.tcBillableToGC > 0 ? fmtCurrency(financials.tcBillableToGC) : 'Pending')}
                </p>
              </div>
            </div>
            {openSections.has('hours') ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="py-2">
            {isFC && firstLineItem && canEdit && !nteBlocked && (
              <InlineHourEntry
                coId={co.id}
                lineItemId={firstLineItem.id}
                orgId={myOrgId}
                role="FC"
                isFC={true}
                pricingType={pricingType}
                nteCap={co.nte_cap}
                nteUsed={financials.laborTotal}
                onSaved={refreshDetail}
              />
            )}

            {isTC && (
              <div className="space-y-2 px-1">
                {financials.fcTotalHours > 0 && (
                  <div className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground">FC hours</span>
                    <span className="font-medium">{financials.fcTotalHours} hrs</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Billable to GC</span>
                  <span className="font-semibold">{fmtCurrency(financials.tcBillableToGC)}</span>
                </div>
                {financials.materialsTotal > 0 && (
                  <div className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground">Materials</span>
                    <span className="font-medium">{fmtCurrency(financials.materialsTotal)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm px-3 py-2 rounded-lg border border-border">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-foreground">{fmtCurrency(financials.grandTotal)}</span>
                </div>
              </div>
            )}

            {isGC && (
              <div className="space-y-2 px-1">
                <div className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Labor</span>
                  <span className="font-medium">{fmtCurrency(financials.tcBillableToGC)}</span>
                </div>
                {financials.materialsTotal > 0 && (
                  <div className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground">Materials</span>
                    <span className="font-medium">{fmtCurrency(financials.materialsTotal)}</span>
                  </div>
                )}
                {financials.equipmentTotal > 0 && (
                  <div className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground">Equipment</span>
                    <span className="font-medium">{fmtCurrency(financials.equipmentTotal)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm px-3 py-2 rounded-lg border border-border">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-foreground">
                    {fmtCurrency(financials.tcBillableToGC + financials.materialsTotal + financials.equipmentTotal)}
                  </span>
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Section 3 — Materials */}
        {(materials.length > 0 || co.materials_needed) && (
          <Collapsible open={openSections.has('materials')} onOpenChange={() => toggleSection('materials')}>
            <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card min-h-[56px]">
              <div className="flex items-center gap-3">
                <span className="text-lg">🧱</span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Materials</p>
                  <p className="text-xs text-muted-foreground">
                    {materials.length} item{materials.length !== 1 ? 's' : ''}
                    {!isFC && financials.materialsTotal > 0 ? ` · ${fmtCurrency(financials.materialsTotal)}` : ''}
                  </p>
                </div>
              </div>
              {openSections.has('materials') ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="py-2 px-1 space-y-1">
              {materials.map(m => (
                <div key={m.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-foreground">{m.description}</p>
                    <p className="text-xs text-muted-foreground">{m.quantity} {m.uom}</p>
                  </div>
                  {!isFC && <span className="font-medium text-foreground">{fmtCurrency(m.billed_amount)}</span>}
                </div>
              ))}
              {materials.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No materials added</p>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Section 4 — Activity */}
        <Collapsible open={openSections.has('activity')} onOpenChange={() => toggleSection('activity')}>
          <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card min-h-[56px]">
            <div className="flex items-center gap-3">
              <span className="text-lg">💬</span>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Activity</p>
                <p className="text-xs text-muted-foreground">{activity.length} event{activity.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {openSections.has('activity') ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="py-2">
            <COActivityFeed activity={activity} />
            {/* Comment input */}
            <div className="flex items-center gap-2 pt-3 mt-3 border-t border-border">
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
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Sticky action button */}
      {stickyButton && (
        <div className="fixed bottom-0 left-0 right-0 z-30 px-4 py-3 bg-background/95 backdrop-blur border-t border-border safe-area-bottom">
          <Button
            className={cn('w-full h-12 text-sm font-semibold rounded-xl gap-2', stickyButton.className)}
            disabled={stickyButton.disabled}
            onClick={stickyButton.onClick ?? (() => {})}
          >
            {stickyButton.label}
          </Button>
        </div>
      )}
    </div>
  );
}

interface StickyButtonConfig {
  label: string;
  className: string;
  disabled: boolean;
  onClick?: () => void;
}

function getStickyButtonConfig(
  status: COStatus,
  isGC: boolean,
  isTC: boolean,
  isFC: boolean,
  financials: any,
  fcCollabName: string,
): StickyButtonConfig | null {
  if (isFC) {
    if (status === 'draft' && financials.fcTotalHours === 0) {
      return { label: 'Submit this CO to TC', className: 'bg-secondary text-secondary-foreground hover:bg-secondary/90', disabled: false };
    }
    if (status === 'draft' && financials.fcTotalHours > 0) {
      return { label: `Submit ${financials.fcTotalHours} hrs to TC`, className: 'bg-emerald-600 hover:bg-emerald-700 text-white', disabled: false };
    }
    if (status === 'submitted' || status === 'closed_for_pricing') {
      return { label: 'Waiting on TC pricing', className: 'bg-muted text-muted-foreground', disabled: true };
    }
  }

  if (isTC) {
    if (['shared', 'work_in_progress'].includes(status)) {
      return { label: `Request hours from ${fcCollabName}`, className: 'bg-secondary text-secondary-foreground hover:bg-secondary/90', disabled: false };
    }
    if (status === 'closed_for_pricing' && financials.fcTotalHours > 0) {
      return { label: 'Price this CO', className: 'bg-primary text-primary-foreground hover:bg-primary/90', disabled: false };
    }
    if (status === 'closed_for_pricing') {
      return { label: `Submit ${fmtCurrency(financials.grandTotal)} to GC`, className: 'bg-secondary text-secondary-foreground hover:bg-secondary/90', disabled: false };
    }
    if (status === 'submitted') {
      return { label: 'Waiting on GC approval', className: 'bg-muted text-muted-foreground', disabled: true };
    }
  }

  if (isGC) {
    if (status === 'submitted') {
      return { label: 'Review and approve', className: 'bg-primary text-primary-foreground hover:bg-primary/90', disabled: false };
    }
    if (status === 'approved') {
      return { label: 'Acknowledged ✓', className: 'bg-emerald-600 text-white', disabled: true };
    }
  }

  return null;
}

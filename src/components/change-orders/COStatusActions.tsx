import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Share2, Send, Check, X, RotateCcw, Loader2, Lock, CheckCircle2, ThumbsUp,
} from 'lucide-react';
import { useChangeOrderDetail } from '@/hooks/useChangeOrderDetail';
import { useChangeOrders } from '@/hooks/useChangeOrders';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { sendCONotification, buildCONotification } from '@/lib/coNotifications';
import { toast } from 'sonner';
import type { ChangeOrder, COCollaborator, COFinancials, COStatus } from '@/types/changeOrder';

interface COStatusActionsProps {
  co: ChangeOrder;
  isGC: boolean;
  isTC: boolean;
  isFC: boolean;
  currentOrgId: string;
  projectId: string;
  financials?: Pick<COFinancials, 'grandTotal' | 'laborTotal' | 'fcLaborTotal' | 'fcTotalHours' | 'fcLumpSumTotal'> | null;
  collaborators?: COCollaborator[];
  assignedOrgName?: string;
  onRefresh: () => void;
  isTM?: boolean;
}

export function COStatusActions({
  co,
  isGC,
  isTC,
  isFC,
  currentOrgId,
  projectId,
  financials,
  collaborators = [],
  assignedOrgName,
  onRefresh,
  isTM = false,
}: COStatusActionsProps) {
  const { submitCO, approveCO, rejectCO } = useChangeOrderDetail(co.id);
  const { shareCO, updateCO } = useChangeOrders(projectId);
  const { user } = useAuth();
  const actorRole = isGC ? 'GC' : isTC ? 'TC' : 'FC';

  const [acting, setActing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);

  const status = co.status as COStatus;
  const forwardsToGC = isTC && status === 'submitted' && co.created_by_role === 'FC' && co.assigned_to_org_id === currentOrgId;
  const submitAmount = isFC && co.created_by_role === 'FC'
    ? (financials?.fcLaborTotal ?? 0)
    : (financials?.grandTotal ?? 0);

  async function logActivity(action: string, detail?: string, amount?: number) {
    if (!user) return;

    await supabase.from('co_activity').insert({
      co_id: co.id,
      project_id: projectId,
      actor_user_id: user.id,
      actor_role: actorRole,
      action,
      detail: detail ?? null,
      amount: amount ?? null,
    });
  }

  async function notifyOrg(targetOrgId: string | null, type: string, amount?: number) {
    if (!targetOrgId) return;

    try {
      const { data: members } = await supabase
        .from('user_org_roles')
        .select('user_id')
        .eq('organization_id', targetOrgId)
        .limit(10);

      if (!members || members.length === 0) return;

      const { title, body } = buildCONotification(type, co.title, amount);
      // Exclude the actor from receiving their own notification
      const recipients = members.filter(m => m.user_id !== user?.id);
      await Promise.allSettled(
        recipients.map(member =>
          sendCONotification({
            recipient_user_id: member.user_id,
            recipient_org_id: targetOrgId,
            co_id: co.id,
            project_id: projectId,
            type,
            title,
            body,
            amount,
          })
        )
      );
    } catch (err) {
      console.warn('Failed to notify org:', err);
    }
  }

  async function notifyAllCOParties(type: string, amount?: number) {
    const orgIds = new Set<string>();
    if (co.org_id) orgIds.add(co.org_id);
    if (co.assigned_to_org_id) orgIds.add(co.assigned_to_org_id);
    for (const c of collaborators) {
      if (c.status === 'active') orgIds.add(c.organization_id);
    }
    orgIds.delete(currentOrgId);
    await Promise.allSettled([...orgIds].map(oid => notifyOrg(oid, type, amount)));
  }

  async function doShare() {
    setActing(true);
    try {
      await shareCO.mutateAsync(co.id);
      toast.success('CO shared');
      await logActivity('shared');
      await notifyOrg(co.assigned_to_org_id, 'CO_SHARED');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to share');
    } finally {
      setActing(false);
    }
  }

  async function doSubmitToWIP() {
    if (!co.assigned_to_org_id) {
      toast.error('Assign a TC before submitting.');
      return;
    }
    setActing(true);
    try {
      await updateCO.mutateAsync({
        id: co.id,
        updates: {
          status: 'work_in_progress',
          shared_at: new Date().toISOString(),
          draft_shared_with_next: true,
        },
      });
      toast.success('CO sent to TC as Work in Progress');
      await logActivity('sent_to_wip');
      await notifyOrg(co.assigned_to_org_id, 'CO_SHARED');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed');
    } finally {
      setActing(false);
    }
  }

  async function doCloseForPricing() {
    setActing(true);
    try {
      await updateCO.mutateAsync({
        id: co.id,
        updates: {
          status: 'closed_for_pricing',
          closed_for_pricing_at: new Date().toISOString(),
        },
      });
      toast.success('CO closed for final pricing');
      await logActivity('closed_for_pricing');
      await notifyAllCOParties('CO_CLOSED_FOR_PRICING');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed');
    } finally {
      setActing(false);
    }
  }

  async function doSubmit() {
    if (!co.assigned_to_org_id) {
      toast.error('This CO has no assigned party. Assign a TC or GC before submitting.');
      return;
    }

    setActing(true);
    try {
      // Snapshot TC rates if toggle is ON
      if (isTC && co.use_fc_pricing_base) {
        const { data: settings } = await supabase
          .from('org_settings')
          .select('default_hourly_rate, labor_markup_percent')
          .eq('organization_id', currentOrgId)
          .maybeSingle();

        const rate = settings?.default_hourly_rate ?? 0;
        const markup = settings?.labor_markup_percent ?? 0;
        const isHourly = co.pricing_type === 'tm' || co.pricing_type === 'nte';
        const calcPrice = isHourly
          ? (financials?.fcTotalHours ?? 0) * rate
          : (financials?.fcLumpSumTotal ?? 0) * (1 + markup / 100);

        await supabase
          .from('change_orders')
          .update({
            tc_snapshot_hourly_rate: rate,
            tc_snapshot_markup_percent: markup,
            tc_submitted_price: calcPrice,
          })
          .eq('id', co.id);
      } else if (isTC) {
        // Toggle OFF — snapshot manual total
        await supabase
          .from('change_orders')
          .update({
            tc_submitted_price: financials?.grandTotal ?? 0,
          })
          .eq('id', co.id);
      }

      await submitCO.mutateAsync(co.id);
      toast.success('CO submitted for approval');
      await logActivity('submitted', undefined, submitAmount || undefined);
      await notifyOrg(co.assigned_to_org_id, 'CHANGE_SUBMITTED', submitAmount || undefined);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to submit');
    } finally {
      setActing(false);
    }
  }

  async function doApprove() {
    setActing(true);
    try {
      if (forwardsToGC) {
        const { data, error } = await supabase.rpc('forward_change_order_to_upstream_gc', {
          _co_id: co.id,
        });

        if (error) throw error;

        const forwarded = Array.isArray(data) ? data[0] : data;
        const nextOrgId = forwarded?.assigned_to_org_id ?? null;

        toast.success('FC scope approved and sent to GC');
        await logActivity('approved_fc', undefined, financials?.fcLaborTotal || undefined);
        await logActivity('forwarded_to_gc', undefined, financials?.grandTotal || undefined);
        await notifyOrg(nextOrgId, 'CHANGE_SUBMITTED', financials?.grandTotal || undefined);
      } else {
        await approveCO.mutateAsync(co.id);
        // Contract sum is now updated automatically via the apply_co_contract_delta DB trigger.
        // The trigger reverses the delta on rejection/recall and re-applies on re-approval, so the
        // contract is always derived from the current set of approved COs.
        toast.success('CO approved');
        await logActivity('approved', undefined, financials?.grandTotal || undefined);
        await notifyAllCOParties('CHANGE_APPROVED', financials?.grandTotal || undefined);
      }

      setApproveOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to approve');
    } finally {
      setActing(false);
    }
  }

  async function doReject() {
    if (!rejectNote.trim()) return;

    setActing(true);
    try {
      await rejectCO.mutateAsync({ coId: co.id, note: rejectNote.trim() });
      toast.success('CO rejected');
      await logActivity('rejected', rejectNote.trim());
      await notifyAllCOParties('CHANGE_REJECTED');
      setRejectOpen(false);
      setRejectNote('');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to reject');
    } finally {
      setActing(false);
    }
  }

  async function doRecall() {
    setActing(true);
    try {
      await updateCO.mutateAsync({
        id: co.id,
        updates: {
          status: 'draft',
          submitted_at: null,
          shared_at: null,
          draft_shared_with_next: false,
        },
      });
      toast.success('CO recalled');
      await logActivity('recalled');
      await notifyOrg(co.assigned_to_org_id, 'CO_RECALLED');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to recall');
    } finally {
      setActing(false);
    }
  }

  async function doMarkCompleted() {
    setActing(true);
    try {
      await updateCO.mutateAsync({
        id: co.id,
        updates: { completed_at: new Date().toISOString() },
      });
      toast.success('CO marked as completed');
      await logActivity('marked_completed');
      await notifyOrg(co.org_id, 'CO_COMPLETED');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed');
    } finally {
      setActing(false);
    }
  }

  async function doAcknowledgeCompletion() {
    setActing(true);
    try {
      await updateCO.mutateAsync({
        id: co.id,
        updates: { completion_acknowledged_at: new Date().toISOString() },
      });
      toast.success('Completion acknowledged — TC can now invoice');
      await logActivity('acknowledged_completion');
      await notifyOrg(co.assigned_to_org_id, 'CO_ACKNOWLEDGED');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed');
    } finally {
      setActing(false);
    }
  }

  const isCreator = co.created_by_user_id === user?.id;
  const isActiveCollaborator = collaborators.some(c => c.organization_id === currentOrgId && c.status === 'active');
  const isAnyCollaborator = collaborators.some(c => c.organization_id === currentOrgId);

  /* Draft actions — suppress Share when Send-to-WIP is available (M5) */
  const canSendToWIP = isGC && isCreator && status === 'draft' && !!co.assigned_to_org_id;
  const canShare = isCreator && status === 'draft' && !co.draft_shared_with_next && !canSendToWIP && !!co.assigned_to_org_id;
  /* GC can close for pricing (Flow 1) */
  const canCloseForPricing = isGC && (status === 'work_in_progress') && (co.org_id === currentOrgId || co.created_by_user_id === user?.id);
  /* TC/FC submit for approval — include 'rejected' (C3). FC collaborators (any status) should NOT see primary submit.
     Bug fix: assigned org (not owner) cannot submit from 'draft' — GC must first send to WIP. */
  const isOwnerOrg = co.org_id === currentOrgId;
  const submitStatuses = isOwnerOrg
    ? ['draft', 'shared', 'work_in_progress', 'closed_for_pricing', 'rejected']
    : ['shared', 'work_in_progress', 'closed_for_pricing', 'rejected'];
  const canSubmit = (isTC || isFC) && !isAnyCollaborator && submitStatuses.includes(status) && !!co.assigned_to_org_id;
  /* FC collaborator can submit pricing independently (M4) */
  const canSubmitFCPricing = isFC && isActiveCollaborator && status === 'closed_for_pricing';
  const canRecall = (isTC || isFC) && !isAnyCollaborator && status === 'submitted';
  /* GC approves using org_id (creating org) not assigned_to_org_id (C2) */
  const canApprove = ((isGC && status === 'submitted' && co.org_id === currentOrgId) || forwardsToGC) && !isActiveCollaborator;
  const canReject = canApprove;
  /* Flow 2 completion */
  const isApproved = status === 'approved';
  const canMarkCompleted = isTC && isApproved && !co.completed_at;
  const canAcknowledge = isGC && isApproved && !!co.completed_at && !co.completion_acknowledged_at;
  const isContracted = status === 'contracted';

  if (isContracted) {
    return (
      <div className="co-light-shell px-4 py-3 flex items-center gap-2">
        <Check className="h-4 w-4 co-light-success-text" />
        <span className="text-sm font-medium text-foreground">
          Contracted — TC can now invoice
        </span>
      </div>
    );
  }

  if (isApproved && co.completion_acknowledged_at) {
    return (
      <div className="co-light-shell px-4 py-3 flex items-center gap-2">
        <Check className="h-4 w-4 co-light-success-text" />
        <span className="text-sm font-medium text-foreground">
          Approved & acknowledged — ready for invoicing
        </span>
      </div>
    );
  }

  if (status === 'rejected' && co.rejection_note) {
    return (
      <div className="co-light-shell border-destructive/30 bg-destructive/5 px-4 py-3 space-y-2">
        <p className="text-sm font-semibold text-destructive">Rejected</p>
        <p className="text-xs text-muted-foreground">{co.rejection_note}</p>
        {(canSubmit || canSubmitFCPricing) && (
          <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={doSubmit} disabled={acting}>
            {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Resubmit
          </Button>
        )}
      </div>
    );
  }

  const hasAnyAction = canShare || canSendToWIP || canCloseForPricing || canSubmit || canSubmitFCPricing || canRecall || canApprove || canReject || canMarkCompleted || canAcknowledge;

  if (!hasAnyAction) {
    if (isApproved) {
      return (
        <div className="co-light-shell px-4 py-3 flex items-center gap-2">
          <Check className="h-4 w-4 co-light-success-text" />
          <span className="text-sm font-medium text-foreground">Approved</span>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      <div className="co-light-shell overflow-hidden">
        <div className="px-4 py-3 border-b border-border co-light-header">
          <h3 className="text-sm font-semibold text-foreground">Actions</h3>
        </div>
        <div className="px-4 py-3 space-y-2">
          {canShare && (
            <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1" onClick={doShare} disabled={acting}>
              {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Share2 className="h-3 w-3" />}
              Share with {co.assigned_to_org_id ? 'assigned party' : 'next party'}
            </Button>
          )}
          {canSendToWIP && (
            <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={doSubmitToWIP} disabled={acting}>
              {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Send to {assignedOrgName ?? 'TC'} (Work in Progress)
            </Button>
          )}
          {canCloseForPricing && (
            <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={doCloseForPricing} disabled={acting}>
              {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Lock className="h-3 w-3" />}
              Close CO for Final Pricing
            </Button>
          )}
          {(canSubmit || canSubmitFCPricing) && (
            <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={doSubmit} disabled={acting}>
              {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              {canSubmitFCPricing ? 'Submit FC pricing' : 'Submit for approval'}
            </Button>
          )}
          {canRecall && (
            <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1" onClick={doRecall} disabled={acting}>
              {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
              Recall submission
            </Button>
          )}
          {canApprove && (
            <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={() => setApproveOpen(true)} disabled={acting}>
              <Check className="h-3 w-3" />
              {forwardsToGC ? 'Approve & send to GC' : 'Approve'}
            </Button>
          )}
          {canReject && (
            <Button variant="destructive" size="sm" className="w-full h-8 text-xs gap-1" onClick={() => setRejectOpen(true)} disabled={acting}>
              <X className="h-3 w-3" />
              Reject
            </Button>
          )}
          {canMarkCompleted && (
            <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1" onClick={doMarkCompleted} disabled={acting}>
              {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Mark Work Completed
            </Button>
          )}
          {canAcknowledge && (
            <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={doAcknowledgeCompletion} disabled={acting}>
              {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className="h-3 w-3" />}
              Acknowledge Completion
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{forwardsToGC ? 'Approve FC scope and send to GC' : (isTM ? 'Approve work order' : 'Approve change order')}</AlertDialogTitle>
            <AlertDialogDescription>
              {forwardsToGC
                ? `This approves the FC portion as TC cost and immediately forwards the ${isTM ? 'work order' : 'change order'} to GC review.`
                : `Are you sure you want to approve this ${isTM ? 'work order' : 'change order'}?`}
              {!forwardsToGC && co.pricing_type === 'fixed' && (
                <span className="block mt-1">
                  The TC will be able to submit an invoice once approved.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doApprove} disabled={acting}>
              {acting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {forwardsToGC ? 'Approve & send to GC' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isTM ? 'Reject work order' : 'Reject change order'}</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason. The submitter will see this note and can revise and resubmit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="reject-note">Reason *</Label>
            <Textarea
              id="reject-note"
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder={isTM ? "Explain why this WO is being rejected…" : "Explain why this CO is being rejected…"}
              rows={3}
              className="mt-1.5 resize-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={doReject}
              disabled={acting || !rejectNote.trim()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {acting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

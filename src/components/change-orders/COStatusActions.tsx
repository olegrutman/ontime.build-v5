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
  Share2, Send, Check, X, RotateCcw, Loader2,
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
  financials?: Pick<COFinancials, 'grandTotal' | 'fcLaborTotal'> | null;
  collaborators?: COCollaborator[];
  onRefresh: () => void;
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
  onRefresh,
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
      await Promise.allSettled(
        members.map(member =>
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

  async function doSubmit() {
    if (!co.assigned_to_org_id) {
      toast.error('This CO has no assigned party. Assign a TC or GC before submitting.');
      return;
    }

    setActing(true);
    try {
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
        toast.success('CO approved');
        await logActivity('approved', undefined, financials?.grandTotal || undefined);
        await notifyOrg(co.org_id, 'CHANGE_APPROVED', financials?.grandTotal || undefined);
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
      await notifyOrg(co.org_id, 'CHANGE_REJECTED');
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
        updates: { status: 'draft', submitted_at: null },
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

  const isCreator = co.created_by_user_id === user?.id;
  const isCollaborator = collaborators.some(collaborator => collaborator.organization_id === currentOrgId && collaborator.status === 'active');
  const canShare = isCreator && status === 'draft' && !co.draft_shared_with_next;
  const canSubmit = (isTC || isFC) && !isCollaborator && (status === 'draft' || status === 'shared');
  const canRecall = (isTC || isFC) && !isCollaborator && status === 'submitted';
  const canApprove = ((isGC && status === 'submitted' && co.assigned_to_org_id === currentOrgId) || forwardsToGC) && !isCollaborator;
  const canReject = canApprove;
  const isContracted = status === 'contracted';
  const isApproved = status === 'approved';

  if (isContracted || isApproved) {
    return (
      <div className="co-light-shell px-4 py-3 flex items-center gap-2">
        <Check className="h-4 w-4 co-light-success-text" />
        <span className="text-sm font-medium text-foreground">
          {isContracted ? 'Contracted — TC can now invoice' : 'Approved'}
        </span>
      </div>
    );
  }

  if (status === 'rejected' && co.rejection_note) {
    return (
      <div className="co-light-shell border-destructive/30 bg-destructive/5 px-4 py-3 space-y-2">
        <p className="text-sm font-semibold text-destructive">Rejected</p>
        <p className="text-xs text-muted-foreground">{co.rejection_note}</p>
        {canSubmit && (
          <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={doSubmit} disabled={acting}>
            {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Resubmit
          </Button>
        )}
      </div>
    );
  }

  if (!canShare && !canSubmit && !canRecall && !canApprove && !canReject) {
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
          {canSubmit && (
            <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={doSubmit} disabled={acting}>
              {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Submit for approval
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
        </div>
      </div>

      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{forwardsToGC ? 'Approve FC scope and send to GC' : 'Approve change order'}</AlertDialogTitle>
            <AlertDialogDescription>
              {forwardsToGC
                ? 'This approves the FC portion as TC cost and immediately forwards the change order to GC review.'
                : 'Are you sure you want to approve this change order?'}
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
            <AlertDialogTitle>Reject change order</AlertDialogTitle>
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
              placeholder="Explain why this CO is being rejected…"
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

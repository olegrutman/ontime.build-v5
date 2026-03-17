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
import { toast } from 'sonner';
import type { ChangeOrder, COStatus } from '@/types/changeOrder';
import { cn } from '@/lib/utils';

interface COStatusActionsProps {
  co:        ChangeOrder;
  isGC:      boolean;
  isTC:      boolean;
  isFC:      boolean;
  projectId: string;
  onRefresh: () => void;
}

export function COStatusActions({
  co,
  isGC,
  isTC,
  isFC,
  projectId,
  onRefresh,
}: COStatusActionsProps) {
  const { submitCO, approveCO, rejectCO } = useChangeOrderDetail(co.id);
  const { shareCO, updateCO }             = useChangeOrders(projectId);
  const { user } = useAuth();
  const actorRole = isGC ? 'GC' : isTC ? 'TC' : 'FC';

  const [acting, setActing]           = useState(false);
  const [rejectOpen, setRejectOpen]   = useState(false);
  const [rejectNote, setRejectNote]   = useState('');
  const [approveOpen, setApproveOpen] = useState(false);

  const status = co.status as COStatus;

  async function logActivity(action: string, detail?: string, amount?: number) {
    if (!user) return;
    await supabase.from('co_activity').insert({
      co_id:         co.id,
      project_id:    projectId,
      actor_user_id: user.id,
      actor_role:    actorRole,
      action,
      detail:        detail ?? null,
      amount:        amount ?? null,
    });
  }

  async function doShare() {
    setActing(true);
    try {
      await shareCO.mutateAsync(co.id);
      toast.success('CO shared');
      await logActivity('shared');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to share');
    } finally {
      setActing(false);
    }
  }

  async function doSubmit() {
    setActing(true);
    try {
      await submitCO.mutateAsync(co.id);
      toast.success('CO submitted for approval');
      await logActivity('submitted');
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
      await approveCO.mutateAsync(co.id);
      toast.success('CO approved');
      await logActivity('approved');
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
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to recall');
    } finally {
      setActing(false);
    }
  }

  const isCreator  = co.created_by_role === (isGC ? 'GC' : isTC ? 'TC' : 'FC');
  const canShare   = isCreator && status === 'draft' && !co.draft_shared_with_next;
  const canSubmit  = (isTC || isFC) && (status === 'draft' || status === 'shared' || status === 'combined');
  const canRecall  = (isTC || isFC) && status === 'submitted';
  const canApprove = (isGC && status === 'submitted') || (isTC && status === 'submitted' && co.created_by_role === 'FC');
  const canReject  = canApprove;
  const isContracted = status === 'contracted';
  const isApproved   = status === 'approved';

  if (isContracted || isApproved) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-2">
        <Check className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium text-foreground">
          {isContracted ? 'Contracted — TC can now invoice' : 'Approved'}
        </span>
      </div>
    );
  }

  if (status === 'rejected' && co.rejection_note) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 space-y-2">
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

  if (!canShare && !canSubmit && !canRecall && !canApprove) {
    return null;
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-card">
        <div className="px-4 py-3 border-b border-border">
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
            <Button size="sm" className="w-full h-8 text-xs gap-1 bg-green-600 hover:bg-green-700" onClick={() => setApproveOpen(true)} disabled={acting}>
              <Check className="h-3 w-3" />
              Approve
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
            <AlertDialogTitle>Approve change order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this change order?
              {co.pricing_type === 'fixed' && (
                <span className="block mt-1">
                  The TC will be able to submit an invoice once approved.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doApprove} disabled={acting} className="bg-green-600 hover:bg-green-700">
              {acting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Approve
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

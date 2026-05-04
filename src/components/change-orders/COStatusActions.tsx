import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { VoiceInputButton } from '@/components/VoiceInputButton';
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
  Share2, Send, Check, X, RotateCcw, Loader2, Lock, CheckCircle2, ThumbsUp, Trash2, AlertTriangle,
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
  financials?: Pick<COFinancials, 'grandTotal' | 'laborTotal' | 'fcLaborTotal' | 'fcTotalHours' | 'fcLumpSumTotal' | 'materialsTotal' | 'equipmentTotal'> | null;
  collaborators?: COCollaborator[];
  assignedOrgName?: string;
  onRefresh: () => void;
  lineItemCount?: number;
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
  lineItemCount = 0,
}: COStatusActionsProps) {
  const { submitCO, approveCO, rejectCO } = useChangeOrderDetail(co.id);
  const { shareCO, updateCO } = useChangeOrders(projectId);
  const { user } = useAuth();
  const actorRole = isGC ? 'GC' : isTC ? 'TC' : 'FC';

  const [acting, setActing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [backchargeOrgId, setBackchargeOrgId] = useState<string>('');
  const [backchargeAmount, setBackchargeAmount] = useState('');
  const [backchargeNote, setBackchargeNote] = useState('');
  const [projectParticipants, setProjectParticipants] = useState<Array<{ org_id: string; org_name: string }>>([]);

  const isDamagedByOthers = co.reason === 'damaged_by_others';

  // Fetch project participants when needed for backcharge dialog
  useEffect(() => {
    if (!isDamagedByOthers || !isGC) return;
    supabase
      .from('project_participants')
      .select('organization_id, organizations:organization_id(id, name)')
      .eq('project_id', projectId)
      .then(({ data }) => {
        if (data) {
          const participants = data
            .map((p: any) => ({ org_id: p.organization_id, org_name: p.organizations?.name ?? 'Unknown' }))
            .filter((p: any) => p.org_id !== currentOrgId);
          setProjectParticipants(participants);
        }
      });
  }, [isDamagedByOthers, isGC, projectId, currentOrgId]);

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
    if (lineItemCount === 0) {
      toast.error('Add at least one scope item before submitting.');
      return;
    }

    setActing(true);
    try {
      // Snapshot tax settings from project
      const { data: projTax } = await supabase
        .from('projects')
        .select('sales_tax_rate, labor_taxable')
        .eq('id', projectId)
        .single();

      const taxSnapshot: Record<string, any> = {};
      if (projTax) {
        taxSnapshot.tax_rate_snapshot = projTax.sales_tax_rate ?? 0;
        taxSnapshot.labor_taxable_snapshot = projTax.labor_taxable ?? false;
        // Compute tax amounts
        const rate = (projTax.sales_tax_rate ?? 0) / 100;
        taxSnapshot.materials_tax = (financials?.materialsTotal ?? 0) * rate;
        taxSnapshot.labor_tax = projTax.labor_taxable ? (financials?.laborTotal ?? 0) * rate : 0;
        taxSnapshot.equipment_tax = (financials?.equipmentTotal ?? 0) * rate;
        taxSnapshot.total_tax = (taxSnapshot.materials_tax ?? 0) + (taxSnapshot.labor_tax ?? 0) + (taxSnapshot.equipment_tax ?? 0);
      }

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
            ...taxSnapshot,
          })
          .eq('id', co.id);
      } else if (isTC) {
        // Toggle OFF — snapshot manual total
        await supabase
          .from('change_orders')
          .update({
            tc_submitted_price: financials?.grandTotal ?? 0,
            ...taxSnapshot,
          })
          .eq('id', co.id);
      } else {
        // Non-TC submitter — still snapshot tax
        if (Object.keys(taxSnapshot).length > 0) {
          await supabase
            .from('change_orders')
            .update(taxSnapshot)
            .eq('id', co.id);
        }
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
        // Compute retainage before approving
        const { data: projRetainage } = await supabase
          .from('projects')
          .select('retainage_percent')
          .eq('id', projectId)
          .single();
        const retPct = projRetainage?.retainage_percent ?? 0;
        const grandTotalForRetainage = financials?.grandTotal ?? 0;
        const retainageAmt = grandTotalForRetainage * (retPct / 100);

        // Update retainage snapshot on approval
        if (retPct > 0) {
          await supabase
            .from('change_orders')
            .update({ retainage_amount: retainageAmt })
            .eq('id', co.id);
        }

        await approveCO.mutateAsync(co.id);
        toast.success('CO approved');
        await logActivity('approved', undefined, financials?.grandTotal || undefined);
        await notifyAllCOParties('CHANGE_APPROVED', financials?.grandTotal || undefined);

        // Auto-create backcharge for damaged_by_others COs
        if (isDamagedByOthers && user) {
          const bcAmount = parseFloat(backchargeAmount) || (financials?.grandTotal ?? 0);
          const selectedOrg = projectParticipants.find(p => p.org_id === backchargeOrgId);
          await supabase.from('backcharges').insert({
            project_id: projectId,
            source_co_id: co.id,
            responsible_org_id: backchargeOrgId || null,
            responsible_party_name: selectedOrg?.org_name ?? null,
            amount: bcAmount,
            created_by_user_id: user.id,
          });
          if (backchargeOrgId) {
            await notifyOrg(backchargeOrgId, 'BACKCHARGE_CREATED', bcAmount);
          }
          await logActivity('backcharge_created', `Backcharge of $${bcAmount.toFixed(2)} against ${selectedOrg?.org_name ?? 'TBD'}`, bcAmount);
        }
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
        updates: {
          status: 'contracted',
          completion_acknowledged_at: new Date().toISOString(),
          contracted_at: new Date().toISOString(),
        },
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

  async function doWithdraw() {
    if (!withdrawReason.trim()) return;
    setActing(true);
    try {
      await updateCO.mutateAsync({
        id: co.id,
        updates: {
          status: 'withdrawn',
          withdrawn_at: new Date().toISOString(),
          withdrawn_reason: withdrawReason.trim(),
        },
      });
      toast.success('CO withdrawn permanently');
      await logActivity('withdrawn', withdrawReason.trim());
      await notifyAllCOParties('CO_WITHDRAWN');
      setWithdrawOpen(false);
      setWithdrawReason('');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to withdraw');
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
  const isWithdrawn = status === 'withdrawn';
  /* Creator can withdraw from draft/shared/rejected */
  const canWithdraw = isCreator && ['draft', 'shared', 'rejected'].includes(status);
  if (isWithdrawn) {
    return (
      <div className="co-light-shell border-muted bg-muted/30 px-4 py-3 space-y-1">
        <p className="text-sm font-semibold text-muted-foreground">Withdrawn</p>
        {co.withdrawn_reason && <p className="text-xs text-muted-foreground">{co.withdrawn_reason}</p>}
      </div>
    );
  }

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
        <div className="flex gap-2">
          {(canSubmit || canSubmitFCPricing) && (
            <Button size="sm" className="flex-1 h-8 text-xs gap-1" onClick={doSubmit} disabled={acting}>
              {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Resubmit
            </Button>
          )}
          {canWithdraw && (
            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1 text-muted-foreground" onClick={() => setWithdrawOpen(true)} disabled={acting}>
              <Trash2 className="h-3 w-3" />
              Withdraw
            </Button>
          )}
        </div>
      </div>
    );
  }

  const hasAnyAction = canShare || canSendToWIP || canCloseForPricing || canSubmit || canSubmitFCPricing || canRecall || canApprove || canReject || canMarkCompleted || canAcknowledge || canWithdraw;

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
          {canWithdraw && (
            <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1 text-muted-foreground border-muted-foreground/30" onClick={() => setWithdrawOpen(true)} disabled={acting}>
              <Trash2 className="h-3 w-3" />
              Withdraw permanently
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={approveOpen} onOpenChange={(open) => {
        setApproveOpen(open);
        if (open && isDamagedByOthers) {
          setBackchargeAmount(String(financials?.grandTotal ?? 0));
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{forwardsToGC ? 'Approve FC scope and send to GC' : (co.document_type === 'WO' ? 'Approve work order' : 'Approve change order')}</AlertDialogTitle>
            <AlertDialogDescription>
              {forwardsToGC
                ? `This approves the FC portion as TC cost and immediately forwards the ${co.document_type === 'WO' ? 'work order' : 'change order'} to GC review.`
                : `Are you sure you want to approve this ${co.document_type === 'WO' ? 'work order' : 'change order'}?`}
              {!forwardsToGC && co.pricing_type === 'fixed' && (
                <span className="block mt-1">
                  The TC will be able to submit an invoice once approved.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Backcharge fields for damaged_by_others */}
          {isDamagedByOthers && isGC && !forwardsToGC && (
            <div className="space-y-3 py-2 border-t border-border">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                This CO is for damage caused by another trade. A backcharge will be created.
              </p>
              <div>
                <Label className="text-xs text-muted-foreground">Who is responsible?</Label>
                <select
                  value={backchargeOrgId}
                  onChange={e => setBackchargeOrgId(e.target.value)}
                  className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select responsible party...</option>
                  {projectParticipants.map(p => (
                    <option key={p.org_id} value={p.org_id}>{p.org_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Backcharge Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={backchargeAmount}
                  onChange={e => setBackchargeAmount(e.target.value)}
                  className="h-9 mt-1 font-mono"
                />
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doApprove} disabled={acting}>
              {acting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {forwardsToGC ? 'Approve & send to GC' : isDamagedByOthers && isGC ? 'Approve & Create Backcharge' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{co.document_type === 'WO' ? 'Reject work order' : 'Reject change order'}</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason. The submitter will see this note and can revise and resubmit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="reject-note">Reason *</Label>
              <VoiceInputButton onTranscript={(text) => setRejectNote(prev => prev ? prev + ' ' + text : text)} />
            </div>
            <Textarea
              id="reject-note"
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder={co.document_type === 'WO' ? "Explain why this WO is being rejected…" : "Explain why this CO is being rejected…"}
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

      <AlertDialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw {co.document_type === 'WO' ? 'work order' : 'change order'} permanently</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The {co.document_type === 'WO' ? 'work order' : 'change order'} will be permanently closed and cannot be resubmitted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="withdraw-reason">Reason *</Label>
              <VoiceInputButton onTranscript={(text) => setWithdrawReason(prev => prev ? prev + ' ' + text : text)} />
            </div>
            <Textarea
              id="withdraw-reason"
              value={withdrawReason}
              onChange={e => setWithdrawReason(e.target.value)}
              placeholder="Why is this being withdrawn?"
              rows={3}
              className="mt-1.5 resize-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={doWithdraw}
              disabled={acting || !withdrawReason.trim()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {acting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Withdraw permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

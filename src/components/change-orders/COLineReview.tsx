import { useState } from 'react';
import { Check, CheckCheck, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { COLineItem } from '@/types/changeOrder';
import { summarizeLineReview } from '@/lib/coLineReview';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

async function saveDecisions(
  coId: string,
  decisions: { id: string; decision: 'approved' | 'rejected'; reason?: string }[],
) {
  const { error } = await supabase.rpc('review_co_line_items', {
    _co_id: coId,
    _decisions: decisions,
  });
  if (error) throw error;
}

function ApprovalBadge({ item }: { item: COLineItem }) {
  const status = item.approval_status ?? 'pending';
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
      status === 'approved' && 'bg-state-approved-bg text-state-approved-foreground',
      status === 'rejected' && 'bg-destructive/10 text-destructive',
      status === 'pending' && 'bg-muted text-muted-foreground',
    )}>
      {status === 'approved' ? <Check className="h-3 w-3" /> : status === 'rejected' ? <X className="h-3 w-3" /> : null}
      {status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Awaiting review'}
    </span>
  );
}

interface ReviewBarProps {
  coId: string;
  items: COLineItem[];
  canReview: boolean;
  onRefresh: () => void;
}

export function COLineReviewBar({ coId, items, canReview, onRefresh }: ReviewBarProps) {
  const [saving, setSaving] = useState(false);
  const summary = summarizeLineReview(items);
  if (!canReview && summary.pending === items.length) return null;

  async function approveAll() {
    setSaving(true);
    try {
      await saveDecisions(coId, items.map(item => ({ id: item.id, decision: 'approved' as const })));
      toast.success('All items approved. Finish the review in Actions.');
      onRefresh();
    } catch (error: any) {
      toast.error(error?.message ?? 'Failed to approve all items');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-muted/20 px-3 py-3 sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">Item review</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {summary.pending > 0
            ? `${summary.pending} pending · ${summary.approved} approved · ${summary.rejected} rejected`
            : `${summary.approved} approved · ${summary.rejected} rejected${canReview ? ' — finish the review in Actions' : ''}`}
        </p>
      </div>
      {canReview && (
        <Button type="button" size="sm" onClick={approveAll} disabled={saving} className="h-8 shrink-0 gap-1.5 text-xs">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
          Approve all
        </Button>
      )}
    </div>
  );
}

interface ItemReviewProps {
  coId: string;
  item: COLineItem;
  canReview: boolean;
  onRefresh: () => void;
}

export function COLineItemReview({ coId, item, canReview, onRefresh }: ItemReviewProps) {
  const [saving, setSaving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState(item.approval_rejection_reason ?? '');
  if (!canReview && (item.approval_status ?? 'pending') === 'pending') return null;

  async function approve() {
    setSaving(true);
    try {
      await saveDecisions(coId, [{ id: item.id, decision: 'approved' }]);
      toast.success(`Approved “${item.item_name}”`);
      onRefresh();
    } catch (error: any) {
      toast.error(error?.message ?? 'Failed to approve item');
    } finally {
      setSaving(false);
    }
  }

  async function reject() {
    if (!reason.trim()) return;
    setSaving(true);
    try {
      await saveDecisions(coId, [{ id: item.id, decision: 'rejected', reason: reason.trim() }]);
      toast.success(`Rejected “${item.item_name}”`);
      setRejectOpen(false);
      onRefresh();
    } catch (error: any) {
      toast.error(error?.message ?? 'Failed to reject item');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t border-border/60 bg-muted/10 px-3 py-2.5 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <ApprovalBadge item={item} />
        {item.approval_status === 'rejected' && item.approval_rejection_reason && (
          <span className="min-w-0 flex-1 break-words text-[11px] text-muted-foreground">
            {item.approval_rejection_reason}
          </span>
        )}
        {canReview && (
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={item.approval_status === 'approved' ? 'secondary' : 'outline'}
              onClick={approve}
              disabled={saving}
              className="h-7 gap-1 px-2.5 text-[11px]"
            >
              {saving && !rejectOpen ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => { setReason(item.approval_rejection_reason ?? ''); setRejectOpen(true); }}
              disabled={saving}
              className="h-7 gap-1 px-2.5 text-[11px] text-destructive hover:text-destructive"
            >
              <X className="h-3 w-3" />
              Reject
            </Button>
          </div>
        )}
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject “{item.item_name}”</DialogTitle>
            <DialogDescription>
              This item will be excluded from the approved amount. The submitter will see your reason.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor={`line-rejection-${item.id}`}>Reason for rejection *</Label>
            <Textarea
              id={`line-rejection-${item.id}`}
              value={reason}
              onChange={event => setReason(event.target.value)}
              rows={4}
              autoFocus
              className="mt-1.5 resize-none"
              placeholder="Explain what needs to change…"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={reject} disabled={saving || !reason.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2, ChevronRight, MapPin } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useChangeOrderDetail } from '@/hooks/useChangeOrderDetail';
import { useChangeOrders } from '@/hooks/useChangeOrders';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ChangeOrder, COFinancials } from '@/types/changeOrder';
import { format } from 'date-fns';

interface GCApprovalCardProps {
  co: ChangeOrder;
  financials: COFinancials;
  projectId: string;
  onRefresh: () => void;
  nextPendingCO?: { id: string; co_number: string | null; tc_submitted_price: number | null } | null;
}

function fmtCurrency(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function GCApprovalCard({ co, financials, projectId, onRefresh, nextPendingCO }: GCApprovalCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { approveCO, rejectCO } = useChangeOrderDetail(co.id);
  const [acting, setActing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  const totalToApprove = financials.tcBillableToGC + financials.materialsTotal + financials.equipmentTotal;

  async function logActivity(action: string, detail?: string, amount?: number) {
    if (!user) return;
    await supabase.from('co_activity').insert({
      co_id: co.id,
      project_id: projectId,
      actor_user_id: user.id,
      actor_role: 'GC',
      action,
      detail: detail ?? null,
      amount: amount ?? null,
    });
  }

  async function handleApprove() {
    setActing(true);
    try {
      await approveCO.mutateAsync(co.id);
      await logActivity('approved', undefined, totalToApprove);
      toast.success('CO approved');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to approve');
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    if (!rejectNote.trim()) {
      toast.error('A rejection note is required');
      return;
    }
    setActing(true);
    try {
      await rejectCO.mutateAsync({ coId: co.id, note: rejectNote.trim() });
      await logActivity('rejected', rejectNote.trim());
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

  return (
    <>
      <div className="co-light-shell overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-accent/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-muted-foreground">{co.co_number ?? '—'}</p>
              <h3 className="text-sm font-semibold text-foreground">{co.title ?? 'Change Order'}</h3>
            </div>
            <span className="text-xs text-muted-foreground">
              Submitted {getTimeAgo(co.submitted_at)}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="px-4 py-3 space-y-2">
          {/* Photo strip placeholder */}
          <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
            <span>📷</span>
            <span>No photos attached</span>
          </div>

          {co.location_tag && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-foreground">{co.location_tag}</span>
            </div>
          )}

          {/* Financial breakdown */}
          <div className="space-y-1.5 pt-2 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Labor</span>
              <span className="font-medium text-foreground">{fmtCurrency(financials.tcBillableToGC)}</span>
            </div>
            {financials.materialsTotal > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Materials</span>
                <span className="font-medium text-foreground">{fmtCurrency(financials.materialsTotal)}</span>
              </div>
            )}
            {financials.equipmentTotal > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Equipment</span>
                <span className="font-medium text-foreground">{fmtCurrency(financials.equipmentTotal)}</span>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Total to approve</span>
              <span
                className="text-foreground leading-none"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.75rem', fontWeight: 800 }}
              >
                {fmtCurrency(totalToApprove)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-11 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/5"
              onClick={() => setRejectOpen(true)}
              disabled={acting}
            >
              <X className="h-3.5 w-3.5" />
              Reject with note
            </Button>
            <Button
              size="sm"
              className="flex-1 h-11 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleApprove}
              disabled={acting}
            >
              {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Approve {fmtCurrency(totalToApprove)}
            </Button>
          </div>
        </div>

        {/* Next pending */}
        {nextPendingCO && (
          <button
            type="button"
            onClick={() => navigate(`/project/${projectId}/change-orders/${nextPendingCO.id}`)}
            className="w-full flex items-center justify-between px-4 py-2.5 border-t border-border text-xs bg-accent/30 hover:bg-accent/60 transition-colors"
          >
            <span className="text-muted-foreground">
              Next pending: <strong>{nextPendingCO.co_number ?? '—'}</strong> · {fmtCurrency(nextPendingCO.tc_submitted_price ?? 0)}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Reject bottom sheet */}
      <Sheet open={rejectOpen} onOpenChange={setRejectOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <div className="space-y-4 py-2">
            <h3 className="text-base font-semibold text-foreground">Reject with note</h3>
            <Textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="Explain why this CO is being rejected…"
              rows={3}
              className="resize-none"
              autoFocus
            />
            <Button
              variant="destructive"
              className="w-full h-11 gap-1"
              disabled={!rejectNote.trim() || acting}
              onClick={handleReject}
            >
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Reject CO
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

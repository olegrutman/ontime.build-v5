import { useState } from 'react';
import { useRoleLabelsContext } from '@/contexts/RoleLabelsContext';
import type { UseMutationResult } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Loader2, AlertTriangle, Check, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendCONotification, buildCONotification } from '@/lib/coNotifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ChangeOrder, CONTELogEntry } from '@/types/changeOrder';

interface CONTEPanelProps {
  co: ChangeOrder;
  nteLog: CONTELogEntry[];
  usedAmount: number;
  isGC: boolean;
  isTC: boolean;
  isFC: boolean;
  requestNTEIncrease: UseMutationResult<CONTELogEntry, Error, { requestedIncrease: number; runningTotal: number }, unknown>;
  approveNTEIncrease: UseMutationResult<ChangeOrder, Error, { nteLogId: string; requestedIncrease: number }, unknown>;
  rejectNTEIncrease: UseMutationResult<void, Error, { nteLogId: string; note: string }, unknown>;
  onRefresh: () => void;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CONTEPanel({
  co,
  nteLog,
  usedAmount,
  isGC,
  isTC,
  isFC,
  requestNTEIncrease,
  approveNTEIncrease,
  rejectNTEIncrease,
  onRefresh,
}: CONTEPanelProps) {
  const rl = useRoleLabelsContext();
  const [requestOpen, setRequestOpen] = useState(false);
  const [increaseAmt, setIncreaseAmt] = useState('');
  const [increaseNote, setIncreaseNote] = useState('');
  const [approveId, setApproveId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [acting, setActing] = useState(false);

  const cap = co.nte_cap ?? 0;
  const remaining = cap - usedAmount;
  const pct = cap > 0 ? (usedAmount / cap) * 100 : 0;
  const isWarning = pct >= 80 && pct < 95;
  const isNearCap = pct >= 95;
  const isOver = pct >= 100;

  const pendingRequest = nteLog.find(e => !e.approved_at && !e.rejected_at);
  const hasPending = !!pendingRequest;

  async function notifyCreator(type: string, amount?: number) {
    if (!co.created_by_user_id) return;

    try {
      const { title, body } = buildCONotification(type, co.title, amount);
      await sendCONotification({
        recipient_user_id: co.created_by_user_id,
        recipient_org_id: co.org_id,
        co_id: co.id,
        project_id: co.project_id,
        type,
        title,
        body,
        amount,
      });
    } catch (err) {
      console.warn('NTE notification failed:', err);
    }
  }

  async function notifyGC(type: string, amount?: number) {
    if (!co.assigned_to_org_id) return;
    try {
      const { data: members } = await supabase
        .from('user_org_roles')
        .select('user_id')
        .eq('organization_id', co.assigned_to_org_id)
        .limit(5);
      if (!members || members.length === 0) return;
      const { title, body } = buildCONotification(type, co.title, amount);
      await Promise.allSettled(
        members.map(m =>
          sendCONotification({
            recipient_user_id: m.user_id,
            recipient_org_id: co.assigned_to_org_id!,
            co_id: co.id,
            project_id: co.project_id,
            type, title, body, amount,
          })
        )
      );
    } catch (err) {
      console.warn('NTE GC notification failed:', err);
    }
  }

  async function doRequest() {
    const amount = parseFloat(increaseAmt);
    if (!amount || amount <= 0) return;
    setActing(true);
    try {
      await requestNTEIncrease.mutateAsync({
        requestedIncrease: amount,
        runningTotal: usedAmount,
      });
      toast.success('Increase request sent to GC');
      await notifyGC('NTE_REQUESTED', amount);
      setRequestOpen(false);
      setIncreaseAmt('');
      setIncreaseNote('');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to send request');
    } finally {
      setActing(false);
    }
  }

  async function doApprove() {
    if (!approveId || !pendingRequest) return;
    setActing(true);
    try {
      await approveNTEIncrease.mutateAsync({
        nteLogId: approveId,
        requestedIncrease: pendingRequest.requested_increase,
      });
      toast.success(`NTE cap increased to $${fmt(cap + pendingRequest.requested_increase)}`);
      await notifyCreator('NTE_APPROVED', pendingRequest.requested_increase);
      setApproveId(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to approve');
    } finally {
      setActing(false);
    }
  }

  async function doReject() {
    if (!rejectId || !rejectNote.trim()) return;
    setActing(true);
    try {
      await rejectNTEIncrease.mutateAsync({
        nteLogId: rejectId,
        note: rejectNote.trim(),
      });
      toast.success('Increase request declined');
      await notifyCreator('NTE_REJECTED');
      setRejectId(null);
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
      <div className="co-light-shell">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border co-light-header">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Not-to-exceed</h3>
          </div>
          {isNearCap && !hasPending && (isTC || isFC) && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setRequestOpen(true)}
            >
              <TrendingUp className="h-3 w-3" />
              Request increase
            </Button>
          )}
        </div>

        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Cap</span>
            <span className="font-medium text-foreground">${fmt(cap)}</span>
          </div>

          <div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  isOver ? 'bg-destructive' :
                  isNearCap ? 'bg-destructive' :
                  isWarning ? 'bg-primary' : 'bg-secondary'
                )}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className={cn(
                'text-xs',
                isNearCap ? 'text-destructive' :
                isWarning ? 'text-primary' : 'text-muted-foreground'
              )}>
                {pct.toFixed(1)}% used
              </span>
              <span className="text-xs text-muted-foreground">
                ${fmt(usedAmount)} of ${fmt(cap)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Remaining</span>
            <span className={cn('font-medium', remaining < 0 ? 'text-destructive' : 'text-foreground')}>
              {remaining < 0 ? '-' : ''}${fmt(Math.abs(remaining))}
            </span>
          </div>

          {isWarning && !isNearCap && (
            <div className="flex items-start gap-2 rounded-md bg-primary/10 p-2.5">
              <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">
                You are at {pct.toFixed(0)}% of the cap. Consider requesting an increase before work continues.
              </p>
            </div>
          )}

          {isNearCap && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2.5">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">
                {isOver
                  ? 'The NTE cap has been reached. GC has been notified.'
                  : `You are at ${pct.toFixed(0)}% of the cap. Request an increase before logging more hours.`}
              </p>
            </div>
          )}

          {hasPending && (isTC || isFC) && (
            <div className="flex items-start gap-2 rounded-md bg-accent p-2.5 border border-border">
              <Loader2 className="h-4 w-4 text-primary shrink-0 mt-0.5 animate-spin" />
              <p className="text-xs text-foreground">
                Increase request of ${fmt(pendingRequest!.requested_increase)} pending ${rl.GC} approval
              </p>
            </div>
          )}

          {hasPending && isGC && pendingRequest && (
            <div className="rounded-md border border-primary/30 bg-primary/10 p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">
                ${rl.TC} requesting NTE increase
              </p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current cap</span>
                  <span className="text-foreground">${fmt(pendingRequest.current_cap_at_request)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Running total at request</span>
                  <span className="text-foreground">${fmt(pendingRequest.running_total_at_request)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Increase requested</span>
                    <span className="font-semibold text-primary">
                      +${fmt(pendingRequest.requested_increase)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New cap if approved</span>
                  <span className="font-semibold text-foreground">
                    ${fmt(pendingRequest.current_cap_at_request + pendingRequest.requested_increase)}
                  </span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    onClick={() => setRejectId(pendingRequest.id)}
                    disabled={acting}
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    onClick={() => setApproveId(pendingRequest.id)}
                    disabled={acting}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          )}

          {nteLog.filter(e => e.approved_at || e.rejected_at).length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-border">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                History
              </p>
              {nteLog
                .filter(e => e.approved_at || e.rejected_at)
                .map(entry => (
                  <div key={entry.id} className="flex items-center justify-between text-xs">
                    <span className={entry.approved_at ? 'text-green-600' : 'text-destructive'}>
                      {entry.approved_at ? '↑ Cap increased' : '✕ Increase declined'}
                    </span>
                    <span className="text-muted-foreground">
                      {entry.approved_at
                        ? `+$${fmt(entry.requested_increase)}`
                        : `$${fmt(entry.requested_increase)} denied`}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Request increase dialog */}
      <AlertDialog open={requestOpen} onOpenChange={setRequestOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request NTE increase</AlertDialogTitle>
            <AlertDialogDescription>
              Current cap: ${fmt(cap)} · Used: ${fmt(usedAmount)} ({pct.toFixed(1)}%)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm font-medium">
                Additional amount needed <span className="text-destructive">*</span>
              </Label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={increaseAmt}
                  onChange={e => setIncreaseAmt(e.target.value)}
                  className="pl-7"
                />
              </div>
              {increaseAmt && parseFloat(increaseAmt) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  New cap if approved: ${fmt(cap + (parseFloat(increaseAmt) || 0))}
                </p>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium">Note to ${rl.GC} (optional)</Label>
              <Textarea
                value={increaseNote}
                onChange={e => setIncreaseNote(e.target.value)}
                placeholder="Explain why more budget is needed…"
                rows={2}
                className="mt-1.5 resize-none text-sm"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={doRequest}
              disabled={acting || !increaseAmt || parseFloat(increaseAmt) <= 0}
              className=""
            >
              {acting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve dialog */}
      <AlertDialog open={!!approveId} onOpenChange={v => !v && setApproveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve NTE increase</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRequest && (
                <>
                  This will increase the NTE cap from ${fmt(cap)} to $
                  {fmt(cap + pendingRequest.requested_increase)}.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={doApprove}
              disabled={acting}
              className=""
            >
              {acting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Approve increase
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject dialog */}
      <AlertDialog open={!!rejectId} onOpenChange={v => !v && setRejectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline NTE increase</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a note. ${rl.TC} will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label className="text-sm font-medium">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="Why is the increase not approved…"
              rows={2}
              className="mt-1.5 resize-none text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={doReject}
              disabled={acting || !rejectNote.trim()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {acting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Decline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

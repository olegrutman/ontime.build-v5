import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, AlertTriangle, Check, X, Loader2, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useBackcharges, type Backcharge } from '@/hooks/useBackcharges';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
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

function fmtCurrency(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-100 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', label: 'Pending' },
  disputed: { bg: 'bg-red-100 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400', label: 'Disputed' },
  accepted: { bg: 'bg-blue-100 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400', label: 'Accepted' },
  deducted: { bg: 'bg-emerald-100 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Deducted' },
  withdrawn: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Withdrawn' },
};

interface BackchargesListProps {
  projectId: string;
}

export function BackchargesList({ projectId }: BackchargesListProps) {
  const { backcharges, isLoading, updateStatus } = useBackcharges(projectId);
  const { userOrgRoles } = useAuth();
  const orgId = userOrgRoles?.[0]?.organization_id;
  const orgType = userOrgRoles?.[0]?.organization?.type;
  const isGC = orgType === 'GC';

  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeNote, setDisputeNote] = useState('');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  async function handleAccept(id: string) {
    setActing(true);
    try {
      await updateStatus.mutateAsync({ id, status: 'accepted' });
      toast.success('Backcharge accepted');
    } catch { toast.error('Failed'); }
    setActing(false);
  }

  async function handleDispute() {
    if (!targetId || !disputeNote.trim()) return;
    setActing(true);
    try {
      await updateStatus.mutateAsync({ id: targetId, status: 'disputed', dispute_note: disputeNote.trim() });
      toast.success('Backcharge disputed');
      setDisputeOpen(false);
      setDisputeNote('');
    } catch { toast.error('Failed'); }
    setActing(false);
  }

  async function handleDeduct(id: string) {
    setActing(true);
    try {
      await updateStatus.mutateAsync({ id, status: 'deducted', gc_approved: true });
      toast.success('Backcharge marked as deducted');
    } catch { toast.error('Failed'); }
    setActing(false);
  }

  async function handleWithdraw(id: string) {
    setActing(true);
    try {
      await updateStatus.mutateAsync({ id, status: 'withdrawn' });
      toast.success('Backcharge withdrawn');
    } catch { toast.error('Failed'); }
    setActing(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (backcharges.length === 0) {
    return (
      <div className="text-center py-16 space-y-2">
        <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No backcharges on this project.</p>
        <p className="text-xs text-muted-foreground">
          Backcharges are created automatically when a "Damaged by Others" change order is approved.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {backcharges.map((bc) => {
          const style = STATUS_STYLES[bc.status] ?? STATUS_STYLES.pending;
          const isResponsible = bc.responsible_org_id === orgId;
          const coTitle = bc.source_co?.title ?? 'Unknown CO';
          const coNumber = bc.source_co?.co_number;

          return (
            <div key={bc.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', style.bg, style.text)}>
                      {style.label}
                    </span>
                    {coNumber && (
                      <span className="text-[10px] font-mono text-muted-foreground">{coNumber}</span>
                    )}
                  </div>
                  <Link
                    to={`/project/${projectId}/change-orders/${bc.source_co_id}`}
                    className="text-sm font-semibold text-foreground hover:text-primary mt-1 block truncate"
                  >
                    {coTitle}
                    <ArrowRight className="inline h-3 w-3 ml-1" />
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Charged to: <span className="font-medium text-foreground">{bc.responsible_party_name ?? bc.responsible_org?.name ?? 'Unassigned'}</span>
                  </p>
                  {bc.dispute_note && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 italic">
                      Dispute: {bc.dispute_note}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-bold text-foreground">{fmtCurrency(bc.amount)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(bc.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Actions */}
              {bc.status === 'pending' && (
                <div className="px-4 py-2 border-t border-border bg-muted/30 flex gap-2">
                  {isResponsible && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleAccept(bc.id)} disabled={acting}>
                        <Check className="h-3 w-3" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30" onClick={() => { setTargetId(bc.id); setDisputeOpen(true); }} disabled={acting}>
                        <X className="h-3 w-3" /> Dispute
                      </Button>
                    </>
                  )}
                  {isGC && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-muted-foreground ml-auto" onClick={() => handleWithdraw(bc.id)} disabled={acting}>
                      <Ban className="h-3 w-3" /> Withdraw
                    </Button>
                  )}
                </div>
              )}
              {bc.status === 'accepted' && isGC && (
                <div className="px-4 py-2 border-t border-border bg-muted/30 flex gap-2">
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleDeduct(bc.id)} disabled={acting}>
                    {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Mark as Deducted
                  </Button>
                </div>
              )}
              {bc.status === 'disputed' && isGC && (
                <div className="px-4 py-2 border-t border-border bg-muted/30 flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleDeduct(bc.id)} disabled={acting}>
                    Override & Deduct
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => handleWithdraw(bc.id)} disabled={acting}>
                    Withdraw
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dispute Backcharge</AlertDialogTitle>
            <AlertDialogDescription>
              Explain why you believe this backcharge is incorrect. The GC will review your dispute.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea
              value={disputeNote}
              onChange={e => setDisputeNote(e.target.value)}
              placeholder="Explain your dispute..."
              rows={3}
              className="resize-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDispute} disabled={acting || !disputeNote.trim()} className="bg-destructive hover:bg-destructive/90">
              {acting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Submit Dispute
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

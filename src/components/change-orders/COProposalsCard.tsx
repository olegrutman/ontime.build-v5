import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileText, Loader2, Pencil, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
  useCOProposals,
  downloadProposalPdf,
  useUpdateProposalStatus,
  useDeleteProposal,
  type ProposalStatus,
} from '@/hooks/useCOProposals';

const money = (v: number) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_STYLES: Record<ProposalStatus, string> = {
  draft: 'border-border bg-muted text-muted-foreground',
  sent: 'border-secondary/30 bg-secondary/10 text-secondary',
  accepted: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
  declined: 'border-destructive/30 bg-destructive/10 text-destructive',
};

export function COProposalsCard({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const { data: proposals = [], isLoading } = useCOProposals(projectId);
  const updateStatus = useUpdateProposalStatus(projectId);
  const deleteProposal = useDeleteProposal(projectId);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; number: string } | null>(null);

  if (isLoading || proposals.length === 0) return null;

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteProposal.mutateAsync(pendingDelete.id);
      toast.success(`${pendingDelete.number} deleted`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete the proposal');
    } finally {
      setPendingDelete(null);
    }
  }


  async function download(id: string, number: string) {
    setBusyId(id);
    try {
      await downloadProposalPdf(id, `Quote-${number}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not generate the proposal PDF');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Quotes / proposals ({proposals.length})
      </h2>
      <ul className="mt-2 divide-y divide-border">
        {proposals.map(p => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6rem] font-semibold text-muted-foreground">
                  {p.proposal_number}
                </span>
                <span className={cn('rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider', STATUS_STYLES[p.status])}>
                  {p.status}
                </span>
                <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  {(p.items ?? []).length} items
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm font-medium text-foreground">{p.title}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.65rem] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {p.client_company || p.client_name || 'No client set'}
                </span>
                {(p.milestones ?? []).length > 0 && (
                  <span className="font-mono">
                    {(p.milestones ?? [])
                      .map(m => (m.basis === 'percent' ? `${Number(m.percent)}%` : money(Number(m.amount))))
                      .join(' / ')}
                  </span>
                )}
              </p>
            </div>
            <span className="font-mono tabular-nums text-sm font-semibold text-foreground">{money(p.total)}</span>
            <div className="flex items-center gap-1.5">
              {p.status === 'draft' && (
                <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: p.id, status: 'sent' })}>
                  Mark sent
                </Button>
              )}
              {p.status === 'sent' && (
                <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: p.id, status: 'accepted' })}>
                  Accepted
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate(`/project/${projectId}/proposals/${p.id}/edit`)}
                aria-label={`Edit quote ${p.proposal_number}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => download(p.id, p.proposal_number)} aria-label="Download proposal PDF">
                {busyId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setPendingDelete({ id: p.id, number: p.proposal_number })}
                aria-label={`Delete proposal ${p.proposal_number}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <AlertDialog open={!!pendingDelete} onOpenChange={open => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the proposal bundle and its cover details. The work orders inside it stay untouched and can be
              bundled into a new proposal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteProposal.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProposal.isPending ? 'Deleting…' : 'Delete proposal'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}


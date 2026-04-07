import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContractReviewActionsProps {
  contractId: string;
  onActionComplete: () => void;
}

export function ContractReviewActions({ contractId, onActionComplete }: ContractReviewActionsProps) {
  const { toast } = useToast();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [acting, setActing] = useState(false);

  const handleAccept = async () => {
    setActing(true);
    try {
      const { error } = await supabase
        .from('project_contracts')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        } as any)
        .eq('id', contractId);
      if (error) throw error;
      toast({ title: 'Contract accepted' });
      onActionComplete();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectNote.trim()) return;
    setActing(true);
    try {
      const { error } = await supabase
        .from('project_contracts')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_note: rejectNote.trim(),
        } as any)
        .eq('id', contractId);
      if (error) throw error;
      toast({ title: 'Contract rejected' });
      setRejectOpen(false);
      setRejectNote('');
      onActionComplete();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleAccept}
        disabled={acting}
        className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10"
      >
        <Check className="w-3 h-3" />
        Accept
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setRejectOpen(true)}
        disabled={acting}
        className="h-7 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
      >
        <X className="w-3 h-3" />
        Reject
      </Button>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Contract</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason for rejecting this contract. The sender will be able to revise and resend.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectNote}
            onChange={e => setRejectNote(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!rejectNote.trim() || acting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject Contract
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

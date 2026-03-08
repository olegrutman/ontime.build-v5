import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Send, Check, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { TMPeriod, TMPeriodStatus } from './types';
import { AppRole } from '@/types/organization';

interface TMPeriodActionsProps {
  period: TMPeriod;
  currentRole: AppRole | null;
  onAction: () => void;
  hasFCParticipant?: boolean;
}

export function TMPeriodActions({ period, currentRole, onAction, hasFCParticipant = true }: TMPeriodActionsProps) {
  const [loading, setLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');

  const status = period.status as TMPeriodStatus;
  const isTC = currentRole === 'TC_PM';
  const isFS = currentRole === 'FS';
  const isGC = currentRole === 'GC_PM';
  const isSelfPerforming = isTC && !hasFCParticipant;

  // Action visibility rules
  // When self-performing (TC with no FC), TC can submit & auto-approve in one step
  const canSubmit = (isTC || isFS) && status === 'OPEN';
  const canApprove = isTC && status === 'SUBMITTED' && !isSelfPerforming;
  const canReject = isTC && status === 'SUBMITTED' && !isSelfPerforming;

  const handleSubmit = async () => {
    setLoading(true);
    
    if (isSelfPerforming) {
      // Self-performing TC: submit and immediately approve
      const { error: submitError } = await supabase.rpc('submit_tm_period', {
        period_id: period.id
      });
      
      if (submitError) {
        toast.error(`Failed to submit: ${submitError.message}`);
        setLoading(false);
        return;
      }

      const { error: approveError } = await supabase.rpc('approve_tm_period', {
        period_id: period.id
      });

      if (approveError) {
        toast.error(`Failed to auto-approve: ${approveError.message}`);
      } else {
        toast.success('Period submitted & approved (self-performing)');
        onAction();
      }
    } else {
      const { error } = await supabase.rpc('submit_tm_period', {
        period_id: period.id
      });

      if (error) {
        toast.error(`Failed to submit: ${error.message}`);
      } else {
        toast.success('Period submitted for approval');
        onAction();
      }
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    setLoading(true);
    const { error } = await supabase.rpc('approve_tm_period', {
      period_id: period.id
    });

    if (error) {
      toast.error(`Failed to approve: ${error.message}`);
    } else {
      toast.success('Period approved - billable slice created');
      onAction();
    }
    setLoading(false);
  };

  const handleReject = async () => {
    if (!rejectionNotes.trim()) {
      toast.error('Please provide rejection notes');
      return;
    }

    setLoading(true);
    const { error } = await supabase.rpc('reject_tm_period', {
      period_id: period.id,
      notes: rejectionNotes
    });

    if (error) {
      toast.error(`Failed to reject: ${error.message}`);
    } else {
      toast.success('Period rejected');
      setRejectDialogOpen(false);
      setRejectionNotes('');
      onAction();
    }
    setLoading(false);
  };

  if (!canSubmit && !canApprove && !canReject) {
    return null;
  }

  return (
    <div className="flex gap-2">
      {canSubmit && (
        <Button size="sm" onClick={handleSubmit} disabled={loading}>
          <Send className="w-3 h-3 mr-1" />
          {isSelfPerforming ? 'Submit & Approve' : 'Submit'}
        </Button>
      )}

      {canApprove && (
        <Button size="sm" onClick={handleApprove} disabled={loading}>
          <Check className="w-3 h-3 mr-1" />
          Approve
        </Button>
      )}

      {canReject && (
        <Button 
          size="sm" 
          variant="destructive" 
          onClick={() => setRejectDialogOpen(true)} 
          disabled={loading}
        >
          <X className="w-3 h-3 mr-1" />
          Reject
        </Button>
      )}

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Reject Period
            </DialogTitle>
            <DialogDescription>
              Provide notes explaining why this period is being rejected.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="rejection-notes">Rejection Notes</Label>
            <Textarea
              id="rejection-notes"
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              placeholder="What needs to be corrected..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={loading}>
              Reject Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
import { toast } from 'sonner';
import { Check, X, Send, Play, AlertTriangle, FileDown, Loader2, Bell } from 'lucide-react';
import { WorkItemData, WorkItemState } from './WorkItemPage';
import { AppRole } from '@/types/organization';
import { useNudge } from '@/hooks/useNudge';

interface WorkItemActionsProps {
  workItem: WorkItemData;
  currentRole: AppRole | null;
  onStateChange: () => void;
}

export function WorkItemActions({ workItem, currentRole, onStateChange }: WorkItemActionsProps) {
  const [loading, setLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const { sendNudge, loading: nudgeLoading, wasSent } = useNudge();

  const state = workItem.state as WorkItemState;
  const itemType = workItem.item_type;

  const isGC = currentRole === 'GC_PM';
  const isTC = currentRole === 'TC_PM';

  // State transition rules
  const canSubmitForPricing = isTC && state === 'OPEN';
  const canApprove = isGC && state === 'PRICED';
  const canReject = isGC && state === 'PRICED';
  const canExecute = isGC && state === 'APPROVED';

  const updateState = async (newState: WorkItemState, notes?: string) => {
    setLoading(true);
    
    const updateData: Record<string, unknown> = { state: newState };
    if (notes !== undefined) {
      updateData.rejection_notes = notes;
    }

    const { error } = await supabase
      .from('work_items')
      .update(updateData)
      .eq('id', workItem.id);

    if (error) {
      toast.error(`Failed to update state: ${error.message}`);
    } else {
      toast.success(`Work item ${newState.toLowerCase()}`);
      onStateChange();
    }
    
    setLoading(false);
  };

  const handleSubmit = () => updateState('PRICED');
  
  const handleApprove = () => updateState('APPROVED', null);
  
  const handleReject = () => {
    if (!rejectionNotes.trim()) {
      toast.error('Please provide rejection notes');
      return;
    }
    updateState('OPEN', rejectionNotes);
    setRejectDialogOpen(false);
    setRejectionNotes('');
  };

  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to export');
        return;
      }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/work-order-download?work_item_id=${workItem.id}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(err.error || `Export failed (${res.status})`);
      }
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export work order');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExecute = async () => {
    setLoading(true);
    
    // For CHANGE_WORK, use the special execute function
    if (itemType === 'CHANGE_WORK') {
      const { error } = await supabase.rpc('execute_change_work', {
        change_work_id: workItem.id
      });
      
      if (error) {
        toast.error(`Failed to execute: ${error.message}`);
      } else {
        toast.success('Change work executed - SOV items generated');
        onStateChange();
      }
    } else {
      await updateState('EXECUTED');
    }
    
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Actions</h3>
      
      <div className="space-y-2">
        {/* Export PDF */}
        <Button
          className="w-full"
          variant="outline"
          onClick={handleExportPDF}
          disabled={exportLoading}
        >
          {exportLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
          Export PDF
        </Button>

        {/* Submit for Pricing (TC only, OPEN state) */}
        {canSubmitForPricing && (
          <Button 
            className="w-full" 
            onClick={handleSubmit}
            disabled={loading}
          >
            <Send className="w-4 h-4 mr-2" />
            Submit for Approval
          </Button>
        )}

        {/* Send Reminder (TC only, PRICED state - waiting for GC approval) */}
        {isTC && state === 'PRICED' && (
          <Button
            className="w-full"
            variant="outline"
            onClick={() => sendNudge('work_order', workItem.id)}
            disabled={nudgeLoading || wasSent('work_order', workItem.id)}
          >
            <Bell className="w-4 h-4 mr-2" />
            {wasSent('work_order', workItem.id) ? 'Reminder Sent' : 'Send Reminder'}
          </Button>
        )}

        {/* Approve (GC only, PRICED state) */}
        {canApprove && (
          <Button 
            className="w-full" 
            variant="default"
            onClick={handleApprove}
            disabled={loading}
          >
            <Check className="w-4 h-4 mr-2" />
            Approve
          </Button>
        )}

        {/* Reject (GC only, PRICED state) */}
        {canReject && (
          <Button 
            className="w-full" 
            variant="destructive"
            onClick={() => setRejectDialogOpen(true)}
            disabled={loading}
          >
            <X className="w-4 h-4 mr-2" />
            Reject
          </Button>
        )}

        {/* Execute (GC only, APPROVED state) */}
        {canExecute && (
          <Button 
            className="w-full" 
            onClick={handleExecute}
            disabled={loading}
          >
            <Play className="w-4 h-4 mr-2" />
            Execute
          </Button>
        )}

        {/* No actions available message */}
        {!canSubmitForPricing && !canApprove && !canReject && !canExecute && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {state === 'EXECUTED' 
              ? 'This work item has been executed.'
              : 'No actions available for your role at this stage.'}
          </p>
        )}
      </div>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Reject Work Item
            </DialogTitle>
            <DialogDescription>
              Please provide notes explaining why this work item is being rejected.
              It will be returned to OPEN state for revision.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="rejection-notes">Rejection Notes</Label>
            <Textarea
              id="rejection-notes"
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              placeholder="Explain what needs to be revised..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={loading}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

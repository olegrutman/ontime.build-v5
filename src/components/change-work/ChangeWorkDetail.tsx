import { useState } from 'react';
import { ChangeWork, CHANGE_WORK_STATE_ACTIONS } from '@/types/changeWork';
import { ChangeWorkPricing, WorkItemParticipant } from '@/types/changeWork';
import { WORK_ITEM_STATE_LABELS, WorkItemState } from '@/types/workItem';
import { AppRole } from '@/types/organization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { StateBadge } from '@/components/StateBadge';
import { StateProgressBar, StateProgressLabels } from '@/components/StateProgressBar';
import { PricingEditor } from './PricingEditor';
import { ParticipantsPanel } from './ParticipantsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { X, MapPin, Calendar, AlertTriangle, CheckCircle2, XCircle, Play } from 'lucide-react';
import { format } from 'date-fns';

interface ChangeWorkDetailProps {
  changeWork: ChangeWork;
  pricing: ChangeWorkPricing[];
  participants: WorkItemParticipant[];
  currentRole: AppRole | null;
  onClose: () => void;
  onAdvanceState: (data: {
    id: string;
    newState: WorkItemState;
    rejectionNotes?: string;
    amount?: number;
  }) => void;
  onAddPricing: (data: {
    work_item_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    uom: string;
  }) => void;
  onUpdatePricing: (data: {
    id: string;
    work_item_id: string;
    description?: string;
    quantity?: number;
    unit_price?: number;
    uom?: string;
  }) => void;
  onDeletePricing: (data: { id: string; work_item_id: string }) => void;
  onInviteParticipant: (data: { work_item_id: string; org_code: string }) => void;
  onRemoveParticipant: (data: { id: string; work_item_id: string }) => void;
  isAdvancing: boolean;
}

export function ChangeWorkDetail({
  changeWork,
  pricing,
  participants,
  currentRole,
  onClose,
  onAdvanceState,
  onAddPricing,
  onUpdatePricing,
  onDeletePricing,
  onInviteParticipant,
  onRemoveParticipant,
  isAdvancing,
}: ChangeWorkDetailProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [showExecuteConfirm, setShowExecuteConfirm] = useState(false);

  const stateActions = CHANGE_WORK_STATE_ACTIONS[changeWork.state];
  const canTakeAction = currentRole && stateActions.allowedRoles.includes(currentRole as 'GC_PM' | 'TC_PM');

  const total = pricing.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const formatCurrency = (amount?: number | null) => {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleApprove = () => {
    onAdvanceState({
      id: changeWork.id,
      newState: 'APPROVED',
      amount: total,
    });
  };

  const handleReject = () => {
    onAdvanceState({
      id: changeWork.id,
      newState: 'OPEN',
      rejectionNotes,
    });
    setShowRejectDialog(false);
    setRejectionNotes('');
  };

  const handleSubmitPricing = () => {
    onAdvanceState({
      id: changeWork.id,
      newState: 'PRICED',
      amount: total,
    });
  };

  const handleExecute = () => {
    onAdvanceState({
      id: changeWork.id,
      newState: 'EXECUTED',
    });
    setShowExecuteConfirm(false);
  };

  const canEditPricing = currentRole === 'TC_PM' && changeWork.state === 'OPEN';
  const canEditParticipants = (currentRole === 'GC_PM' || currentRole === 'TC_PM') && changeWork.state === 'OPEN';

  return (
    <>
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {changeWork.code || 'CO-???'}
                </Badge>
                <StateBadge state={changeWork.state} />
              </div>
              <CardTitle className="text-lg">{changeWork.title}</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* State Progress */}
          <div className="space-y-2">
            <StateProgressBar currentState={changeWork.state} readonly />
            <StateProgressLabels />
          </div>

          {/* Rejection Notes */}
          {changeWork.rejection_notes && changeWork.state === 'OPEN' && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Rejected</p>
                  <p className="text-sm text-destructive/80 mt-1">{changeWork.rejection_notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Amount */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Contract Amount</span>
            <span className="text-lg font-bold">{formatCurrency(changeWork.amount || total)}</span>
          </div>

          {/* Description & Location */}
          {(changeWork.description || changeWork.location_ref) && (
            <div className="space-y-3">
              {changeWork.description && (
                <p className="text-sm text-muted-foreground">{changeWork.description}</p>
              )}
              {changeWork.location_ref && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {changeWork.location_ref}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Tabs for Pricing & Participants */}
          <Tabs defaultValue="pricing" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pricing">Pricing ({pricing.length})</TabsTrigger>
              <TabsTrigger value="participants">Participants ({participants.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pricing" className="mt-4">
              <PricingEditor
                pricing={pricing}
                workItemId={changeWork.id}
                readOnly={!canEditPricing}
                onAdd={onAddPricing}
                onUpdate={onUpdatePricing}
                onDelete={onDeletePricing}
              />
            </TabsContent>
            <TabsContent value="participants" className="mt-4">
              <ParticipantsPanel
                participants={participants}
                workItemId={changeWork.id}
                readOnly={!canEditParticipants}
                onInvite={onInviteParticipant}
                onRemove={onRemoveParticipant}
              />
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Dates */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Created {format(new Date(changeWork.created_at), 'MMM d, yyyy')}
            </div>
            <div>Updated {format(new Date(changeWork.updated_at), 'MMM d, yyyy')}</div>
          </div>

          {/* Action Buttons */}
          {canTakeAction && (
            <div className="flex gap-2 pt-2">
              {changeWork.state === 'OPEN' && currentRole === 'TC_PM' && (
                <Button
                  className="flex-1"
                  onClick={handleSubmitPricing}
                  disabled={pricing.length === 0 || isAdvancing}
                >
                  Submit Pricing
                </Button>
              )}

              {changeWork.state === 'PRICED' && currentRole === 'GC_PM' && (
                <>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={isAdvancing}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleApprove}
                    disabled={isAdvancing}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                </>
              )}

              {changeWork.state === 'APPROVED' && currentRole === 'GC_PM' && (
                <Button
                  className="flex-1"
                  onClick={() => setShowExecuteConfirm(true)}
                  disabled={isAdvancing}
                >
                  <Play className="w-4 h-4 mr-1" />
                  Execute & Add to SOV
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Change Order</DialogTitle>
            <DialogDescription>
              This will return the change order to OPEN status for revision.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              placeholder="Explain why this is being rejected..."
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionNotes.trim() || isAdvancing}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Execute Confirmation Dialog */}
      <Dialog open={showExecuteConfirm} onOpenChange={setShowExecuteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Execute Change Order</DialogTitle>
            <DialogDescription>
              This will lock the change order and create SOV line items from the pricing breakdown.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>{pricing.length}</strong> SOV items will be created totaling{' '}
              <strong>{formatCurrency(total)}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExecuteConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleExecute} disabled={isAdvancing}>
              Execute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

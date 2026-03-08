import { useState } from 'react';
import { ChangeOrderProject, ChangeOrderFCHours, ChangeOrderStatus } from '@/types/changeOrderProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Check, X, AlertTriangle, Clock, DollarSign, Loader2 } from 'lucide-react';
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

interface TCApprovalPanelProps {
  changeOrder: ChangeOrderProject;
  fcHours: ChangeOrderFCHours[];
  onUpdateStatus: (data: { id: string; status: ChangeOrderStatus; rejection_notes?: string }) => void;
  isUpdating?: boolean;
}

export function TCApprovalPanel({
  changeOrder,
  fcHours,
  onUpdateStatus,
  isUpdating,
}: TCApprovalPanelProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);

  // Calculate FC labor total
  const fcLaborTotal = fcHours.reduce((sum, h) => sum + (h.labor_total || 0), 0);
  const fcEntry = fcHours[0]; // FC typically submits one entry

  const canApproveReject = changeOrder.status === 'tc_pricing' && 
    changeOrder.created_by_role === 'FC_PM';

  const handleApprove = () => {
    onUpdateStatus({ id: changeOrder.id, status: 'approved' });
    setShowApproveDialog(false);
  };

  const handleReject = () => {
    onUpdateStatus({
      id: changeOrder.id,
      status: 'rejected',
      rejection_notes: rejectionNotes,
    });
    setShowRejectDialog(false);
    setRejectionNotes('');
  };

  if (!canApproveReject) {
    return null;
  }

  return (
    <>
      <Card data-sasha-card="TC Approval" className="border-primary/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Field Crew Submission
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              Field Crew has submitted this work order for your approval.
            </p>
          </div>

          {/* FC Pricing Summary */}
          {fcEntry && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="w-4 h-4" />
                Field Crew Pricing
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pricing Type</span>
                  <span className="capitalize">{fcEntry.pricing_type?.replace('_', ' ')}</span>
                </div>

                {fcEntry.pricing_type === 'hourly' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hours</span>
                      <span>{fcEntry.hours}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hourly Rate</span>
                      <span>${fcEntry.hourly_rate?.toFixed(2)}</span>
                    </div>
                  </>
                )}

                {fcEntry.pricing_type === 'lump_sum' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lump Sum</span>
                    <span>${fcEntry.lump_sum?.toFixed(2)}</span>
                  </div>
                )}

                <Separator />
                <div className="flex justify-between font-medium text-base">
                  <span>Total</span>
                  <span className="text-lg">${fcLaborTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Rejection notes (if previously rejected) */}
          {changeOrder.rejection_notes && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium text-sm">Previous Rejection</span>
              </div>
              <p className="text-sm text-red-600 dark:text-red-300">{changeOrder.rejection_notes}</p>
            </div>
          )}

          {/* Approval Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowRejectDialog(true)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              Reject
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => setShowApproveDialog(true)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Approve
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Approve Confirmation */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Field Crew Work Order</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to approve this work order for{' '}
                <strong>${fcLaborTotal.toFixed(2)}</strong>?
              </p>
              <p className="text-sm text-muted-foreground">
                This will approve the Field Crew's submitted hours and pricing.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve Work Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Work Order</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this work order. The Field Crew will
              be notified of your rejection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="tc-rejection-notes">Rejection Reason *</Label>
            <Textarea
              id="tc-rejection-notes"
              placeholder="Explain why this work order is being rejected..."
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!rejectionNotes.trim()}
              className="bg-destructive hover:bg-destructive/90"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

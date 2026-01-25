import { useState } from 'react';
import { ChangeOrderProject, ChangeOrderStatus } from '@/types/changeOrderProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Check, X, AlertTriangle, DollarSign } from 'lucide-react';
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

interface ApprovalPanelProps {
  changeOrder: ChangeOrderProject;
  isGC: boolean;
  isReadyForApproval: boolean;
  onUpdateStatus: (data: { id: string; status: ChangeOrderStatus; rejection_notes?: string }) => void;
}

export function ApprovalPanel({
  changeOrder,
  isGC,
  isReadyForApproval,
  onUpdateStatus,
}: ApprovalPanelProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);

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

  const canApprove = isGC && changeOrder.status === 'ready_for_approval';

  // Pricing summary for GC
  const showPricingSummary =
    isGC &&
    (changeOrder.status === 'ready_for_approval' ||
      changeOrder.status === 'approved' ||
      changeOrder.status === 'contracted');

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approval</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Rejection notes (if previously rejected) */}
          {changeOrder.rejection_notes && changeOrder.status !== 'approved' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium text-sm">Previous Rejection</span>
              </div>
              <p className="text-sm text-red-600">{changeOrder.rejection_notes}</p>
            </div>
          )}

          {/* Pricing Summary for GC */}
          {showPricingSummary && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="w-4 h-4" />
                Pricing Summary
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Labor Total</span>
                  <span>${changeOrder.labor_total?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Material Total</span>
                  <span>${changeOrder.material_total?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Equipment Total</span>
                  <span>${changeOrder.equipment_total?.toFixed(2) || '0.00'}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium text-base">
                  <span>Final Price</span>
                  <span className="text-lg">${changeOrder.final_price?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Status messages */}
          {changeOrder.status === 'approved' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-green-700 font-medium">Approved</span>
            </div>
          )}

          {changeOrder.status === 'contracted' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-600" />
              <span className="text-emerald-700 font-medium">Converted to Contract</span>
            </div>
          )}

          {!isReadyForApproval && changeOrder.status !== 'approved' && changeOrder.status !== 'contracted' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                Complete all checklist items before this change order can be approved.
              </p>
            </div>
          )}

          {/* Approval Actions */}
          {canApprove && (
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowRejectDialog(true)}
              >
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => setShowApproveDialog(true)}
              >
                <Check className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Confirmation */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Change Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this change order for{' '}
              <strong>${changeOrder.final_price?.toFixed(2) || '0.00'}</strong>? This will create
              a contract and add it to the Schedule of Values.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Change Order</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this change order. The Trade Contractor will
              be able to make changes and resubmit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-notes">Rejection Reason *</Label>
            <Textarea
              id="rejection-notes"
              placeholder="Explain why this change order is being rejected..."
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
              className="bg-red-600 hover:bg-red-700"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { useState } from 'react';
import { ChangeOrderProject, ChangeOrderStatus, ChangeOrderChecklist } from '@/types/changeOrderProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Check, X, AlertTriangle, DollarSign, FileCheck } from 'lucide-react';
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
  checklist: ChangeOrderChecklist | null;
  isGC: boolean;
  hasFCParticipant: boolean;
  onUpdateStatus: (data: { id: string; status: ChangeOrderStatus; rejection_notes?: string }) => void;
  isUpdating?: boolean;
  linkedPOIsPriced?: boolean;
}

export function ApprovalPanel({
  changeOrder,
  checklist,
  isGC,
  hasFCParticipant,
  onUpdateStatus,
  isUpdating,
  linkedPOIsPriced,
}: ApprovalPanelProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);

  // Calculate if checklist is complete
  const isChecklistComplete = (() => {
    if (!checklist) return false;
    
    // Required items
    const locationComplete = checklist.location_complete ?? false;
    const scopeComplete = checklist.scope_complete ?? false;
    const tcPricingComplete = checklist.tc_pricing_complete ?? false;
    
    // Conditional items
    const fcHoursComplete = !hasFCParticipant || (checklist.fc_hours_locked ?? false);
    const materialsComplete = !changeOrder.requires_materials || linkedPOIsPriced || (checklist.materials_priced ?? false);
    const equipmentComplete = !changeOrder.requires_equipment || (checklist.equipment_priced ?? false);
    
    return locationComplete && scopeComplete && tcPricingComplete && 
           fcHoursComplete && materialsComplete && equipmentComplete;
  })();

  const handleFinalize = () => {
    // Setting status to 'approved' triggers the database trigger that:
    // 1. Creates a contract
    // 2. Creates an SOV item
    // 3. Sets status to 'contracted'
    onUpdateStatus({ id: changeOrder.id, status: 'approved' });
    setShowFinalizeDialog(false);
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

  // GC can finalize when checklist is complete and status is not already contracted
  const canFinalize = isGC && isChecklistComplete && 
    changeOrder.status !== 'contracted' && 
    changeOrder.status !== 'approved';

  // Pricing summary for GC - always show when any pricing exists (draft or submitted)
  const hasPricing = (changeOrder.labor_total ?? 0) > 0 || 
                     (changeOrder.material_total ?? 0) > 0 || 
                     (changeOrder.equipment_total ?? 0) > 0;
  const showPricingSummary = isGC && hasPricing;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="w-4 h-4" />
            Finalize Work Order
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Rejection notes (if previously rejected) */}
          {changeOrder.rejection_notes && changeOrder.status !== 'approved' && changeOrder.status !== 'contracted' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium text-sm">Previous Rejection</span>
              </div>
              <p className="text-sm text-red-600">{changeOrder.rejection_notes}</p>
            </div>
          )}

          {/* Pricing Summary for GC - show immediately when TC saves */}
          {isGC && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="w-4 h-4" />
                Trade Contractor Pricing {!showPricingSummary && '(Draft)'}
              </div>

              {showPricingSummary ? (
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
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Trade Contractor has not entered pricing yet.
                </p>
              )}
            </div>
          )}

          {/* Status messages */}
          {changeOrder.status === 'contracted' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-600" />
                <span className="text-emerald-700 font-medium">Finalized & Added to Schedule of Values</span>
              </div>
              <p className="text-sm text-emerald-600 mt-1">
                Trade Contractor can now bill against this Work Order.
              </p>
            </div>
          )}

          {!isChecklistComplete && changeOrder.status !== 'contracted' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                Complete all checklist items before this Work Order can be finalized.
              </p>
            </div>
          )}

          {isChecklistComplete && changeOrder.status !== 'contracted' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                ✓ All checklist items complete. Ready to finalize.
              </p>
            </div>
          )}

          {/* Finalize Actions */}
          {canFinalize && (
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowRejectDialog(true)}
                disabled={isUpdating}
              >
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => setShowFinalizeDialog(true)}
                disabled={isUpdating}
              >
                <Check className="w-4 h-4 mr-2" />
                Finalize Work Order
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Finalize Confirmation */}
      <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize Work Order</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to finalize this Work Order for{' '}
                <strong>${changeOrder.final_price?.toFixed(2) || '0.00'}</strong>?
              </p>
              <p className="font-medium">This will:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Create a contract between you and the Trade Contractor</li>
                <li>Add a line item to the Schedule of Values</li>
                <li>Allow the Trade Contractor to submit invoices for this work</li>
                {changeOrder.linked_po_id && (
                  <li>Finalize the linked material Purchase Order</li>
                )}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinalize}
              className="bg-green-600 hover:bg-green-700"
            >
              Finalize Work Order
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
              Please provide a reason for rejecting this Work Order. The Trade Contractor will
              be able to make changes and resubmit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-notes">Rejection Reason *</Label>
            <Textarea
              id="rejection-notes"
              placeholder="Explain why this Work Order is being rejected..."
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

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Send, CheckCircle, XCircle, DollarSign, Loader2, FileDown, Package, RotateCcw, Trash2, Edit, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
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
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { CreateInvoiceFromSOV, RevisionData } from './CreateInvoiceFromSOV';
import { Invoice, InvoiceLineItem, InvoiceStatus } from '@/types/invoice';
import { useNudge } from '@/hooks/useNudge';

interface InvoiceDetailProps {
  invoiceId: string;
  projectId: string;
  onBack: () => void;
  onUpdate: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function InvoiceDetail({ invoiceId, projectId, onBack, onUpdate }: InvoiceDetailProps) {
  const { user, userOrgRoles } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [contract, setContract] = useState<{ from_org_id: string | null; to_org_id: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [linkedPO, setLinkedPO] = useState<{ po_number: string; status: string } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [reviseDialogOpen, setReviseDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { sendNudge, loading: nudgeLoading, wasSent } = useNudge();

  // Get current user's organization ID
  const currentOrgId = userOrgRoles[0]?.organization?.id;

  // Determine user's role in this invoice's contract
  // Contract direction: from_org (contractor) → to_org (client)
  const isInvoiceCreator = contract?.from_org_id === currentOrgId; // from_org creates invoices
  const isInvoiceReceiver = contract?.to_org_id === currentOrgId; // to_org receives/approves

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    setLoading(true);
    const [invoiceRes, lineItemsRes] = await Promise.all([
      supabase.from('invoices').select('*').eq('id', invoiceId).single(),
      supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('sort_order'),
    ]);

    if (invoiceRes.data) {
      setInvoice(invoiceRes.data as Invoice);
      
      // Fetch contract to determine permissions
      if (invoiceRes.data.contract_id) {
        const { data: contractData } = await supabase
          .from('project_contracts')
          .select('from_org_id, to_org_id')
          .eq('id', invoiceRes.data.contract_id)
          .single();
        setContract(contractData);
      }

      // Fetch linked PO if po_id is set
      if (invoiceRes.data.po_id) {
        const { data: poData } = await supabase
          .from('purchase_orders')
          .select('po_number, status')
          .eq('id', invoiceRes.data.po_id)
          .single();
        setLinkedPO(poData);
      } else {
        setLinkedPO(null);
      }
    }
    if (lineItemsRes.data) setLineItems(lineItemsRes.data as InvoiceLineItem[]);
    setLoading(false);
  };

  const updateInvoiceStatus = async (
    newStatus: InvoiceStatus,
    additionalFields: Record<string, any> = {}
  ) => {
    if (!user || !invoice) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: newStatus,
          ...additionalFields,
        })
        .eq('id', invoiceId);

      if (error) throw error;

      // Update SOV billing totals when invoice status affects billing
      // (SUBMITTED, APPROVED, PAID affect the billed_to_date calculation)
      if (['SUBMITTED', 'APPROVED', 'PAID', 'REJECTED', 'DRAFT'].includes(newStatus)) {
        await supabase.rpc('update_sov_billing_totals', { p_project_id: projectId });
      }

      // Log activity
      const activityDescriptions: Record<InvoiceStatus, string> = {
        DRAFT: `Invoice ${invoice.invoice_number} reverted to draft`,
        SUBMITTED: `Invoice ${invoice.invoice_number} submitted for approval`,
        APPROVED: `Invoice ${invoice.invoice_number} approved`,
        REJECTED: `Invoice ${invoice.invoice_number} rejected`,
        PAID: `Invoice ${invoice.invoice_number} marked as paid`,
      };

      await supabase.from('project_activity').insert({
        project_id: projectId,
        activity_type: `INVOICE_${newStatus}`,
        description: activityDescriptions[newStatus],
        actor_user_id: user.id,
      });

      toast.success(`Invoice ${newStatus.toLowerCase()}`);
      fetchInvoice();
      onUpdate();
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      toast.error(error.message || 'Failed to update invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmit = () => {
    updateInvoiceStatus('SUBMITTED', {
      submitted_at: new Date().toISOString(),
      submitted_by: user?.id,
    });
  };

  const handleApprove = () => {
    updateInvoiceStatus('APPROVED', {
      approved_at: new Date().toISOString(),
      approved_by: user?.id,
    });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    updateInvoiceStatus('REJECTED', {
      rejected_at: new Date().toISOString(),
      rejected_by: user?.id,
      rejection_reason: rejectionReason,
    });
    setRejectDialogOpen(false);
    setRejectionReason('');
  };

  const handleMarkPaid = () => {
    updateInvoiceStatus('PAID', {
      paid_at: new Date().toISOString(),
    });
  };

  const handleRevise = () => {
    setReviseDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!invoice) return;
    setDeleteLoading(true);
    try {
      const { error: lineError } = await supabase
        .from('invoice_line_items')
        .delete()
        .eq('invoice_id', invoiceId);
      if (lineError) throw lineError;

      const { error: invError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);
      if (invError) throw invError;

      toast.success(`Invoice ${invoice.invoice_number} deleted`);
      onUpdate();
      onBack();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete invoice');
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  // Build revision data for the wizard
  const revisionData: RevisionData | undefined = invoice ? {
    contractId: invoice.contract_id || '',
    invoiceNumber: invoice.invoice_number,
    periodStart: invoice.billing_period_start,
    periodEnd: invoice.billing_period_end,
    notes: invoice.notes,
    revisionCount: (invoice as any).revision_count || 0,
    lineItems: lineItems
      .filter(li => (li as any).sov_item_id)
      .map(li => ({
        sov_item_id: (li as any).sov_item_id,
        billed_percent: (li as any).billed_percent || 0,
        current_billed: li.current_billed,
      })),
  } : undefined;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Invoice not found</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  // Contract-based permissions:
  // - isInvoiceCreator (from_org - contractor) can submit drafts
  // - isInvoiceReceiver (to_org - client) can approve/reject/mark paid
  const canSubmit = isInvoiceCreator;
  const canApprove = isInvoiceReceiver;
  const canRevise = canSubmit || invoice?.created_by === user?.id;
  const status = invoice.status as InvoiceStatus;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold truncate">{invoice.invoice_number}</h2>
              <InvoiceStatusBadge status={status} />
              {(invoice as any).revision_count > 0 && (
                <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  Rev {(invoice as any).revision_count}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              Billing Period: {format(new Date(invoice.billing_period_start), 'MMM d')} -{' '}
              {format(new Date(invoice.billing_period_end), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={exportLoading}
            onClick={async () => {
              setExportLoading(true);
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) {
                  toast.error('Please log in to export');
                  return;
                }
                const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invoice-download?invoice_id=${invoiceId}`;
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
                toast.error(err.message || 'Failed to export invoice');
              } finally {
                setExportLoading(false);
              }
            }}
          >
            {exportLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
            Export PDF
          </Button>

          {status === 'DRAFT' && canSubmit && (
            <>
              <Button variant="outline" onClick={handleRevise}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(true)} className="text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button onClick={handleSubmit} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Submit for Approval
              </Button>
            </>
          )}

          {status === 'SUBMITTED' && isInvoiceCreator && (
            <Button
              variant="outline"
              onClick={() => sendNudge('invoice', invoiceId)}
              disabled={nudgeLoading || wasSent('invoice', invoiceId)}
            >
              <Bell className="h-4 w-4 mr-2" />
              {wasSent('invoice', invoiceId) ? 'Reminder Sent' : 'Send Reminder'}
            </Button>
          )}

          {status === 'SUBMITTED' && canApprove && (
            <>
              <Button variant="outline" onClick={() => setRejectDialogOpen(true)} disabled={actionLoading}>
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button onClick={handleApprove} disabled={actionLoading}>
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Approve
              </Button>
            </>
          )}

          {status === 'APPROVED' && canApprove && (
            <Button onClick={handleMarkPaid} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <DollarSign className="h-4 w-4 mr-2" />
              )}
              Mark as Paid
            </Button>
          )}
        </div>
      </div>

      {/* Source PO Reference */}
      {linkedPO && (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  Created from Purchase Order
                </p>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  {linkedPO.po_number} — Status: {linkedPO.status}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejection Notice */}
      {status === 'REJECTED' && invoice.rejection_reason && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">Rejection Reason:</p>
                <p className="text-sm text-red-700 dark:text-red-300">{invoice.rejection_reason}</p>
              </div>
              {canRevise && (
                <Button onClick={handleRevise} disabled={actionLoading} size="sm">
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                  Revise & Resubmit
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Scheduled Value</TableHead>
                <TableHead className="text-right">Previously Billed</TableHead>
                <TableHead className="text-right">This Period</TableHead>
                <TableHead className="text-right">Total Billed</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">% Complete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => {
                const percentComplete =
                  item.scheduled_value > 0
                    ? ((item.total_billed / item.scheduled_value) * 100).toFixed(1)
                    : '0';
                const remaining = item.scheduled_value - item.total_billed;
                const isOverbilled = remaining < 0;

                return (
                  <TableRow key={item.id} className={isOverbilled ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.scheduled_value)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.previous_billed)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.current_billed)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.total_billed)}</TableCell>
                    <TableCell className={`text-right font-medium ${isOverbilled ? 'text-red-600 dark:text-red-400' : ''}`}>
                      {formatCurrency(remaining)}
                      {isOverbilled && ' ⚠'}
                    </TableCell>
                    <TableCell className={`text-right ${parseFloat(percentComplete) > 100 ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}>
                      {percentComplete}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="text-right font-medium">
                  Subtotal
                </TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(invoice.subtotal)}</TableCell>
                <TableCell colSpan={3}></TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} className="text-right font-medium">
                  Retainage Withheld
                </TableCell>
                <TableCell className="text-right font-medium text-amber-600">
                  -{formatCurrency(invoice.retainage_amount)}
                </TableCell>
                <TableCell colSpan={3}></TableCell>
              </TableRow>
              <TableRow className="bg-muted/50">
                <TableCell colSpan={3} className="text-right font-bold">
                  Total Due
                </TableCell>
                <TableCell className="text-right font-bold text-lg">{formatCurrency(invoice.total_amount)}</TableCell>
                <TableCell colSpan={3}></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Rejection Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this invoice. This will be visible to the submitter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter rejection reason..."
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} className="bg-destructive text-destructive-foreground">
              Reject Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice {invoice?.invoice_number}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revision Wizard */}
      {invoice && revisionData && (
        <CreateInvoiceFromSOV
          open={reviseDialogOpen}
          onOpenChange={setReviseDialogOpen}
          projectId={projectId}
          onSuccess={() => {
            fetchInvoice();
            onUpdate();
          }}
          revisionInvoiceId={invoice.id}
          revisionData={revisionData}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Send, CheckCircle, XCircle, DollarSign, Loader2, FileDown, Package, RotateCcw, Trash2, Edit, Ban, Bell, Pencil, Check, X, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import { InvoiceExternalInviteDialog } from './InvoiceExternalInviteDialog';
import { InvoiceTimeline, invoicePaceLabel } from './InvoiceTimeline';
import { RecordPaymentDialog, PaymentDetails } from './RecordPaymentDialog';
import {
  attachInvoicePdf,
  clearInvoicePdf,
  getAttachPdfPreference,
  setAttachPdfPreference,
} from '@/lib/invoicePdf';
import { getInvoiceLineScopeText, hasInvoiceLineScopeText } from '@/lib/invoiceLineScope';


interface InvoiceDetailProps {
  invoiceId: string;
  confirmSubmission?: boolean;
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

export function InvoiceDetail({ invoiceId, projectId, onBack, onUpdate, confirmSubmission = false }: InvoiceDetailProps) {
  const { user, userOrgRoles } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [contract, setContract] = useState<{ from_org_id: string | null; to_org_id: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(confirmSubmission);
  const [attachPdf, setAttachPdf] = useState(getAttachPdfPreference);
  const [lineRejections, setLineRejections] = useState<Record<string, string>>({});
  const [linkedPO, setLinkedPO] = useState<{ po_number: string; status: string; pricing_owner_org_id: string | null; supplier_org_id: string | null } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [reviseDialogOpen, setReviseDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { sendNudge, loading: nudgeLoading, wasSent } = useNudge();
  const [showFullNotes, setShowFullNotes] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [externalInviteOpen, setExternalInviteOpen] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const startEditLine = (item: InvoiceLineItem) => {
    setEditingItemId(item.id);
    setEditDescription(item.description || '');
    setEditNotes(item.line_notes || '');
    setEditAmount(String(item.current_billed ?? 0));
  };

  const cancelEditLine = () => {
    setEditingItemId(null);
    setEditDescription('');
    setEditNotes('');
  };

  const saveEditLine = async (itemId: string) => {
    const desc = editDescription.trim();
    if (!desc) {
      toast.error('Description is required');
      return;
    }
    if (desc.length > 500) {
      toast.error('Description must be 500 characters or less');
      return;
    }
    if (editNotes.length > 5000) {
      toast.error('Scope notes must be 5000 characters or less');
      return;
    }
    if (invoice && (invoice.status === 'APPROVED' || invoice.status === 'PAID')) {
      toast.error('This invoice is locked and can no longer be edited');
      return;
    }
    const editing = lineItems.find(li => li.id === itemId);
    const amountEditable = !!editing && !(editing as any).sov_item_id && invoice?.status === 'DRAFT';
    const newAmount = amountEditable ? Math.round(Number(editAmount) * 100) / 100 : editing?.current_billed ?? 0;
    if (amountEditable && (!Number.isFinite(newAmount) || newAmount < 0)) {
      toast.error('Amount must be 0 or more');
      return;
    }
    setEditSaving(true);
    try {
      const patch: Record<string, any> = { description: desc, line_notes: editNotes.trim() || null };
      if (amountEditable && editing) {
        patch.current_billed = newAmount;
        patch.total_billed = Number(editing.previous_billed || 0) + newAmount;
        if (Number(editing.scheduled_value || 0) < patch.total_billed) patch.scheduled_value = patch.total_billed;
      }
      const { error } = await supabase
        .from('invoice_line_items')
        .update(patch)
        .eq('id', itemId);
      if (error) throw error;
      if (amountEditable && editing && invoice && newAmount !== editing.current_billed) {
        const delta = newAmount - Number(editing.current_billed || 0);
        // Order invoices keep tax as its own line outside the pre-tax subtotal.
        const subDelta = /\btax\b/i.test(desc) ? 0 : delta;
        const { error: invErr } = await supabase
          .from('invoices')
          .update({
            subtotal: Math.round((Number(invoice.subtotal) + delta) * 100) / 100,
            total_amount: Math.round((Number(invoice.total_amount) + delta) * 100) / 100,
          })
          .eq('id', invoice.id);
        if (invErr) throw invErr;
        setInvoice({ ...invoice, subtotal: Number(invoice.subtotal) + delta, total_amount: Number(invoice.total_amount) + delta });
      }
      setLineItems((prev) =>
        prev.map((li) =>
          li.id === itemId ? { ...li, ...patch } as InvoiceLineItem : li
        )
      );
      toast.success('Line item updated');
      cancelEditLine();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update line item');
    } finally {
      setEditSaving(false);
    }
  };

  // Get current user's organization ID
  const currentOrgId = userOrgRoles[0]?.organization?.id;

  // Determine user's role in this invoice.
  // - Contract-based invoices: from_org (contractor) creates, to_org (client) approves.
  // - PO-based supplier invoices (no contract): supplier org creates, pricing-owner org approves.
  const isInvoiceCreator =
    (contract?.from_org_id === currentOrgId) ||
    (!contract && !!linkedPO?.supplier_org_id && linkedPO.supplier_org_id === currentOrgId);
  const isInvoiceReceiver =
    (contract?.to_org_id === currentOrgId) ||
    (!contract && !!linkedPO?.pricing_owner_org_id && linkedPO.pricing_owner_org_id === currentOrgId);

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
        .order('sort_order')
        .order('source_co_id', { nullsFirst: true })
        .order('created_at'),
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
          .select('po_number, status, pricing_owner_org_id, supplier:suppliers!purchase_orders_supplier_id_fkey(organization_id)')
          .eq('id', invoiceRes.data.po_id)
          .single();
        if (poData) {
          setLinkedPO({
            po_number: poData.po_number,
            status: poData.status,
            pricing_owner_org_id: poData.pricing_owner_org_id ?? null,
            supplier_org_id: (poData as any).supplier?.organization_id ?? null,
          });
        } else {
          setLinkedPO(null);
        }
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
      const { data: updated, error } = await supabase
        .from('invoices')
        .update({
          status: newStatus,
          ...additionalFields,
        })
        .eq('id', invoiceId)
        .select('id');

      if (error) throw error;
      if (!updated || updated.length === 0) {
        throw new Error("You don't have permission to change this invoice's status.");
      }


      // Update SOV billing totals when invoice status affects billing
      // (SUBMITTED, APPROVED, PAID affect the billed_to_date calculation)
      if (['SUBMITTED', 'APPROVED', 'PAID', 'REJECTED', 'DRAFT', 'VOIDED'].includes(newStatus)) {
        await supabase.rpc('update_sov_billing_totals', { p_project_id: projectId });
      }

      // Log activity
      const activityDescriptions: Record<InvoiceStatus, string> = {
        DRAFT: `Invoice ${invoice.invoice_number} reverted to draft`,
        SUBMITTED: `Invoice ${invoice.invoice_number} submitted for approval`,
        APPROVED: `Invoice ${invoice.invoice_number} approved`,
        REJECTED: `Invoice ${invoice.invoice_number} rejected`,
        PAID: `Invoice ${invoice.invoice_number} marked as paid`,
        VOIDED: `Invoice ${invoice.invoice_number} voided`,
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
    setAttachPdf(getAttachPdfPreference());
    setSubmitDialogOpen(true);
  };

  const confirmSubmit = async () => {
    setSubmitDialogOpen(false);
    setAttachPdfPreference(attachPdf);
    setActionLoading(true);
    // The document has to exist before the status change fires the alert email.
    if (attachPdf) {
      const url = await attachInvoicePdf(invoiceId, true, showFullNotes);
      if (!url) toast.error('Could not build the PDF — submitting without it');
    } else {
      await clearInvoicePdf(invoiceId);
    }
    setActionLoading(false);
    await updateInvoiceStatus('SUBMITTED', {
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

  const rejectedIds = Object.keys(lineRejections);
  const rejectedTotal = lineItems
    .filter(li => rejectedIds.includes(li.id))
    .reduce((s, li) => s + Number(li.current_billed || 0), 0);

  const handleReject = async () => {
    if (rejectedIds.length === 0) {
      toast.error('Select at least one line to reject');
      return;
    }
    if (rejectedIds.length >= lineItems.length) {
      toast.error('At least one line must stay approved — the whole invoice cannot be rejected');
      return;
    }
    if (rejectedIds.some(id => (lineRejections[id] || '').trim().length < 3)) {
      toast.error('Give a reason for each rejected line');
      return;
    }
    setActionLoading(true);
    const { data, error } = await supabase.rpc('approve_invoice_with_line_rejections' as any, {
      _invoice_id: invoiceId,
      _rejections: rejectedIds.map(id => ({ line_id: id, reason: lineRejections[id].trim() })),
    });
    setActionLoading(false);
    if (error) {
      toast.error(error.message || 'Could not approve the invoice');
      return;
    }
    toast.success(`Approved the rest; ${rejectedIds.length} line(s) returned to the sender${data ? '' : ''}`);
    setRejectDialogOpen(false);
    setLineRejections({});
    fetchInvoice();
    onUpdate();
  };

  const handleRecordPayment = (details: PaymentDetails) => {
    updateInvoiceStatus('PAID', {
      paid_at: details.paid_at,
      paid_by: user?.id,
      payment_method: details.payment_method,
      payment_reference: details.payment_reference,
      payment_note: details.payment_note,
    });
    setPaymentDialogOpen(false);
  };

  const handleVoid = () => {
    if (voidReason.trim().length < 3) {
      toast.error('Please provide a reason for voiding this invoice');
      return;
    }
    updateInvoiceStatus('VOIDED', {
      voided_at: new Date().toISOString(),
      voided_by: user?.id,
      void_reason: voidReason.trim(),
    });
    setVoidDialogOpen(false);
    setVoidReason('');
  };

  const handleRevise = () => {
    // SOV invoices use the SOV revision wizard; returned order/PO lines are fixed in place as a draft.
    const hasSovLines = lineItems.some(li => (li as any).sov_item_id);
    if (!hasSovLines && invoice?.status === 'REJECTED') {
      updateInvoiceStatus('DRAFT', { revision_count: ((invoice as any).revision_count || 0) + 1 });
      return;
    }
    setReviseDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!invoice) return;
    if (invoice.status !== 'DRAFT') {
      toast.error('Only draft invoices can be deleted. Void this invoice instead to keep the audit trail.');
      setDeleteDialogOpen(false);
      return;
    }
    setDeleteLoading(true);
    try {
      const { error: lineError } = await supabase
        .from('invoice_line_items')
        .delete()
        .eq('invoice_id', invoiceId);
      if (lineError) throw lineError;

      const { data: deleted, error: invError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)
        .select('id');
      if (invError) throw invError;
      if (!deleted || deleted.length === 0) {
        throw new Error("You don't have permission to delete this invoice. Void it instead to keep the audit trail.");
      }

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
        <div className="flex items-center gap-4 min-w-0 sm:flex-1">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="min-w-0 max-w-full text-xl font-bold break-words [overflow-wrap:anywhere]">{invoice.invoice_number}</h2>
              <InvoiceStatusBadge status={status} />
              {(invoice as any).revision_count > 0 && (
                <span className="inline-flex items-center rounded-md bg-state-open-bg px-2 py-0.5 text-xs font-medium text-state-open-foreground">
                  Rev {(invoice as any).revision_count}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              Billing Period: {format(new Date(invoice.billing_period_start), 'MMM d')} -{' '}
              {format(new Date(invoice.billing_period_end), 'MMM d, yyyy')}
              {invoicePaceLabel(invoice) && (
                <span className="ml-2 font-mono text-xs">· {invoicePaceLabel(invoice)}</span>
              )}
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

          {(status === 'DRAFT' || status === 'SUBMITTED') && (
            <Button variant="outline" onClick={() => setExternalInviteOpen(true)}>
              <Share2 className="h-4 w-4 mr-2" />
              Send for External Approval
            </Button>
          )}

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
              {lineItems.length > 1 && (
                <Button variant="outline" onClick={() => { setLineRejections({}); setRejectDialogOpen(true); }} disabled={actionLoading}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject some lines
                </Button>
              )}
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
            <Button onClick={() => setPaymentDialogOpen(true)} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <DollarSign className="h-4 w-4 mr-2" />
              )}
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Lifecycle tracking */}
      <InvoiceTimeline invoice={invoice} />

      <RecordPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        amountLabel={`${invoice.invoice_number} (${formatCurrency(invoice.total_amount)})`}
        loading={actionLoading}
        onConfirm={handleRecordPayment}
      />


      {/* Source PO Reference */}
      {linkedPO && (
        <Card className="border-state-approved/30 bg-state-approved-bg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-state-approved" />
              <div>
                <p className="text-sm font-medium text-state-approved-foreground">
                  Created from Purchase Order
                </p>
                <p className="text-sm text-state-approved-foreground">
                  {linkedPO.po_number} — Status: {linkedPO.status}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voided Notice */}
      {status === 'VOIDED' && (
        <Card className="border-border bg-muted/40">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">
              This invoice was voided{invoice.voided_at ? ` on ${format(new Date(invoice.voided_at), 'MMM d, yyyy')}` : ''} and is excluded from all billing totals.
            </p>
            {invoice.void_reason && (
              <p className="text-sm text-muted-foreground mt-1">Reason: {invoice.void_reason}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rejection Notice */}
      {status === 'REJECTED' && invoice.rejection_reason && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
                <p className="text-sm text-destructive">{invoice.rejection_reason}</p>
              </div>
              {canRevise && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button onClick={handleRevise} disabled={actionLoading} size="sm">
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                    Revise & Resubmit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVoidDialogOpen(true)}
                    disabled={actionLoading}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Void
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          {hasInvoiceLineScopeText(lineItems) && (
            <div className="flex items-center gap-2">
              <Switch id="show-full-notes" checked={showFullNotes} onCheckedChange={setShowFullNotes} />
              <Label htmlFor="show-full-notes" className="text-sm text-muted-foreground cursor-pointer">
                Show full scope
              </Label>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile: stacked cards */}
          <div className="sm:hidden divide-y divide-border">
            {lineItems.map((item) => {
              const percentComplete = item.scheduled_value > 0
                ? ((item.total_billed / item.scheduled_value) * 100).toFixed(1)
                : '0';
              const remaining = item.scheduled_value - item.total_billed;
              const isOverbilled = remaining < 0;
              const noteText = getInvoiceLineScopeText(item, showFullNotes);
              return (
                <div key={`m-${item.id}`} className={`p-3 ${isOverbilled ? 'bg-destructive/10' : ''}`}>
                  <div className="text-sm font-medium mb-2 break-words">{item.description}</div>
                  {(item as any).rejection_reason && (
                    <div className="text-xs text-destructive mb-2 break-words">Rejected: {(item as any).rejection_reason}</div>
                  )}
                  {noteText && (
                    <div className="text-xs text-muted-foreground mb-2 whitespace-pre-wrap">{noteText}</div>
                  )}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <div className="text-muted-foreground">Scheduled</div>
                    <div className="text-right font-mono tabular-nums">{formatCurrency(item.scheduled_value)}</div>
                    <div className="text-muted-foreground">Previously billed</div>
                    <div className="text-right font-mono tabular-nums">{formatCurrency(item.previous_billed)}</div>
                    <div className="text-muted-foreground">This period</div>
                    <div className="text-right font-mono tabular-nums font-semibold">{formatCurrency(item.current_billed)}</div>
                    <div className="text-muted-foreground">Total billed</div>
                    <div className="text-right font-mono tabular-nums">{formatCurrency(item.total_billed)}</div>
                    <div className="text-muted-foreground">Remaining</div>
                    <div className={`text-right font-mono tabular-nums font-medium ${isOverbilled ? 'text-destructive' : ''}`}>
                      {formatCurrency(remaining)}{isOverbilled && ' ⚠'}
                    </div>
                    <div className="text-muted-foreground">% complete</div>
                    <div className={`text-right font-mono tabular-nums ${parseFloat(percentComplete) > 100 ? 'text-destructive font-medium' : ''}`}>
                      {percentComplete}%
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="p-3 bg-muted/40 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono tabular-nums font-semibold">{formatCurrency(invoice.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Retainage withheld</span><span className="font-mono tabular-nums text-state-open">-{formatCurrency(invoice.retainage_amount)}</span></div>
              <div className="flex justify-between pt-1 border-t border-border/60"><span className="font-semibold">Total due</span><span className="font-mono tabular-nums font-bold text-base">{formatCurrency(invoice.total_amount)}</span></div>
            </div>
          </div>

          {/* Desktop: full table */}
          <div className="hidden sm:block overflow-x-auto">

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
                  <TableRow key={item.id} className={isOverbilled ? 'bg-destructive/10' : ''}>
                    <TableCell className="font-medium align-top">
                      {editingItemId === item.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            maxLength={500}
                            placeholder="Description"
                            className="text-sm"
                          />
                          <Textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            maxLength={5000}
                            placeholder="Scope of work / notes (optional)"
                            rows={4}
                            className="text-xs font-normal"
                          />
                          {!(item as any).sov_item_id && status === 'DRAFT' && (
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              aria-label="Line amount"
                              placeholder="Amount"
                              className="text-sm w-40"
                            />
                          )}
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => saveEditLine(item.id)} disabled={editSaving}>
                              {editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              <span className="ml-1">Save</span>
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEditLine} disabled={editSaving}>
                              <X className="h-3 w-3" />
                              <span className="ml-1">Cancel</span>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="group">
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              {item.description}
                              {(item as any).rejection_reason && (
                                <div className="text-xs text-destructive font-normal mt-0.5">Rejected: {(item as any).rejection_reason}</div>
                              )}
                            </div>
                            {status !== 'APPROVED' && status !== 'PAID' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => startEditLine(item)}
                                title="Edit description"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          {(() => {
                            const text = getInvoiceLineScopeText(item, showFullNotes);
                            return text ? (
                              <div className="text-xs text-muted-foreground font-normal mt-1 whitespace-pre-wrap">
                                {text}
                              </div>
                            ) : null;
                          })()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.scheduled_value)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.previous_billed)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.current_billed)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.total_billed)}</TableCell>
                    <TableCell className={`text-right font-medium ${isOverbilled ? 'text-destructive' : ''}`}>
                      {formatCurrency(remaining)}
                      {isOverbilled && ' ⚠'}
                    </TableCell>
                    <TableCell className={`text-right ${parseFloat(percentComplete) > 100 ? 'text-destructive font-medium' : ''}`}>
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
                <TableCell className="text-right font-medium text-state-open">
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
          </div>
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

      {/* Submit Dialog */}
      <AlertDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit for approval</AlertDialogTitle>
            <AlertDialogDescription>
              {invoice?.invoice_number} will be sent to the approver for review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <Switch id="attach-invoice-pdf" checked={attachPdf} onCheckedChange={setAttachPdf} />
            <div className="space-y-1">
              <Label htmlFor="attach-invoice-pdf" className="text-sm font-medium">
                Include a PDF copy of this invoice
              </Label>
              <p className="text-xs text-muted-foreground">
                The notification email gets a secure download link to the invoice, good for 14 days.
              </p>
            </div>
          </div>
          {attachPdf && hasInvoiceLineScopeText(lineItems) && (
            <div className="flex items-center gap-3">
              <Switch id="attach-invoice-full-scope" checked={showFullNotes} onCheckedChange={setShowFullNotes} />
              <Label htmlFor="attach-invoice-full-scope">Include full scope in the PDF</Label>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmit}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Void Dialog */}
      <AlertDialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Voiding retires invoice {invoice.invoice_number} without deleting it. It stays in history for the audit
              trail, its number can't be reused, and it is excluded from all billing and financial totals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for voiding (required)"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            maxLength={500}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setVoidReason('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleVoid} className="bg-destructive text-destructive-foreground">
              Void Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejection Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject some lines</AlertDialogTitle>
            <AlertDialogDescription>
              Tick the lines you don't accept and say why. Everything else is approved now; the rejected lines go back to the sender as a separate invoice to fix and resubmit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[50vh] overflow-y-auto space-y-2">
            {lineItems.map(li => {
              const checked = li.id in lineRejections;
              return (
                <div key={li.id} className="rounded-lg border border-border p-2 space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 shrink-0"
                      checked={checked}
                      onChange={(e) => setLineRejections(prev => {
                        const next = { ...prev };
                        if (e.target.checked) next[li.id] = ''; else delete next[li.id];
                        return next;
                      })}
                    />
                    <span className="flex-1 min-w-0 text-sm break-words">{li.description}</span>
                    <span className="shrink-0 font-mono tabular-nums text-sm">{formatCurrency(li.current_billed)}</span>
                  </label>
                  {checked && (
                    <Input
                      value={lineRejections[li.id]}
                      onChange={(e) => setLineRejections(prev => ({ ...prev, [li.id]: e.target.value }))}
                      placeholder="Reason for rejecting this line"
                      maxLength={500}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-sm flex justify-between gap-2">
            <span className="text-muted-foreground">Approving</span>
            <span className="font-mono tabular-nums font-semibold">{formatCurrency(lineItems.reduce((s, li) => s + Number(li.current_billed || 0), 0) - rejectedTotal)}</span>
          </div>
          <div className="text-sm flex justify-between gap-2 -mt-2">
            <span className="text-muted-foreground">Returning to sender</span>
            <span className="font-mono tabular-nums text-destructive">{formatCurrency(rejectedTotal)}</span>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={handleReject}
              disabled={actionLoading || rejectedIds.length === 0 || rejectedIds.length >= lineItems.length}
              variant="destructive"
            >
              Approve rest & return {rejectedIds.length || ''} line(s)
            </Button>
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

      <InvoiceExternalInviteDialog
        invoiceId={invoiceId}
        open={externalInviteOpen}
        onOpenChange={setExternalInviteOpen}
      />
    </div>
  );
}

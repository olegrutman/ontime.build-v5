import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Send,
  Edit,
  Trash2,
  DollarSign,
  Loader2,
  FileDown,
  Package,
  CheckCircle,
  Truck,
  Building2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { POStatusBadge } from './POStatusBadge';
import { PurchaseOrder, POLineItem, POStatus } from '@/types/purchaseOrder';

interface PODetailProps {
  poId: string;
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

export function PODetail({ poId, projectId, onBack, onUpdate }: PODetailProps) {
  const { user, userOrgRoles, currentRole } = useAuth();
  const [po, setPO] = useState<PurchaseOrder | null>(null);
  const [lineItems, setLineItems] = useState<POLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [supplierEmail, setSupplierEmail] = useState('');
  const [editingPrices, setEditingPrices] = useState(false);
  const [priceEdits, setPriceEdits] = useState<Record<string, number>>({});

  const currentOrgId = userOrgRoles[0]?.organization_id;
  const currentOrgType = userOrgRoles[0]?.organization?.type;
  const isSupplier = currentOrgType === 'SUPPLIER';
  const canEdit = (currentRole === 'GC_PM' || currentRole === 'TC_PM') && !isSupplier;

  useEffect(() => {
    fetchPO();
  }, [poId]);

  const fetchPO = async () => {
    setLoading(true);
    const [poRes, lineItemsRes] = await Promise.all([
      supabase
        .from('purchase_orders')
        .select(
          `
          *,
          supplier:suppliers(id, name, supplier_code, contact_info),
          project:projects(id, name),
          work_item:work_items(id, title)
        `
        )
        .eq('id', poId)
        .single(),
      supabase
        .from('po_line_items')
        .select('*')
        .eq('po_id', poId)
        .order('line_number'),
    ]);

    if (poRes.data) {
      setPO(poRes.data as unknown as PurchaseOrder);
      // Pre-fill supplier email from contact_info
      const contactInfo = poRes.data.supplier?.contact_info;
      if (contactInfo) {
        // Try to extract email from contact_info (could be JSON or plain text)
        try {
          const parsed = JSON.parse(contactInfo);
          setSupplierEmail(parsed.email || '');
        } catch {
          // If it looks like an email, use it
          if (contactInfo.includes('@')) {
            setSupplierEmail(contactInfo);
          }
        }
      }
    }
    if (lineItemsRes.data) setLineItems(lineItemsRes.data as POLineItem[]);
    setLoading(false);
  };

  const updatePOStatus = async (newStatus: POStatus, additionalFields: Record<string, unknown> = {}) => {
    if (!user || !po) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          status: newStatus,
          ...additionalFields,
        })
        .eq('id', poId);

      if (error) throw error;

      toast.success(`PO ${newStatus.toLowerCase()}`);
      fetchPO();
      onUpdate();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update PO';
      console.error('Error updating PO:', error);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitToSupplier = async () => {
    if (!supplierEmail || !supplierEmail.includes('@')) {
      toast.error('Please enter a valid supplier email');
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-po', {
        body: { po_id: poId, supplier_email: supplierEmail },
      });

      if (error) throw error;

      // Update status to SUBMITTED
      await supabase
        .from('purchase_orders')
        .update({
          status: 'SUBMITTED',
          submitted_at: new Date().toISOString(),
          submitted_by: user?.id,
        })
        .eq('id', poId);

      toast.success('PO sent to supplier');
      setSubmitDialogOpen(false);
      fetchPO();
      onUpdate();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send PO';
      console.error('Error sending PO:', error);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!po) return;

    setActionLoading(true);
    try {
      // Delete line items first
      await supabase.from('po_line_items').delete().eq('po_id', poId);
      // Delete PO
      const { error } = await supabase.from('purchase_orders').delete().eq('id', poId);

      if (error) throw error;

      toast.success('PO deleted');
      onBack();
      onUpdate();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete PO';
      console.error('Error deleting PO:', error);
      toast.error(message);
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleSavePrices = async () => {
    if (!user) return;

    setActionLoading(true);
    try {
      // Update each line item with its price
      for (const [itemId, price] of Object.entries(priceEdits)) {
        const item = lineItems.find((li) => li.id === itemId);
        if (item) {
          const lineTotal = price * item.quantity;
          await supabase
            .from('po_line_items')
            .update({
              unit_price: price,
              line_total: lineTotal,
            })
            .eq('id', itemId);
        }
      }

      // Update PO status to PRICED
      await supabase
        .from('purchase_orders')
        .update({
          status: 'PRICED',
          priced_at: new Date().toISOString(),
          priced_by: user.id,
        })
        .eq('id', poId);

      toast.success('Pricing saved');
      setEditingPrices(false);
      setPriceEdits({});
      fetchPO();
      onUpdate();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save pricing';
      console.error('Error saving prices:', error);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkOrdered = () => {
    updatePOStatus('ORDERED', { ordered_at: new Date().toISOString() });
  };

  const handleMarkDelivered = () => {
    updatePOStatus('DELIVERED', { delivered_at: new Date().toISOString() });
  };

  const handleDownload = () => {
    if (!po?.download_token) {
      toast.error('Download not available');
      return;
    }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/po-download?token=${po.download_token}&format=pdf`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Purchase Order not found</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const status = po.status as POStatus;
  const total = lineItems.reduce((sum, item) => sum + (item.line_total || 0), 0);
  const hasPricing = lineItems.some((item) => item.unit_price !== null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">{po.po_number}</h2>
              <POStatusBadge status={status} />
            </div>
            <p className="text-sm text-muted-foreground">{po.po_name}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {po.download_token && (
            <Button variant="outline" onClick={handleDownload}>
              <FileDown className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}

          {/* ACTIVE: Edit, Delete, Submit */}
          {status === 'ACTIVE' && canEdit && (
            <>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button onClick={() => setSubmitDialogOpen(true)}>
                <Send className="h-4 w-4 mr-2" />
                Submit to Supplier
              </Button>
            </>
          )}

          {/* SUBMITTED: Supplier can add pricing */}
          {status === 'SUBMITTED' && isSupplier && (
            <Button onClick={() => setEditingPrices(true)}>
              <DollarSign className="h-4 w-4 mr-2" />
              Add Pricing
            </Button>
          )}

          {/* PRICED: Supplier can mark ordered */}
          {status === 'PRICED' && isSupplier && (
            <Button onClick={handleMarkOrdered} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Mark Ordered
            </Button>
          )}

          {/* ORDERED: Supplier can mark delivered */}
          {status === 'ORDERED' && isSupplier && (
            <Button onClick={handleMarkDelivered} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Truck className="h-4 w-4 mr-2" />
              )}
              Mark Delivered
            </Button>
          )}
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Supplier</p>
              <p className="font-medium flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {po.supplier?.name || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Project</p>
              <p className="font-medium">{po.project?.name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Work Order</p>
              <p className="font-medium">{po.work_item?.title || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="font-medium">{format(new Date(po.created_at), 'MMM d, yyyy')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Line Items
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>UOM</TableHead>
                {(hasPricing || editingPrices) && (
                  <>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => {
                const editPrice = priceEdits[item.id] ?? item.unit_price ?? 0;
                const lineTotal = editPrice * item.quantity;

                return (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground">{item.line_number}</TableCell>
                    <TableCell className="font-mono text-sm">{item.supplier_sku || '—'}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.description}</p>
                        {item.length_ft && item.computed_lf && (
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} pcs @ {item.length_ft}' = {item.computed_lf} LF
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-xs text-muted-foreground">{item.notes}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                    <TableCell>{item.uom}</TableCell>
                    {(hasPricing || editingPrices) && (
                      <>
                        <TableCell className="text-right">
                          {editingPrices ? (
                            <Input
                              type="number"
                              step="0.01"
                              className="w-24 text-right"
                              value={editPrice}
                              onChange={(e) =>
                                setPriceEdits((prev) => ({
                                  ...prev,
                                  [item.id]: parseFloat(e.target.value) || 0,
                                }))
                              }
                            />
                          ) : item.unit_price !== null ? (
                            formatCurrency(item.unit_price)
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {editingPrices || item.line_total !== null
                            ? formatCurrency(editingPrices ? lineTotal : (item.line_total || 0))
                            : '—'}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
            {(hasPricing || editingPrices) && (
              <TableFooter>
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={5} className="text-right font-bold">
                    Total
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-bold text-lg">
                    {formatCurrency(
                      editingPrices
                        ? lineItems.reduce((sum, item) => {
                            const price = priceEdits[item.id] ?? item.unit_price ?? 0;
                            return sum + price * item.quantity;
                          }, 0)
                        : total
                    )}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      {/* Editing Prices Footer */}
      {editingPrices && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => {
            setEditingPrices(false);
            setPriceEdits({});
          }}>
            Cancel
          </Button>
          <Button onClick={handleSavePrices} disabled={actionLoading}>
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Pricing
          </Button>
        </div>
      )}

      {/* Notes */}
      {po.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{po.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {po.po_number}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit to Supplier Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit to Supplier</DialogTitle>
            <DialogDescription>
              Send this purchase order to the supplier for pricing and fulfillment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="supplier-email">Supplier Email</Label>
              <Input
                id="supplier-email"
                type="email"
                placeholder="supplier@example.com"
                value={supplierEmail}
                onChange={(e) => setSupplierEmail(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>The supplier will receive:</p>
              <ul className="list-disc list-inside mt-1">
                <li>Email with PO details</li>
                <li>PDF download link</li>
                <li>CSV download for ERP import</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitToSupplier} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send to Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

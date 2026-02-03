import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Send,
  Trash2,
  DollarSign,
  Loader2,
  FileDown,
  Package,
  CheckCircle,
  Truck,
  Building2,
  Clock,
  Lock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePOPricingVisibility } from '@/hooks/usePOPricingVisibility';
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
import { POStatusBadge } from './POStatusBadge';
import { PurchaseOrder, POLineItem, POStatus } from '@/types/purchaseOrder';

interface PODetailProps {
  poId: string;
  projectId: string;
  onBack: () => void;
  onUpdate: () => void;
}

interface PriceEdit {
  unit_price: number;
  lead_time_days: number | null;
  supplier_notes: string;
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
  const [editingPrices, setEditingPrices] = useState(false);
  const [priceEdits, setPriceEdits] = useState<Record<string, PriceEdit>>({});

  const currentOrgId = userOrgRoles[0]?.organization_id;
  const currentOrgType = userOrgRoles[0]?.organization?.type;
  
  // Use the pricing visibility hook
  const { canViewPricing, canEditPricing, canFinalize, isSupplier, isPricingOwner } = usePOPricingVisibility(
    po,
    currentOrgId || null
  );
  
  // Fall back to legacy supplier check if needed (for backward compatibility)
  const isSupplierOrg = currentOrgType === 'SUPPLIER';
  const effectiveIsSupplier = isSupplier || isSupplierOrg;
  
  const canEdit = (currentRole === 'GC_PM' || currentRole === 'TC_PM' || currentRole === 'FC_PM') && !effectiveIsSupplier;
  const canDelete = canEdit && po?.status === 'ACTIVE';

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
          supplier:suppliers(id, name, supplier_code, contact_info, organization_id),
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
    if (!user || !po) return;

    setActionLoading(true);
    try {
      // Update status to SUBMITTED - supplier will see it on their project page
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'SUBMITTED',
          submitted_at: new Date().toISOString(),
          submitted_by: user.id,
        })
        .eq('id', poId);

      if (error) throw error;

      toast.success('PO submitted to supplier for pricing');
      fetchPO();
      onUpdate();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to submit PO';
      console.error('Error submitting PO:', error);
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

  const initializePriceEdits = () => {
    const edits: Record<string, PriceEdit> = {};
    lineItems.forEach(item => {
      edits[item.id] = {
        unit_price: item.unit_price ?? 0,
        lead_time_days: item.lead_time_days ?? null,
        supplier_notes: item.supplier_notes ?? '',
      };
    });
    setPriceEdits(edits);
    setEditingPrices(true);
  };

  const handleSavePrices = async () => {
    if (!user) return;

    setActionLoading(true);
    try {
      // Update each line item with its price and lead time
      for (const [itemId, edit] of Object.entries(priceEdits)) {
        const item = lineItems.find((li) => li.id === itemId);
        if (item) {
          const lineTotal = edit.unit_price * item.quantity;
          await supabase
            .from('po_line_items')
            .update({
              unit_price: edit.unit_price,
              line_total: lineTotal,
              lead_time_days: edit.lead_time_days,
              supplier_notes: edit.supplier_notes || null,
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

  const handleFinalize = () => {
    updatePOStatus('FINALIZED');
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
  
  // Only show pricing columns if user can view pricing AND there is pricing data (or editing)
  const showPricingColumns = canViewPricing && (hasPricing || editingPrices);

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
              <Button onClick={handleSubmitToSupplier} disabled={actionLoading}>
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit to Supplier
              </Button>
            </>
          )}

          {/* SUBMITTED: Supplier can add pricing */}
          {status === 'SUBMITTED' && canEditPricing && (
            <Button onClick={initializePriceEdits}>
              <DollarSign className="h-4 w-4 mr-2" />
              Add Pricing
            </Button>
          )}

          {/* PRICED: Pricing owner can finalize, Supplier can mark ordered */}
          {status === 'PRICED' && (
            <>
              {canFinalize && (
                <Button onClick={handleFinalize} disabled={actionLoading} variant="default">
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  Finalize Order
                </Button>
              )}
              {effectiveIsSupplier && (
                <Button onClick={handleMarkOrdered} disabled={actionLoading}>
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Mark Ordered
                </Button>
              )}
            </>
          )}

          {/* ORDERED: Supplier can mark delivered */}
          {status === 'ORDERED' && effectiveIsSupplier && (
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

      {/* Pricing Visibility Notice */}
      {!canViewPricing && hasPricing && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <Lock className="h-4 w-4" />
              <p className="text-sm">
                Pricing information is managed by another organization and is not visible to you.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
                {showPricingColumns && (
                  <>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    {editingPrices && <TableHead className="text-center">Lead Time</TableHead>}
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => {
                const edit = priceEdits[item.id];
                const displayPrice = editingPrices ? (edit?.unit_price ?? 0) : (item.unit_price ?? 0);
                const lineTotal = displayPrice * item.quantity;

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
                        {/* Show supplier notes if viewing and they exist */}
                        {!editingPrices && item.supplier_notes && canViewPricing && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Supplier: {item.supplier_notes}
                          </p>
                        )}
                        {/* Show lead time if viewing and it exists */}
                        {!editingPrices && item.lead_time_days && canViewPricing && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {item.lead_time_days} day lead time
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                    <TableCell>{item.uom}</TableCell>
                    {showPricingColumns && (
                      <>
                        <TableCell className="text-right">
                          {editingPrices ? (
                            <Input
                              type="number"
                              step="0.01"
                              className="w-24 text-right"
                              value={edit?.unit_price ?? 0}
                              onChange={(e) =>
                                setPriceEdits((prev) => ({
                                  ...prev,
                                  [item.id]: {
                                    ...prev[item.id],
                                    unit_price: parseFloat(e.target.value) || 0,
                                  },
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
                        {editingPrices && (
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Input
                                type="number"
                                placeholder="Days"
                                className="w-20"
                                value={edit?.lead_time_days ?? ''}
                                onChange={(e) =>
                                  setPriceEdits((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      lead_time_days: e.target.value ? parseInt(e.target.value) : null,
                                    },
                                  }))
                                }
                              />
                            </div>
                          </TableCell>
                        )}
                      </>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
            {showPricingColumns && (
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
                            const price = priceEdits[item.id]?.unit_price ?? item.unit_price ?? 0;
                            return sum + price * item.quantity;
                          }, 0)
                        : total
                    )}
                  </TableCell>
                  {editingPrices && <TableCell></TableCell>}
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

    </div>
  );
}

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
  Receipt,
  Bell,
} from 'lucide-react';
import { useNudge } from '@/hooks/useNudge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePOPricingVisibility } from '@/hooks/usePOPricingVisibility';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { POActivityTimeline } from './POActivityTimeline';
import { CreateInvoiceFromPO } from './CreateInvoiceFromPO';
import { CreateSupplierInvoiceFromPO } from './CreateSupplierInvoiceFromPO';
import { PurchaseOrder, POLineItem, POStatus } from '@/types/purchaseOrder';

interface PODetailProps {
  poId: string;
  projectId: string;
  onBack: () => void;
  onUpdate: () => void;
  hidePricingOverride?: boolean;
}

interface PriceEdit {
  unit_price: number;
  lead_time_days: number | null;
  supplier_notes: string;
  adjustment_reason: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getPOFetchErrorMessage(error: { code?: string; message?: string } | null) {
  if (!error) return 'Purchase Order not found';
  if (error.code === 'PGRST116') return 'Purchase Order not found';
  if (error.code === '42501') return 'You do not have access to this purchase order';
  return error.message || 'Failed to load purchase order';
}

export function PODetail({ poId, projectId, onBack, onUpdate, hidePricingOverride = false }: PODetailProps) {
  const { user, userOrgRoles, currentRole } = useAuth();
  const [po, setPO] = useState<PurchaseOrder | null>(null);
  const [lineItems, setLineItems] = useState<POLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);
  const [editingPrices, setEditingPrices] = useState(false);
  const [priceEdits, setPriceEdits] = useState<Record<string, PriceEdit>>({});
  const [salesTaxPercent, setSalesTaxPercent] = useState<number>(0);
  const [billToGCOpen, setBillToGCOpen] = useState(false);
  const [supplierInvoiceOpen, setSupplierInvoiceOpen] = useState(false);
  const [hasTCtoGCContract, setHasTCtoGCContract] = useState(false);
  const [alreadyInvoiced, setAlreadyInvoiced] = useState(false);

  const currentOrgId = userOrgRoles[0]?.organization_id;
  const currentOrgType = userOrgRoles[0]?.organization?.type;
  const { sendNudge, loading: nudgeLoading, wasSent } = useNudge();
  
  const pricingVis = usePOPricingVisibility(
    po,
    currentOrgId || null
  );
  const canViewPricing = hidePricingOverride ? false : pricingVis.canViewPricing;
  const canEditPricing = hidePricingOverride ? false : pricingVis.canEditPricing;
  const { isSupplier, isPricingOwner } = pricingVis;
  
  const isSupplierOrg = currentOrgType === 'SUPPLIER';
  const effectiveIsSupplier = isSupplier || isSupplierOrg;
  
  const canEdit = (currentRole === 'GC_PM' || currentRole === 'TC_PM' || currentRole === 'FC_PM') && !effectiveIsSupplier;
  const canDelete = canEdit && po?.status === 'ACTIVE';

  useEffect(() => {
    fetchPO();
  }, [poId]);

  useEffect(() => {
    if (!currentOrgId || !projectId) return;
    
    const checkBillToGC = async () => {
      const [contractRes, invoiceRes] = await Promise.all([
        supabase
          .from('project_contracts')
          .select('id')
          .eq('project_id', projectId)
          .eq('from_org_id', currentOrgId)
          .eq('to_role', 'General Contractor')
          .limit(1),
        supabase
          .from('invoices')
          .select('id')
          .eq('po_id', poId)
          .limit(1),
      ]);
      setHasTCtoGCContract((contractRes.data?.length || 0) > 0);
      setAlreadyInvoiced((invoiceRes.data?.length || 0) > 0);
    };
    
    checkBillToGC();
  }, [currentOrgId, projectId, poId]);

  const fetchPO = async () => {
    setLoading(true);
    setDetailError(null);

    const [poRes, lineItemsRes] = await Promise.all([
      supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(id, name, supplier_code, contact_info, organization_id),
          project:projects(id, name)
        `)
        .eq('id', poId)
        .maybeSingle(),
      supabase
        .from('po_line_items')
        .select('*')
        .eq('po_id', poId)
        .order('line_number'),
    ]);

    if (poRes.error) {
      console.error('Error loading PO detail:', poRes.error);
      setPO(null);
      setLineItems([]);
      setDetailError(getPOFetchErrorMessage(poRes.error));
      setLoading(false);
      return;
    }

    if (lineItemsRes.error) {
      console.error('Error loading PO line items:', lineItemsRes.error);
      setDetailError(lineItemsRes.error.message || 'Failed to load purchase order line items');
    }

    if (!poRes.data) {
      setPO(null);
      setLineItems([]);
      setDetailError('Purchase Order not found');
      setLoading(false);
      return;
    }

    setPO(poRes.data as unknown as PurchaseOrder);
    setLineItems((lineItemsRes.data || []) as POLineItem[]);
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
      // Resolve supplier email — prefer designated supplier, fallback to contact_info
      let supplierEmail = '';
      if (po.project?.id) {
        const { data: ds } = await supabase
          .from('project_designated_suppliers')
          .select('po_email')
          .eq('project_id', po.project.id)
          .neq('status', 'removed')
          .maybeSingle();
        if (ds?.po_email) supplierEmail = ds.po_email;
      }
      if (!supplierEmail && po.supplier?.contact_info) {
        // contact_info may contain "email / phone" — extract just the email
        const emailMatch = po.supplier.contact_info.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
        if (emailMatch) supplierEmail = emailMatch[0];
      }

      if (!supplierEmail) {
        toast.error('No supplier email found. Please set up supplier contact.');
        setActionLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error('Please log in to submit POs');
        setActionLoading(false);
        return;
      }

      // Send via edge function (handles status update to SUBMITTED)
      const { error: sendErr } = await supabase.functions.invoke('send-po', {
        body: { po_id: poId, supplier_email: supplierEmail },
      });
      if (sendErr) throw sendErr;

      toast.success('PO submitted and sent to supplier');
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
      await supabase.from('po_line_items').delete().eq('po_id', poId);
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
        adjustment_reason: item.adjustment_reason ?? '',
      };
    });
    setPriceEdits(edits);
    setSalesTaxPercent(po?.sales_tax_percent ?? 0);
    setEditingPrices(true);
  };

  // Compute the current grand total from price edits for display
  const computeEditTotal = () => {
    let subtotal = 0;
    for (const [itemId, edit] of Object.entries(priceEdits)) {
      const item = lineItems.find((li) => li.id === itemId);
      if (item) subtotal += edit.unit_price * item.quantity;
    }
    const tax = subtotal * (salesTaxPercent / 100);
    return subtotal + tax;
  };

  const savePriceEdits = async (lockPricing: boolean) => {
    if (!user) return;

    setActionLoading(true);
    try {
      let estSubtotal = 0;
      let addSubtotal = 0;

      // Build all line item updates in parallel
      const updatePromises: Promise<void>[] = [];

      for (const [itemId, edit] of Object.entries(priceEdits)) {
        const item = lineItems.find((li) => li.id === itemId);
        if (item) {
          const lineTotal = edit.unit_price * item.quantity;
          const wasAdjusted = item.original_unit_price != null && edit.unit_price !== item.original_unit_price;
          const isNewPrice = item.original_unit_price == null;

          if (item.source_estimate_item_id) {
            estSubtotal += lineTotal;
          } else {
            addSubtotal += lineTotal;
          }

          const promise = supabase
              .from('po_line_items')
              .update({
                unit_price: edit.unit_price,
                line_total: lineTotal,
                lead_time_days: edit.lead_time_days,
                supplier_notes: edit.supplier_notes || null,
                original_unit_price: isNewPrice ? edit.unit_price : item.original_unit_price,
                price_adjusted_by_supplier: wasAdjusted,
                adjustment_reason: wasAdjusted ? (edit.adjustment_reason || null) : null,
                price_source: isNewPrice ? 'SUPPLIER_MANUAL' : (item.price_source || null),
              })
              .eq('id', itemId)
              .then(({ error }) => { if (error) throw error; });
          updatePromises.push(promise as unknown as Promise<void>);
        }
      }

      // Fire all line item updates in parallel
      await Promise.all(updatePromises);

      const poSubtotalTotal = estSubtotal + addSubtotal;
      const taxAmount = poSubtotalTotal * (salesTaxPercent / 100);
      const poTotal = poSubtotalTotal + taxAmount;

      const poUpdate: Record<string, unknown> = {
        sales_tax_percent: salesTaxPercent,
        po_subtotal_estimate_items: estSubtotal,
        po_subtotal_non_estimate_items: addSubtotal,
        po_subtotal_total: poSubtotalTotal,
        po_tax_total: taxAmount,
        po_total: poTotal,
        tax_percent_applied: salesTaxPercent,
      };
      if (lockPricing) {
        poUpdate.status = 'PRICED';
        poUpdate.priced_at = new Date().toISOString();
        poUpdate.priced_by = user.id;
      }
      const { error: statusError } = await supabase
        .from('purchase_orders')
        .update(poUpdate)
        .eq('id', poId);
      if (statusError) throw statusError;

      toast.success(lockPricing ? 'Pricing locked' : 'Pricing saved');
      setEditingPrices(false);
      setLockConfirmOpen(false);
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

  const [exportLoading, setExportLoading] = useState(false);
  const [estimateItemsMap, setEstimateItemsMap] = useState<Map<string, { description: string; supplier_sku: string | null; quantity: number; uom: string; unit_price: number }> | null>(null);

  useEffect(() => {
    if (!po?.source_estimate_id || !po?.source_pack_name) {
      setEstimateItemsMap(null);
      return;
    }
    const fetchEstimateItems = async () => {
      const { data } = await supabase
        .from('supplier_estimate_items')
        .select('id, description, supplier_sku, quantity, uom, unit_price')
        .eq('estimate_id', po.source_estimate_id!)
        .eq('pack_name', po.source_pack_name!);
      if (data) {
        const map = new Map<string, { description: string; supplier_sku: string | null; quantity: number; uom: string; unit_price: number }>();
        data.forEach((item: any) => map.set(item.id, item));
        setEstimateItemsMap(map);
      }
    };
    fetchEstimateItems();
  }, [po?.source_estimate_id, po?.source_pack_name]);

  const getRowStatus = (item: POLineItem): 'edited' | 'added' | null => {
    if (!estimateItemsMap) return null;
    if (!item.source_estimate_item_id) return 'added';
    const orig = estimateItemsMap.get(item.source_estimate_item_id);
    if (!orig) return 'added';
    if (item.quantity !== orig.quantity || (item.unit_price ?? 0) !== orig.unit_price) return 'edited';
    return null;
  };

  const deletedEstimateItems = (() => {
    if (!estimateItemsMap) return [];
    const usedIds = new Set(lineItems.map(li => li.source_estimate_item_id).filter(Boolean));
    return Array.from(estimateItemsMap.entries())
      .filter(([id]) => !usedIds.has(id))
      .map(([id, item]) => ({ id, ...item }));
  })();

  const handleDownload = async () => {
    setExportLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to download');
        return;
      }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/po-download?po_id=${poId}&format=pdf`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Download failed' }));
        throw new Error(err.error || `Download failed (${res.status})`);
      }
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download PO');
    } finally {
      setExportLoading(false);
    }
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
        <p className="text-muted-foreground">{detailError || 'Purchase Order not found'}</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const status = po.status as POStatus;
  const total = lineItems.reduce((sum, item) => sum + (item.line_total || 0), 0);
  const hasPricing = lineItems.some((item) => item.unit_price !== null);
  
  const showPricingColumns = canViewPricing && (hasPricing || editingPrices);

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
              <h2 className="text-xl font-bold truncate">{po.po_number}</h2>
              <POStatusBadge status={status} />
            </div>
            <p className="text-sm text-muted-foreground truncate">{po.po_name}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleDownload} disabled={exportLoading}>
            {exportLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
            Download
          </Button>

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

          {/* SUBMITTED: Buyer can send reminder to supplier */}
          {status === 'SUBMITTED' && !effectiveIsSupplier && canEdit && (
            <Button
              variant="outline"
              onClick={() => sendNudge('purchase_order', poId)}
              disabled={nudgeLoading || wasSent('purchase_order', poId)}
            >
              <Bell className="h-4 w-4 mr-2" />
              {wasSent('purchase_order', poId) ? 'Reminder Sent' : 'Send Reminder'}
            </Button>
          )}

          {/* SUBMITTED or PRICED: Supplier can add/edit pricing */}
          {(status === 'SUBMITTED' || status === 'PRICED') && canEditPricing && !editingPrices && (
            <Button onClick={initializePriceEdits}>
              <DollarSign className="h-4 w-4 mr-2" />
              Add / Edit Pricing
            </Button>
          )}

          {/* SUBMITTED: Supplier can skip pricing and mark ordered directly */}
          {status === 'SUBMITTED' && effectiveIsSupplier && !editingPrices && (
            <Button onClick={handleMarkOrdered} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Mark Ordered
            </Button>
          )}

          {/* PRICED: Supplier can mark ordered */}
          {status === 'PRICED' && effectiveIsSupplier && !editingPrices && (
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

          {/* DELIVERED: Supplier can create invoice */}
          {status === 'DELIVERED' && effectiveIsSupplier && !alreadyInvoiced && (
            <Button onClick={() => setSupplierInvoiceOpen(true)} disabled={actionLoading}>
              <Receipt className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          )}

          {/* Bill to GC: TC can create invoice from priced PO */}
          {currentRole === 'TC_PM' &&
            isPricingOwner &&
            hasTCtoGCContract &&
            !alreadyInvoiced &&
            ['PRICED', 'ORDERED', 'DELIVERED'].includes(status) && (
              <Button
                variant="default"
                onClick={() => setBillToGCOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Bill to GC
              </Button>
            )}
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Supplier</p>
              <p className="font-medium flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {po.supplier?.name || '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Project</p>
              <p className="font-medium">{po.project?.name || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Work Order</p>
              <p className="font-medium">{po.work_item?.title || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{format(new Date(po.created_at), 'MMM d, yyyy')}</p>
            </div>
            {po.delivered_at && (
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="font-medium flex items-center gap-1 text-green-600 dark:text-green-400">
                  <Truck className="h-4 w-4" />
                  {format(new Date(po.delivered_at), 'MMM d, yyyy')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <POActivityTimeline po={po} />

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
          {/* Diff legend */}
          {estimateItemsMap && estimateItemsMap.size > 0 && (
            <div className="flex flex-wrap gap-4 px-4 py-2 text-xs border-b">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-200 dark:bg-yellow-800 inline-block" /> Edited from estimate</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-200 dark:bg-green-800 inline-block" /> Added to PO</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-200 dark:bg-red-800 inline-block" /> Removed from estimate</span>
            </div>
          )}
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

                const rowStatus = getRowStatus(item);
                const rowClass = rowStatus === 'edited'
                  ? 'bg-yellow-50 dark:bg-yellow-900/20'
                  : rowStatus === 'added'
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : '';

                return (
                  <TableRow key={item.id} className={rowClass}>
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
                        {!editingPrices && item.supplier_notes && canViewPricing && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Supplier: {item.supplier_notes}
                          </p>
                        )}
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
              {/* Deleted estimate items */}
              {deletedEstimateItems.map((item) => (
                <TableRow key={`deleted-${item.id}`} className="bg-red-50 dark:bg-red-900/20">
                  <TableCell className="text-muted-foreground">—</TableCell>
                  <TableCell className="font-mono text-sm line-through text-muted-foreground">{item.supplier_sku || '—'}</TableCell>
                  <TableCell>
                    <p className="font-medium line-through text-muted-foreground">{item.description}</p>
                  </TableCell>
                  <TableCell className="text-right font-medium line-through text-muted-foreground">{item.quantity}</TableCell>
                  <TableCell className="text-muted-foreground">{item.uom}</TableCell>
                  {showPricingColumns && (
                    <>
                      <TableCell className="text-right text-muted-foreground">$0.00</TableCell>
                      <TableCell className="text-right text-muted-foreground">$0.00</TableCell>
                      {editingPrices && <TableCell />}
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
            {showPricingColumns && (() => {
              const subtotal = editingPrices
                ? lineItems.reduce((sum, item) => {
                    const price = priceEdits[item.id]?.unit_price ?? item.unit_price ?? 0;
                    return sum + price * item.quantity;
                  }, 0)
                : total;
              const taxPercent = editingPrices ? salesTaxPercent : (po.sales_tax_percent ?? 0);
              const taxAmount = subtotal * (taxPercent / 100);
              const grandTotal = subtotal + taxAmount;

              return (
                <TableFooter>
                  {(taxPercent > 0 || editingPrices) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-right font-medium">
                        Subtotal
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(subtotal)}
                      </TableCell>
                      {editingPrices && <TableCell></TableCell>}
                    </TableRow>
                  )}
                  
                  {editingPrices ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-right font-medium">
                        Sales Tax
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            max="100"
                            className="w-20 text-right"
                            value={salesTaxPercent}
                            onChange={(e) => setSalesTaxPercent(parseFloat(e.target.value) || 0)}
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(taxAmount)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ) : taxPercent > 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-right font-medium">
                        Sales Tax ({taxPercent}%)
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(taxAmount)}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={5} className="text-right font-bold">
                      {taxPercent > 0 || editingPrices ? 'Grand Total' : 'Total'}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      {formatCurrency(grandTotal)}
                    </TableCell>
                    {editingPrices && <TableCell></TableCell>}
                  </TableRow>
                </TableFooter>
              );
            })()}
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
          <Button variant="outline" onClick={() => savePriceEdits(false)} disabled={actionLoading}>
            {actionLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving {Object.keys(priceEdits).length} items…
              </>
            ) : (
              'Save Pricing'
            )}
          </Button>
          <Button onClick={() => setLockConfirmOpen(true)} disabled={actionLoading}>
            <Lock className="h-4 w-4 mr-2" />
            Lock Pricing
          </Button>
        </div>
      )}

      {/* Lock Pricing Confirmation Dialog */}
      <AlertDialog open={lockConfirmOpen} onOpenChange={setLockConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock Pricing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will lock pricing at{' '}
              <span className="font-semibold text-foreground">
                {formatCurrency(computeEditTotal())}
              </span>{' '}
              and mark the PO as <strong>Priced</strong>. The buyer will be notified. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => savePriceEdits(true)} disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Locking {Object.keys(priceEdits).length} items…
                </>
              ) : (
                'Confirm & Lock'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Bill to GC Dialog */}
      <CreateInvoiceFromPO
        open={billToGCOpen}
        onOpenChange={setBillToGCOpen}
        po={po}
        lineItems={lineItems}
        projectId={projectId}
        onSuccess={() => {
          setAlreadyInvoiced(true);
          onUpdate();
        }}
      />

      {/* Supplier Invoice Dialog */}
      <CreateSupplierInvoiceFromPO
        open={supplierInvoiceOpen}
        onOpenChange={setSupplierInvoiceOpen}
        po={po}
        lineItems={lineItems}
        projectId={projectId}
        onSuccess={() => {
          setAlreadyInvoiced(true);
          onUpdate();
        }}
      />

    </div>
  );
}

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { PurchaseOrder, POStatus, POLineItem, PO_STATUS_LABELS } from '@/types/purchaseOrder';
import { POWizardV2 } from '@/components/po-wizard-v2';
import { POWizardV2Data, POWizardV2LineItem } from '@/types/poWizardV2';
import { POCard, PODetail } from '@/components/purchase-orders';
import { Package } from 'lucide-react';

const STATUS_PRIORITY: Record<POStatus, number> = {
  ACTIVE: 0,
  SUBMITTED: 1,
  PRICED: 2,
  ORDERED: 3,
  DELIVERED: 4,
};

interface PurchaseOrdersTabProps {
  projectId: string;
  projectName?: string;
  projectAddress?: string;
  projectStatus?: string;
}

export function PurchaseOrdersTab({ projectId, projectName, projectAddress, projectStatus }: PurchaseOrdersTabProps) {
  const { userOrgRoles, currentRole, user, permissions } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [invoicedPOIds, setInvoicedPOIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [estimatePackTotals, setEstimatePackTotals] = useState<Map<string, { total: number; itemCount: number }>>(new Map());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [editWizardOpen, setEditWizardOpen] = useState(false);
  const [editInitialData, setEditInitialData] = useState<Partial<POWizardV2Data> | null>(null);

  const currentOrgId = userOrgRoles[0]?.organization_id;
  const currentOrgType = userOrgRoles[0]?.organization?.type;
  const isSupplier = currentOrgType === 'SUPPLIER';
  const canCreatePO = permissions?.canCreatePOs ?? false;

  useEffect(() => {
    fetchPurchaseOrders();
  }, [projectId, currentOrgId]);

  const fetchPurchaseOrders = async () => {
    setLoading(true);
    
    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(id, name, supplier_code, contact_info, organization_id),
        work_item:work_items(id, title),
        line_items:po_line_items(id, unit_price, line_total, quantity, source_estimate_item_id, source_pack_name, original_unit_price, price_adjusted_by_supplier)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    // Suppliers only see POs sent to them
    if (isSupplier) {
      const { data: supplierLinks } = await supabase
        .from('suppliers')
        .select('id')
        .eq('organization_id', currentOrgId);
      
      if (supplierLinks && supplierLinks.length > 0) {
        const supplierIds = supplierLinks.map(s => s.id);
        query = query.in('supplier_id', supplierIds);
        query = query.neq('status', 'ACTIVE');
      } else {
        setPurchaseOrders([]);
        setLoading(false);
        return;
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching POs:', error);
    } else {
      const pos = (data || []) as unknown as PurchaseOrder[];
      setPurchaseOrders(pos);

      // Fetch estimate pack totals for POs that came from estimates
      const packKeys = new Set<string>();
      const estimateIds = new Set<string>();
      for (const po of pos) {
        if (po.source_estimate_id && po.source_pack_name) {
          packKeys.add(`${po.source_estimate_id}|${po.source_pack_name}`);
          estimateIds.add(po.source_estimate_id);
        }
      }

      if (estimateIds.size > 0) {
        const { data: estItems } = await supabase
          .from('supplier_estimate_items')
          .select('estimate_id, pack_name, unit_price, quantity')
          .in('estimate_id', Array.from(estimateIds));

        const totalsMap = new Map<string, { total: number; itemCount: number }>();
        for (const item of estItems || []) {
          const key = `${item.estimate_id}|${item.pack_name || ''}`;
          if (!packKeys.has(key)) continue;
          const existing = totalsMap.get(key) || { total: 0, itemCount: 0 };
          existing.total += (item.unit_price || 0) * (item.quantity || 0);
          existing.itemCount += 1;
          totalsMap.set(key, existing);
        }
        setEstimatePackTotals(totalsMap);
      } else {
        setEstimatePackTotals(new Map());
      }

      // Fetch which POs have been invoiced
      const poIds = pos.map(p => p.id);
      if (poIds.length > 0) {
        const { data: invoicedData } = await supabase
          .from('invoices')
          .select('po_id')
          .eq('project_id', projectId)
          .in('po_id', poIds)
          .not('po_id', 'is', null);
        
        setInvoicedPOIds(new Set((invoicedData || []).map((inv: any) => inv.po_id)));
      }
    }
    setLoading(false);
  };

  const handleCreatePO = async (data: POWizardV2Data) => {
    if (!currentOrgId) return;
    
    setIsSubmitting(true);
    try {
      // Determine pricing owner based on material_responsibility from project contracts
      let pricingOwnerOrgId: string | null = null;
      
      // Query the project's contracts to find material_responsibility setting
      const { data: contracts } = await supabase
        .from('project_contracts')
        .select('material_responsibility, from_org_id, to_org_id')
        .eq('project_id', data.project_id)
        .not('material_responsibility', 'is', null);
      
      if (contracts && contracts.length > 0) {
        // Find the contract where material_responsibility is set
        const contractWithMR = contracts.find(c => c.material_responsibility);
        if (contractWithMR) {
          // If GC is responsible, to_org_id is the GC (payer)
          // If TC is responsible, from_org_id is the TC (contractor)
          pricingOwnerOrgId = contractWithMR.material_responsibility === 'GC' 
            ? contractWithMR.to_org_id 
            : contractWithMR.from_org_id;
        }
      }
      
      // Fallback: if no material_responsibility set, current org is pricing owner
      if (!pricingOwnerOrgId) {
        pricingOwnerOrgId = currentOrgId;
      }

      // Fetch estimate tax percent if PO is from an estimate
      let estimateTaxPercent = 0;
      if (data.source_estimate_id) {
        const { data: estData, error: estError } = await supabase
          .from('supplier_estimates')
          .select('sales_tax_percent')
          .eq('id', data.source_estimate_id)
          .single();
        if (estError) {
          console.warn('Failed to fetch estimate tax percent:', estError.message);
        }
        if (estData?.sales_tax_percent) {
          estimateTaxPercent = estData.sales_tax_percent;
        }
      }
      
      const { data: poNumber } = await supabase.rpc('generate_po_number', {
        org_id: currentOrgId,
      });

      const { data: newPO, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          organization_id: currentOrgId,
          po_number: poNumber,
          po_name: `PO for ${data.project_name || 'Materials'}`,
          supplier_id: data.supplier_id,
          project_id: data.project_id,
          notes: data.notes || null,
          status: 'ACTIVE',
          created_by_org_id: currentOrgId,
          pricing_owner_org_id: pricingOwnerOrgId,
          source_estimate_id: data.source_estimate_id || null,
          source_pack_name: data.source_pack_name || null,
          pack_modified: data.pack_modified || false,
          sales_tax_percent: estimateTaxPercent,
        })
        .select()
        .single();

      if (poError) throw poError;

      if (data.line_items.length > 0) {
        let estSubtotal = 0;
        let addSubtotal = 0;
        
        const lineItems = data.line_items.map((item, idx) => {
          const lineTotal = item.unit_price != null ? item.quantity * item.unit_price : null;
          if (item.source_estimate_item_id) {
            estSubtotal += lineTotal ?? 0;
          } else if (lineTotal != null) {
            addSubtotal += lineTotal;
          }
          return {
            po_id: newPO.id,
            line_number: idx + 1,
            supplier_sku: item.supplier_sku,
            description: item.name,
            quantity: item.quantity,
            uom: item.uom,
            pieces: item.unit_mode === 'BUNDLE' ? item.bundle_count : null,
            length_ft: item.length_ft || null,
            computed_lf: item.computed_lf || null,
            notes: item.item_notes || null,
            unit_price: item.unit_price ?? null,
            line_total: lineTotal,
            source_estimate_item_id: item.source_estimate_item_id || null,
            source_pack_name: item.source_pack_name || null,
            price_source: item.price_source || null,
            original_unit_price: item.unit_price ?? null,
          };
        });

        const { error: lineError } = await supabase.from('po_line_items').insert(lineItems);
        if (lineError) throw lineError;

        // Update PO-level totals with tax
        const poSubtotalTotal = estSubtotal + addSubtotal;
        const taxAmount = poSubtotalTotal * (estimateTaxPercent / 100);
        const poTotal = poSubtotalTotal + taxAmount;
        await supabase.from('purchase_orders').update({
          po_subtotal_estimate_items: estSubtotal,
          po_subtotal_non_estimate_items: addSubtotal,
          po_subtotal_total: poSubtotalTotal,
          po_tax_total: taxAmount,
          tax_percent_applied: estimateTaxPercent,
          po_total: poTotal,
        }).eq('id', newPO.id);
      }

      toast.success(`PO ${poNumber} created`);
      setWizardOpen(false);
      fetchPurchaseOrders();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error creating PO:', error);
      toast.error('Failed to create PO: ' + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitToSupplier = async (po: PurchaseOrder) => {
    // This will be handled by the detail view
    setSelectedPOId(po.id);
  };

  const handleDownload = (po: PurchaseOrder) => {
    if (!po.download_token) {
      toast.error('Download not available');
      return;
    }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/po-download?token=${po.download_token}&format=pdf`;
    window.open(url, '_blank');
  };

  const handleEditPO = async (po: PurchaseOrder) => {
    try {
      const { data: lineItems, error } = await supabase
        .from('po_line_items')
        .select('*')
        .eq('po_id', po.id)
        .order('line_number');

      if (error) throw error;

      const wizardItems: POWizardV2LineItem[] = (lineItems || []).map((li: any) => ({
        id: crypto.randomUUID(),
        catalog_item_id: '',
        supplier_sku: li.supplier_sku || '',
        name: li.description,
        specs: [li.dimension, li.length_ft ? `${li.length_ft}ft` : null].filter(Boolean).join(' | '),
        quantity: li.quantity,
        unit_mode: li.pieces ? 'BUNDLE' as const : 'EACH' as const,
        bundle_count: li.pieces || undefined,
        item_notes: li.notes || undefined,
        uom: li.uom,
        length_ft: li.length_ft || undefined,
        computed_lf: li.computed_lf || undefined,
        unit_price: li.unit_price ?? null,
        line_total: li.line_total ?? null,
        source_estimate_item_id: li.source_estimate_item_id || null,
        source_pack_name: li.source_pack_name || null,
        price_source: li.price_source || null,
        original_unit_price: li.original_unit_price ?? null,
        price_adjusted_by_supplier: li.price_adjusted_by_supplier || false,
      }));

      setEditingPO(po);
      setEditInitialData({
        project_id: projectId,
        project_name: projectName || '',
        delivery_address: projectAddress || '',
        supplier_id: po.supplier_id,
        supplier_name: po.supplier?.name,
        notes: po.notes || '',
        line_items: wizardItems,
      });
      setEditWizardOpen(true);
    } catch (err) {
      console.error('Error loading PO for edit:', err);
      toast.error('Failed to load PO for editing');
    }
  };

  const handleEditComplete = async (data: POWizardV2Data) => {
    if (!editingPO) return;
    setIsSubmitting(true);
    try {
      // Delete old line items
      const { error: deleteErr } = await supabase
        .from('po_line_items')
        .delete()
        .eq('po_id', editingPO.id);
      if (deleteErr) throw deleteErr;

      // Insert new line items
      if (data.line_items.length > 0) {
        let estSubtotal = 0;
        let addSubtotal = 0;
        
        const lineItems = data.line_items.map((item, idx) => {
          const lineTotal = item.unit_price != null ? item.quantity * item.unit_price : null;
          if (item.source_estimate_item_id) {
            estSubtotal += lineTotal ?? 0;
          } else if (lineTotal != null) {
            addSubtotal += lineTotal;
          }
          return {
            po_id: editingPO.id,
            line_number: idx + 1,
            supplier_sku: item.supplier_sku,
            description: item.name,
            quantity: item.quantity,
            uom: item.uom,
            pieces: item.unit_mode === 'BUNDLE' ? item.bundle_count : null,
            length_ft: item.length_ft || null,
            computed_lf: item.computed_lf || null,
            notes: item.item_notes || null,
            unit_price: item.unit_price ?? null,
            line_total: lineTotal,
            source_estimate_item_id: item.source_estimate_item_id || null,
            source_pack_name: item.source_pack_name || null,
            price_source: item.price_source || null,
            original_unit_price: item.original_unit_price ?? null,
          };
        });
        const { error: insertErr } = await supabase.from('po_line_items').insert(lineItems);
        if (insertErr) throw insertErr;

        // Fetch estimate tax percent for edit
        let editTaxPercent = editingPO.sales_tax_percent ?? 0;
        if (data.source_estimate_id) {
          const { data: estData, error: estError } = await supabase
            .from('supplier_estimates')
            .select('sales_tax_percent')
            .eq('id', data.source_estimate_id)
            .single();
          if (estError) {
            console.warn('Failed to fetch estimate tax percent on edit:', estError.message);
          }
          if (estData?.sales_tax_percent) {
            editTaxPercent = estData.sales_tax_percent;
          }
        }

        // Update PO-level totals with tax
        const poSubtotalTotal = estSubtotal + addSubtotal;
        const taxAmount = poSubtotalTotal * (editTaxPercent / 100);
        const poTotal = poSubtotalTotal + taxAmount;
        await supabase.from('purchase_orders').update({
          po_subtotal_estimate_items: estSubtotal,
          po_subtotal_non_estimate_items: addSubtotal,
          po_subtotal_total: poSubtotalTotal,
          sales_tax_percent: editTaxPercent,
          tax_percent_applied: editTaxPercent,
          po_tax_total: taxAmount,
          po_total: poTotal,
        }).eq('id', editingPO.id);
      }

      // Update PO metadata
      const { error: updateErr } = await supabase
        .from('purchase_orders')
        .update({
          notes: data.notes || null,
          source_estimate_id: data.source_estimate_id || null,
          source_pack_name: data.source_pack_name || null,
          pack_modified: data.pack_modified || false,
        })
        .eq('id', editingPO.id);
      if (updateErr) throw updateErr;

      toast.success(`PO ${editingPO.po_number} updated`);
      setEditWizardOpen(false);
      setEditingPO(null);
      setEditInitialData(null);
      fetchPurchaseOrders();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error updating PO:', err);
      toast.error('Failed to update PO: ' + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPOs = (statusFilter === 'all'
    ? purchaseOrders
    : purchaseOrders.filter(po => po.status === statusFilter)
  ).sort((a, b) => {
    const pa = STATUS_PRIORITY[a.status] ?? 99;
    const pb = STATUS_PRIORITY[b.status] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const stats = {
    total: purchaseOrders.length,
    active: purchaseOrders.filter(po => po.status === 'ACTIVE').length,
    submitted: purchaseOrders.filter(po => po.status === 'SUBMITTED').length,
    priced: purchaseOrders.filter(po => po.status === 'PRICED').length,
    ordered: purchaseOrders.filter(po => po.status === 'ORDERED').length,
    delivered: purchaseOrders.filter(po => po.status === 'DELIVERED').length,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  // Show detail view if a PO is selected
  if (selectedPOId) {
    return (
      <PODetail
        poId={selectedPOId}
        projectId={projectId}
        onBack={() => setSelectedPOId(null)}
        onUpdate={fetchPurchaseOrders}
      />
    );
  }

  const isProjectNotActive = projectStatus && projectStatus !== 'active';

  return (
    <>
      <div className="space-y-6">
        {/* Project not active blocking banner */}
        {isProjectNotActive && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">Project Setup Incomplete</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Project setup incomplete. Waiting for required parties.
            </AlertDescription>
          </Alert>
        )}

        {/* Header with Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Purchase Orders</h2>
            <p className="text-sm text-muted-foreground">
              {stats.total} PO{stats.total !== 1 ? 's' : ''} • {stats.active} Active • {stats.submitted} Submitted • {stats.delivered} Delivered
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="PRICED">Priced</SelectItem>
                <SelectItem value="ORDERED">Ordered</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
              </SelectContent>
            </Select>
            {canCreatePO && !isProjectNotActive && (
              <Button onClick={() => setWizardOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create PO
              </Button>
            )}
          </div>
        </div>

        {/* PO Grid */}
        {filteredPOs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Purchase Orders</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {isSupplier
                  ? 'No purchase orders have been sent to you for this project yet.'
                  : 'Create a purchase order to request materials from suppliers.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPOs.map((po) => {
              const isPricingOwner = po.pricing_owner_org_id === currentOrgId;
              const isCreator = po.created_by_org_id === currentOrgId;
              const isPoSupplier = (po.supplier as { organization_id?: string })?.organization_id === currentOrgId;
              const canViewPricing = isPricingOwner || isPoSupplier || isCreator;
              const packKey = po.source_estimate_id && po.source_pack_name
                ? `${po.source_estimate_id}|${po.source_pack_name}`
                : null;
              const packData = packKey ? estimatePackTotals.get(packKey) : null;
              return (
                <POCard
                  key={po.id}
                  po={po}
                  onClick={() => setSelectedPOId(po.id)}
                  onEdit={() => handleEditPO(po)}
                  onDownload={handleDownload}
                  onSubmit={handleSubmitToSupplier}
                  canEdit={canCreatePO}
                  canSubmit={canCreatePO}
                  canViewPricing={canViewPricing}
                  isSupplier={isSupplier}
                  isInvoiced={invoicedPOIds.has(po.id)}
                  estimatePackTotal={packData?.total ?? null}
                  estimatePackItemCount={packData?.itemCount ?? null}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* PO Creation Wizard v2 */}
      <POWizardV2
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        projectId={projectId}
        projectName={projectName || 'Project'}
        projectAddress={projectAddress || ''}
        onComplete={handleCreatePO}
        isSubmitting={isSubmitting}
      />

      {/* PO Edit Wizard */}
      {editInitialData && (
        <POWizardV2
          open={editWizardOpen}
          onOpenChange={(open) => {
            setEditWizardOpen(open);
            if (!open) { setEditingPO(null); setEditInitialData(null); }
          }}
          projectId={projectId}
          projectName={projectName || 'Project'}
          projectAddress={projectAddress || ''}
          onComplete={handleEditComplete}
          isSubmitting={isSubmitting}
          editMode
          initialData={editInitialData}
        />
      )}
    </>
  );
}

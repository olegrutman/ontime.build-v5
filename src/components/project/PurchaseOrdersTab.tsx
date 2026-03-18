import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Plus, Package } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ViewMode, ViewSwitcher } from '@/components/ui/view-switcher';
import { toast } from 'sonner';
import { POActionBar, POCard, PODetail, POTableView } from '@/components/purchase-orders';
import { POWizardV2 } from '@/components/po-wizard-v2';
import { PurchaseOrder, POStatus } from '@/types/purchaseOrder';
import { POWizardV2Data, POWizardV2LineItem } from '@/types/poWizardV2';

const STATUS_PRIORITY: Record<POStatus, number> = {
  ACTIVE: 0,
  PENDING_APPROVAL: 1,
  SUBMITTED: 2,
  PRICED: 3,
  ORDERED: 4,
  DELIVERED: 5,
};

interface PurchaseOrdersTabProps {
  projectId: string;
  projectName?: string;
  projectAddress?: string;
  projectStatus?: string;
}

export function PurchaseOrdersTab({ projectId, projectName, projectAddress, projectStatus }: PurchaseOrdersTabProps) {
  const { userOrgRoles, user, permissions } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [invoicedPOIds, setInvoicedPOIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [estimatePackTotals, setEstimatePackTotals] = useState<Map<string, { total: number; itemCount: number }>>(new Map());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [editWizardOpen, setEditWizardOpen] = useState(false);
  const [editInitialData, setEditInitialData] = useState<Partial<POWizardV2Data> | null>(null);
  const [materialResponsibility, setMaterialResponsibility] = useState<string | null>(null);
  const [poRequiresApproval, setPORequiresApproval] = useState(true);

  const currentOrgId = userOrgRoles[0]?.organization_id;
  const currentOrgType = userOrgRoles[0]?.organization?.type;
  const isSupplier = currentOrgType === 'SUPPLIER';
  const isGC = currentOrgType === 'GC';
  const isTC = currentOrgType === 'TC';
  const canCreatePO = permissions?.canCreatePOs ?? false;
  const hidePricing = isTC && materialResponsibility === 'GC';
  const showDirectionalTabs = isGC || isTC;
  const poParam = searchParams.get('po');

  const updatePOSearchParam = useCallback((poId: string | null) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', 'purchase-orders');

    if (poId) {
      nextParams.set('po', poId);
    } else {
      nextParams.delete('po');
    }

    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const openPO = useCallback((poId: string) => {
    setSelectedPOId(poId);
    updatePOSearchParam(poId);
  }, [updatePOSearchParam]);

  const closePO = useCallback(() => {
    setSelectedPOId(null);
    updatePOSearchParam(null);
  }, [updatePOSearchParam]);

  const fetchPurchaseOrders = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(id, name, supplier_code, contact_info, organization_id),
        line_items:po_line_items(id, unit_price, line_total, quantity, source_estimate_item_id, source_pack_name, original_unit_price, price_adjusted_by_supplier)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (isSupplier) {
      const { data: supplierLinks } = await supabase
        .from('suppliers')
        .select('id')
        .eq('organization_id', currentOrgId);

      if (supplierLinks && supplierLinks.length > 0) {
        query = query.in('supplier_id', supplierLinks.map((supplier) => supplier.id));
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
      setLoading(false);
      return;
    }

    const pos = (data || []) as unknown as PurchaseOrder[];
    setPurchaseOrders(pos);

    const estimateIds = Array.from(new Set(pos.map((po) => po.source_estimate_id).filter(Boolean))) as string[];
    if (estimateIds.length > 0) {
      const { data: estItems } = await supabase
        .from('supplier_estimate_items')
        .select('estimate_id, pack_name, unit_price, quantity')
        .in('estimate_id', estimateIds);

      const totals = new Map<string, { total: number; itemCount: number }>();
      for (const item of estItems || []) {
        const key = `${item.estimate_id}|${item.pack_name || ''}`;
        const current = totals.get(key) || { total: 0, itemCount: 0 };
        current.total += (item.unit_price || 0) * (item.quantity || 0);
        current.itemCount += 1;
        totals.set(key, current);
      }

      for (const po of pos) {
        if (!po.source_estimate_id || !po.source_pack_name) continue;
        const key = `${po.source_estimate_id}|${po.source_pack_name}`;
        const packData = totals.get(key);
        if (packData) {
          packData.total = packData.total * (1 + (po.sales_tax_percent || 0) / 100);
        }
      }

      setEstimatePackTotals(totals);
    } else {
      setEstimatePackTotals(new Map());
    }

    const poIds = pos.map((po) => po.id);
    if (poIds.length > 0) {
      const { data: invoicedData } = await supabase
        .from('invoices')
        .select('po_id')
        .eq('project_id', projectId)
        .in('po_id', poIds)
        .not('po_id', 'is', null);

      setInvoicedPOIds(new Set((invoicedData || []).map((invoice: any) => invoice.po_id)));
    } else {
      setInvoicedPOIds(new Set());
    }

    setLoading(false);
  }, [currentOrgId, isSupplier, projectId]);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  useEffect(() => {
    if (poParam && poParam !== selectedPOId) {
      setSelectedPOId(poParam);
      return;
    }

    if (!poParam && selectedPOId) {
      setSelectedPOId(null);
    }
  }, [poParam, selectedPOId]);

  useEffect(() => {
    if (!projectId || !currentOrgId) return;

    const fetchContractInfo = async () => {
      const { data: contracts } = await supabase
        .from('project_contracts')
        .select('material_responsibility')
        .eq('project_id', projectId)
        .not('material_responsibility', 'is', null)
        .limit(1);

      if (contracts && contracts.length > 0) {
        setMaterialResponsibility(contracts[0].material_responsibility);
      }

      if (!isTC) return;

      const { data: participants } = await supabase
        .from('project_participants')
        .select('id')
        .eq('project_id', projectId)
        .eq('organization_id', currentOrgId)
        .limit(1);

      if (!participants?.length) return;

      const { data: rels } = await supabase
        .from('project_relationships')
        .select('po_requires_upstream_approval')
        .eq('project_id', projectId)
        .eq('downstream_participant_id', participants[0].id)
        .limit(1);

      if (rels?.length) {
        setPORequiresApproval(rels[0].po_requires_upstream_approval ?? true);
      }
    };

    fetchContractInfo();
  }, [currentOrgId, isTC, projectId]);

  const resolvePricingOwnerOrgId = useCallback(async (targetProjectId: string) => {
    const { data: contracts } = await supabase
      .from('project_contracts')
      .select('material_responsibility, from_org_id, to_org_id')
      .eq('project_id', targetProjectId)
      .not('material_responsibility', 'is', null);

    const contractWithMR = contracts?.find((contract) => contract.material_responsibility);
    if (!contractWithMR) return currentOrgId;

    return contractWithMR.material_responsibility === 'GC'
      ? contractWithMR.to_org_id
      : contractWithMR.from_org_id;
  }, [currentOrgId]);

  const createPurchaseOrderRecord = useCallback(async (data: POWizardV2Data) => {
    if (!currentOrgId) throw new Error('Missing organization');

    const pricingOwnerOrgId = (await resolvePricingOwnerOrgId(data.project_id)) || currentOrgId;
    const salesTaxPercent = data.sales_tax_percent ?? 0;

    const { data: poNumber } = await supabase.rpc('generate_po_number', { org_id: currentOrgId });
    if (!poNumber) throw new Error('Could not generate PO number');

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
        sales_tax_percent: salesTaxPercent,
      })
      .select()
      .single();

    if (poError) throw poError;

    if (data.line_items.length > 0) {
      let estimateSubtotal = 0;
      let additionalSubtotal = 0;

      const lineItems = data.line_items.map((item, index) => {
        const lineTotal = item.unit_price != null ? item.quantity * item.unit_price : null;
        if (item.source_estimate_item_id) {
          estimateSubtotal += lineTotal ?? 0;
        } else if (lineTotal != null) {
          additionalSubtotal += lineTotal;
        }

        return {
          po_id: newPO.id,
          line_number: index + 1,
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

      const poSubtotalTotal = estimateSubtotal + additionalSubtotal;
      const taxAmount = poSubtotalTotal * (salesTaxPercent / 100);
      const poTotal = poSubtotalTotal + taxAmount;

      await supabase
        .from('purchase_orders')
        .update({
          po_subtotal_estimate_items: estimateSubtotal,
          po_subtotal_non_estimate_items: additionalSubtotal,
          po_subtotal_total: poSubtotalTotal,
          po_tax_total: taxAmount,
          tax_percent_applied: salesTaxPercent,
          po_total: poTotal,
        })
        .eq('id', newPO.id);
    }

    return { newPO, poNumber: poNumber as string };
  }, [currentOrgId, resolvePricingOwnerOrgId]);

  const handleCreatePO = async (data: POWizardV2Data) => {
    setIsSubmitting(true);
    try {
      const { poNumber } = await createPurchaseOrderRecord(data);
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
    if (isTC && poRequiresApproval && po.created_by_org_id === currentOrgId) {
      try {
        const { error } = await supabase
          .from('purchase_orders')
          .update({ status: 'PENDING_APPROVAL' as any })
          .eq('id', po.id);

        if (error) throw error;
        toast.success('PO sent to GC for approval');
        fetchPurchaseOrders();
      } catch (err: any) {
        toast.error('Failed to submit for approval: ' + (err?.message || 'Unknown error'));
      }
      return;
    }

    openPO(po.id);
  };

  const handleCreateAndSend = async (data: POWizardV2Data) => {
    if (!user) return;

    setIsSending(true);
    try {
      const { newPO, poNumber } = await createPurchaseOrderRecord(data);

      if (isTC && poRequiresApproval) {
        await supabase
          .from('purchase_orders')
          .update({ status: 'PENDING_APPROVAL' as any })
          .eq('id', newPO.id);

        toast.success(`PO ${poNumber} created and sent to GC for approval`);
      } else {
        let supplierEmail = '';

        const { data: designatedSupplier } = await supabase
          .from('project_designated_suppliers')
          .select('po_email')
          .eq('project_id', data.project_id)
          .neq('status', 'removed')
          .maybeSingle();

        if (designatedSupplier?.po_email) supplierEmail = designatedSupplier.po_email;

        if (!supplierEmail && data.supplier_id) {
          const { data: supplier } = await supabase
            .from('suppliers')
            .select('contact_info')
            .eq('id', data.supplier_id)
            .single();

          const emailMatch = (supplier?.contact_info || '').match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
          if (emailMatch) supplierEmail = emailMatch[0];
        }

        if (!supplierEmail) {
          toast.warning(`PO ${poNumber} created as draft — no supplier email found to send.`);
        } else {
          const { error: sendError } = await supabase.functions.invoke('send-po', {
            body: { po_id: newPO.id, supplier_email: supplierEmail },
          });

          if (sendError) {
            console.warn('Email send failed (PO still created):', sendError);
            toast.warning(`PO ${poNumber} created but email could not be sent.`);
          } else {
            toast.success(`PO ${poNumber} created and sent to supplier`);
          }
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error creating & sending PO:', error);
      toast.error('Failed to create & send PO: ' + message);
    } finally {
      setIsSending(false);
      setWizardOpen(false);
      fetchPurchaseOrders();
    }
  };

  const handleApprovePO = async (po: PurchaseOrder) => {
    if (!user) return;

    try {
      let supplierEmail = '';
      const contactEmailMatch = (po.supplier?.contact_info || '').match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
      if (contactEmailMatch) supplierEmail = contactEmailMatch[0];

      if (po.project_id) {
        const { data: designatedSupplier } = await supabase
          .from('project_designated_suppliers')
          .select('po_email')
          .eq('project_id', po.project_id)
          .neq('status', 'removed')
          .maybeSingle();

        if (designatedSupplier?.po_email) supplierEmail = designatedSupplier.po_email;
      }

      if (!supplierEmail) {
        toast.error('No supplier email found. Please set up supplier contact.');
        return;
      }

      const { error: updateErr } = await supabase
        .from('purchase_orders')
        .update({
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', po.id);

      if (updateErr) throw updateErr;

      const { error: sendErr } = await supabase.functions.invoke('send-po', {
        body: { po_id: po.id, supplier_email: supplierEmail },
      });

      if (sendErr) throw sendErr;

      toast.success('PO approved and sent to supplier');
      fetchPurchaseOrders();
    } catch (err: any) {
      toast.error('Failed to approve PO: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleRejectPO = async (po: PurchaseOrder) => {
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status: 'ACTIVE' as any })
        .eq('id', po.id);

      if (error) throw error;
      toast.success('PO returned to active');
      fetchPurchaseOrders();
    } catch (err: any) {
      toast.error('Failed to reject PO: ' + (err?.message || 'Unknown error'));
    }
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

      const wizardItems: POWizardV2LineItem[] = (lineItems || []).map((lineItem: any) => ({
        id: crypto.randomUUID(),
        catalog_item_id: '',
        supplier_sku: lineItem.supplier_sku || '',
        name: lineItem.description,
        specs: [lineItem.dimension, lineItem.length_ft ? `${lineItem.length_ft}ft` : null].filter(Boolean).join(' | '),
        quantity: lineItem.quantity,
        unit_mode: lineItem.pieces ? 'BUNDLE' : 'EACH',
        bundle_count: lineItem.pieces || undefined,
        item_notes: lineItem.notes || undefined,
        uom: lineItem.uom,
        length_ft: lineItem.length_ft || undefined,
        computed_lf: lineItem.computed_lf || undefined,
        unit_price: lineItem.unit_price ?? null,
        line_total: lineItem.line_total ?? null,
        source_estimate_item_id: lineItem.source_estimate_item_id || null,
        source_pack_name: lineItem.source_pack_name || null,
        price_source: lineItem.price_source || null,
        original_unit_price: lineItem.original_unit_price ?? null,
        price_adjusted_by_supplier: lineItem.price_adjusted_by_supplier || false,
      }));

      setEditingPO(po);
      setEditInitialData({
        project_id: projectId,
        project_name: projectName || '',
        delivery_address: projectAddress || '',
        supplier_id: po.supplier_id,
        supplier_name: po.supplier?.name,
        notes: po.notes || '',
        sales_tax_percent: po.sales_tax_percent ?? 0,
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
      const { error: deleteErr } = await supabase
        .from('po_line_items')
        .delete()
        .eq('po_id', editingPO.id);
      if (deleteErr) throw deleteErr;

      if (data.line_items.length > 0) {
        let estimateSubtotal = 0;
        let additionalSubtotal = 0;

        const lineItems = data.line_items.map((item, index) => {
          const lineTotal = item.unit_price != null ? item.quantity * item.unit_price : null;
          if (item.source_estimate_item_id) {
            estimateSubtotal += lineTotal ?? 0;
          } else if (lineTotal != null) {
            additionalSubtotal += lineTotal;
          }

          return {
            po_id: editingPO.id,
            line_number: index + 1,
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

        const salesTaxPercent = data.sales_tax_percent ?? editingPO.sales_tax_percent ?? 0;
        const poSubtotalTotal = estimateSubtotal + additionalSubtotal;
        const taxAmount = poSubtotalTotal * (salesTaxPercent / 100);
        const poTotal = poSubtotalTotal + taxAmount;

        await supabase
          .from('purchase_orders')
          .update({
            po_subtotal_estimate_items: estimateSubtotal,
            po_subtotal_non_estimate_items: additionalSubtotal,
            po_subtotal_total: poSubtotalTotal,
            sales_tax_percent: salesTaxPercent,
            tax_percent_applied: salesTaxPercent,
            po_tax_total: taxAmount,
            po_total: poTotal,
          })
          .eq('id', editingPO.id);
      }

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

  const { myPOs, receivedPOs } = useMemo(() => {
    if (!showDirectionalTabs) return { myPOs: purchaseOrders, receivedPOs: [] as PurchaseOrder[] };

    return {
      myPOs: purchaseOrders.filter((po) => po.created_by_org_id === currentOrgId),
      receivedPOs: purchaseOrders.filter((po) => po.created_by_org_id !== currentOrgId),
    };
  }, [currentOrgId, purchaseOrders, showDirectionalTabs]);

  const getCanViewPricing = useCallback((po: PurchaseOrder) => {
    if (hidePricing) return false;

    const isPricingOwner = po.pricing_owner_org_id === currentOrgId;
    const isCreator = po.created_by_org_id === currentOrgId;
    const isPOSupplier = (po.supplier as { organization_id?: string } | null)?.organization_id === currentOrgId;

    return isPricingOwner || isCreator || isPOSupplier;
  }, [currentOrgId, hidePricing]);

  const filterAndSort = useCallback((pos: PurchaseOrder[]) => {
    let filtered = pos;

    if (statusFilter === 'needs_action') {
      const actionStatuses = isSupplier ? ['SUBMITTED'] : isGC ? ['ACTIVE', 'PENDING_APPROVAL'] : ['ACTIVE'];
      filtered = pos.filter((po) => actionStatuses.includes(po.status));
    } else if (statusFilter !== 'all') {
      filtered = pos.filter((po) => po.status === statusFilter);
    }

    return filtered.sort((a, b) => {
      const priorityA = STATUS_PRIORITY[a.status] ?? 99;
      const priorityB = STATUS_PRIORITY[b.status] ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [isGC, isSupplier, statusFilter]);

  const renderPOList = (pos: PurchaseOrder[]) => {
    const filtered = filterAndSort(pos);

    if (filtered.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Purchase Orders</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {isSupplier
                ? 'No purchase orders have been sent to you for this project yet.'
                : statusFilter === 'needs_action'
                  ? 'No POs need your attention right now.'
                  : 'Create a purchase order to request materials from suppliers.'}
            </p>
          </CardContent>
        </Card>
      );
    }

    if (viewMode === 'table') {
      return (
        <POTableView
          purchaseOrders={filtered}
          onView={(po) => openPO(po.id)}
          onEdit={handleEditPO}
          onSubmit={handleSubmitToSupplier}
          canCreatePO={canCreatePO}
          canViewPricing={getCanViewPricing}
          isInvoiced={(id) => invoicedPOIds.has(id)}
        />
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((po) => {
          const packKey = po.source_estimate_id && po.source_pack_name
            ? `${po.source_estimate_id}|${po.source_pack_name}`
            : null;
          const packData = packKey ? estimatePackTotals.get(packKey) : null;

          return (
            <POCard
              key={po.id}
              po={po}
              onClick={() => openPO(po.id)}
              onEdit={() => handleEditPO(po)}
              onDownload={handleDownload}
              onSubmit={handleSubmitToSupplier}
              onApprove={isGC ? handleApprovePO : undefined}
              onReject={isGC ? handleRejectPO : undefined}
              canEdit={canCreatePO}
              canSubmit={canCreatePO}
              canViewPricing={getCanViewPricing(po)}
              isSupplier={isSupplier}
              isGC={isGC}
              isInvoiced={invoicedPOIds.has(po.id)}
              estimatePackTotal={packData?.total ?? null}
              estimatePackItemCount={packData?.itemCount ?? null}
            />
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (selectedPOId) {
    return (
      <PODetail
        poId={selectedPOId}
        projectId={projectId}
        onBack={closePO}
        onUpdate={fetchPurchaseOrders}
        hidePricingOverride={hidePricing}
      />
    );
  }

  const isProjectNotActive = projectStatus && projectStatus !== 'active' && !isSupplier;
  const receivedTabLabel = isGC ? 'From Trade Contractors' : 'From GC';

  return (
    <>
      <div className="space-y-6">
        {isProjectNotActive && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">Project Setup Incomplete</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Project setup incomplete. Waiting for required parties.
            </AlertDescription>
          </Alert>
        )}

        <POActionBar purchaseOrders={purchaseOrders} isSupplier={isSupplier} hidePricing={hidePricing} />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Purchase Orders</h2>
            <p className="text-sm text-muted-foreground">
              {purchaseOrders.length} PO{purchaseOrders.length !== 1 ? 's' : ''} on this project
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ViewSwitcher
              value={viewMode}
              onChange={setViewMode}
              availableModes={['list', 'table']}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="needs_action">
                  {isSupplier ? '⚡ Needs Pricing' : '⚡ Needs My Action'}
                </SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
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

        {showDirectionalTabs ? (
          <Tabs defaultValue="my" className="w-full">
            <TabsList>
              <TabsTrigger value="my">My POs ({myPOs.length})</TabsTrigger>
              <TabsTrigger value="received">{receivedTabLabel} ({receivedPOs.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="my">{renderPOList(myPOs)}</TabsContent>
            <TabsContent value="received">{renderPOList(receivedPOs)}</TabsContent>
          </Tabs>
        ) : (
          renderPOList(purchaseOrders)
        )}
      </div>

      <POWizardV2
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        projectId={projectId}
        projectName={projectName || 'Project'}
        projectAddress={projectAddress || ''}
        onComplete={handleCreatePO}
        onCreateAndSend={handleCreateAndSend}
        isSubmitting={isSubmitting}
        isSending={isSending}
        hidePricing={hidePricing}
      />

      {editInitialData && (
        <POWizardV2
          open={editWizardOpen}
          onOpenChange={(open) => {
            setEditWizardOpen(open);
            if (!open) {
              setEditingPO(null);
              setEditInitialData(null);
            }
          }}
          projectId={projectId}
          projectName={projectName || 'Project'}
          projectAddress={projectAddress || ''}
          onComplete={handleEditComplete}
          isSubmitting={isSubmitting}
          editMode
          initialData={editInitialData}
          hidePricing={hidePricing}
        />
      )}
    </>
  );
}

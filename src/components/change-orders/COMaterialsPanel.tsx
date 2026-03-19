import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Plus, Trash2, Loader2, Package, ShoppingCart, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { COMaterialItem } from '@/types/changeOrder';
import { PO_STATUS_LABELS } from '@/types/purchaseOrder';
import type { POWizardV2LineItem } from '@/types/poWizardV2';
import { ProductPickerContent, ProductPickerHandle } from '@/components/po-wizard-v2/ProductPicker';

const UOM_OPTIONS = ['ea', 'LF', 'SF', 'SQ', 'bag', 'box', 'sheet', 'roll', 'gal', 'lb', 'ton', 'hr'];

interface COMaterialsPanelProps {
  coId: string;
  orgId: string;
  projectId: string;
  coTitle?: string;
  materials: COMaterialItem[];
  isTC: boolean;
  isGC: boolean;
  isFC: boolean;
  materialsOnSite: boolean;
  canEdit: boolean;
  onRefresh: () => void;
}

interface DraftRow {
  tempId: string;
  description: string;
  supplier_sku: string;
  quantity: string;
  uom: string;
  unit_cost: string;
  markup_percent: string;
  notes: string;
}

interface LinkedPricingRequest {
  id: string;
  po_number: string;
  status: string;
  created_at: string;
  supplier: { name: string } | null;
}

interface SupplierPriceEntry {
  unit_price: number | null;
  line_total: number | null;
}

const PRICED_STATUSES = ['PRICED', 'ORDERED', 'DELIVERED'];

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function newDraftRow(): DraftRow {
  return {
    tempId: crypto.randomUUID(),
    description: '',
    supplier_sku: '',
    quantity: '1',
    uom: 'ea',
    unit_cost: '',
    markup_percent: '0',
    notes: '',
  };
}

function getPOStatusLabel(status: string) {
  return PO_STATUS_LABELS[status as keyof typeof PO_STATUS_LABELS] ?? status;
}

function getLinkedRequestDescription(status: string, supplierName?: string | null) {
  const supplierLabel = supplierName ?? 'Supplier';

  switch (status) {
    case 'ACTIVE':
      return `${supplierLabel} pricing draft is ready to review in the PO workflow`;
    case 'PENDING_APPROVAL':
      return 'Pricing request is waiting for GC approval before it can be sent';
    case 'SUBMITTED':
      return `${supplierLabel} has received this pricing request`;
    case 'PRICED':
      return `${supplierLabel} submitted pricing on the linked PO`;
    case 'ORDERED':
      return 'Linked PO has been marked ordered';
    case 'DELIVERED':
      return 'Linked PO has been marked delivered';
    default:
      return `${supplierLabel} pricing request linked to this CO`;
  }
}

export function COMaterialsPanel({
  coId,
  orgId,
  projectId,
  coTitle,
  materials,
  isTC,
  isGC,
  isFC,
  materialsOnSite,
  canEdit,
  onRefresh,
}: COMaterialsPanelProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pricingAction, setPricingAction] = useState<'draft' | 'send' | null>(null);
  const [linkedRequests, setLinkedRequests] = useState<LinkedPricingRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [poRequiresApproval, setPORequiresApproval] = useState(false);
  const pickerRef = useRef<ProductPickerHandle>(null);

  const canManageMaterials = canEdit && (isTC || isGC);
  const showPricingColumns = isTC || isGC;
  const addedByRole = isGC ? 'GC' : 'TC';
  const totalCost = materials.reduce((s, m) => s + (m.line_cost ?? 0), 0);
  const totalBilled = materials.reduce((s, m) => s + (m.billed_amount ?? 0), 0);
  const activePricingRequest = useMemo(
    () => linkedRequests.find(request => request.status !== 'DELIVERED') ?? linkedRequests[0] ?? null,
    [linkedRequests]
  );
  const hasBlockingPricingRequest = !!activePricingRequest;

  const fetchLinkedRequests = useCallback(async () => {
    if (!coId) return;

    setLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, po_number, status, created_at, supplier:suppliers(name)')
        .eq('source_change_order_id', coId)
        .eq('source_change_order_material_request', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinkedRequests((data ?? []) as LinkedPricingRequest[]);
    } catch (err) {
      console.error('Failed to load linked CO pricing requests', err);
    } finally {
      setLoadingRequests(false);
    }
  }, [coId]);

  useEffect(() => {
    fetchLinkedRequests();
  }, [fetchLinkedRequests]);

  useEffect(() => {
    if (!canManageMaterials || !projectId) return;

    let cancelled = false;

    const resolveSupplier = async () => {
      setSupplierLoading(true);
      try {
        const { data: teamData } = await supabase
          .from('project_team')
          .select('org_id')
          .eq('project_id', projectId)
          .eq('role', 'Supplier');

        const orgIds = (teamData || []).map(team => team.org_id);
        let resolvedSupplierId: string | null = null;

        if (orgIds.length > 0) {
          const { data: supplierData } = await supabase
            .from('suppliers')
            .select('id')
            .in('organization_id', orgIds)
            .limit(1)
            .maybeSingle();

          resolvedSupplierId = supplierData?.id ?? null;
        }

        if (!resolvedSupplierId) {
          const { data: systemSupplier } = await supabase
            .from('suppliers')
            .select('id')
            .eq('is_system', true)
            .limit(1)
            .maybeSingle();

          resolvedSupplierId = systemSupplier?.id ?? null;
        }

        if (!cancelled) setSupplierId(resolvedSupplierId);
      } catch (err) {
        console.error('Failed to resolve supplier for CO picker', err);
      } finally {
        if (!cancelled) setSupplierLoading(false);
      }
    };

    resolveSupplier();
    return () => {
      cancelled = true;
    };
  }, [canManageMaterials, projectId]);

  useEffect(() => {
    if (!isTC || !projectId || !orgId) return;

    let cancelled = false;

    const loadApprovalGate = async () => {
      try {
        const { data: participant } = await supabase
          .from('project_participants')
          .select('id')
          .eq('project_id', projectId)
          .eq('organization_id', orgId)
          .limit(1)
          .maybeSingle();

        if (!participant?.id) {
          if (!cancelled) setPORequiresApproval(false);
          return;
        }

        const { data: relationship } = await supabase
          .from('project_relationships')
          .select('po_requires_upstream_approval')
          .eq('project_id', projectId)
          .eq('downstream_participant_id', participant.id)
          .limit(1)
          .maybeSingle();

        if (!cancelled) {
          setPORequiresApproval(relationship?.po_requires_upstream_approval ?? false);
        }
      } catch (err) {
        console.error('Failed to load PO approval gate for CO pricing flow', err);
      }
    };

    loadApprovalGate();
    return () => {
      cancelled = true;
    };
  }, [isTC, projectId, orgId]);

  function addRow() {
    setDraftRows(rows => [...rows, newDraftRow()]);
  }

  function updateRow(tempId: string, field: keyof DraftRow, value: string) {
    setDraftRows(rows => rows.map(row => (row.tempId === tempId ? { ...row, [field]: value } : row)));
  }

  function removeRow(tempId: string) {
    setDraftRows(rows => rows.filter(row => row.tempId !== tempId));
  }

  async function saveRows() {
    const valid = draftRows.filter(row => row.description.trim() && parseFloat(row.quantity) > 0);
    if (valid.length === 0) return;

    setSaving(true);
    try {
      const rows = valid.map(row => ({
        co_id: coId,
        org_id: orgId,
        added_by_role: addedByRole,
        description: row.description.trim(),
        supplier_sku: row.supplier_sku.trim() || null,
        quantity: parseFloat(row.quantity) || 1,
        uom: row.uom,
        unit_cost: parseFloat(row.unit_cost) || null,
        markup_percent: parseFloat(row.markup_percent) || 0,
        notes: row.notes.trim() || null,
        is_on_site: materialsOnSite,
      }));

      const { error } = await supabase.from('co_material_items').insert(rows);
      if (error) throw error;

      setDraftRows([]);
      toast.success(`${valid.length} material${valid.length > 1 ? 's' : ''} added`);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save materials');
    } finally {
      setSaving(false);
    }
  }

  async function deleteRow(id: string) {
    setDeleting(id);
    try {
      const { error } = await supabase.from('co_material_items').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  }

  const handlePickerAdd = useCallback(async (item: POWizardV2LineItem) => {
    try {
      const { error } = await supabase.from('co_material_items').insert({
        co_id: coId,
        org_id: orgId,
        added_by_role: addedByRole,
        description: item.name,
        supplier_sku: item.supplier_sku || null,
        quantity: item.quantity,
        uom: item.uom || 'ea',
        unit_cost: item.unit_price ?? null,
        markup_percent: 0,
        is_on_site: materialsOnSite,
      });

      if (error) throw error;
      toast.success('Material added');
      onRefresh();
      setPickerOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to add material');
    }
  }, [addedByRole, coId, materialsOnSite, onRefresh, orgId]);

  async function resolvePricingOwnerOrgId() {
    const { data: contracts, error } = await supabase
      .from('project_contracts')
      .select('material_responsibility, from_org_id, to_org_id')
      .eq('project_id', projectId)
      .not('material_responsibility', 'is', null);

    if (error) throw error;

    const contractWithResponsibility = (contracts ?? []).find(contract => contract.material_responsibility);
    if (!contractWithResponsibility) return orgId;

    return contractWithResponsibility.material_responsibility === 'GC'
      ? (contractWithResponsibility.to_org_id ?? orgId)
      : (contractWithResponsibility.from_org_id ?? orgId);
  }

  async function resolveSupplierEmail() {
    let supplierEmail = '';

    const { data: designatedSupplier } = await supabase
      .from('project_designated_suppliers')
      .select('po_email')
      .eq('project_id', projectId)
      .neq('status', 'removed')
      .maybeSingle();

    if (designatedSupplier?.po_email) {
      supplierEmail = designatedSupplier.po_email;
    }

    if (!supplierEmail && supplierId) {
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('contact_info')
        .eq('id', supplierId)
        .maybeSingle();

      const emailMatch = (supplier?.contact_info || '').match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
      if (emailMatch) supplierEmail = emailMatch[0];
    }

    return supplierEmail;
  }

  async function createPricingRequest(sendNow: boolean) {
    if (!user) {
      toast.error('Please log in to create pricing requests');
      return;
    }

    if (materials.length === 0) {
      toast.error('Add at least one material before requesting supplier pricing');
      return;
    }

    if (!supplierId) {
      toast.error('No supplier is configured for this project');
      return;
    }

    if (draftRows.length > 0) {
      toast.error('Save your draft material rows before creating a pricing request');
      return;
    }

    if (hasBlockingPricingRequest) {
      toast.error('A pricing request already exists for this change order');
      return;
    }

    setPricingAction(sendNow ? 'send' : 'draft');
    try {
      const pricingOwnerOrgId = await resolvePricingOwnerOrgId();
      const { data: poNumber, error: numberError } = await supabase.rpc('generate_po_number', {
        org_id: orgId,
      });

      if (numberError) throw numberError;
      if (!poNumber) throw new Error('Could not generate a PO number');

      const { data: newPO, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          organization_id: orgId,
          po_number: poNumber,
          po_name: `CO pricing request · ${coTitle ?? 'Materials'}`,
          supplier_id: supplierId,
          project_id: projectId,
          notes: `Generated from change order materials (${coId}).`,
          status: 'ACTIVE',
          created_by_org_id: orgId,
          pricing_owner_org_id: pricingOwnerOrgId,
          source_change_order_id: coId,
          source_change_order_material_request: true,
        })
        .select('id')
        .single();

      if (poError) throw poError;

      let nonEstimateSubtotal = 0;
      const lineItems = materials.map((material, index) => {
        const unitPrice = material.unit_cost ?? null;
        const lineTotal = unitPrice != null ? material.quantity * unitPrice : null;
        nonEstimateSubtotal += lineTotal ?? 0;

        return {
          po_id: newPO.id,
          line_number: index + 1,
          supplier_sku: material.supplier_sku ?? null,
          description: material.description,
          quantity: material.quantity,
          uom: material.uom,
          notes: material.notes ?? null,
          unit_price: unitPrice,
          line_total: lineTotal,
          original_unit_price: unitPrice,
          source_co_material_item_id: material.id,
        };
      });

      const { error: lineError } = await supabase.from('po_line_items').insert(lineItems);
      if (lineError) {
        await supabase.from('purchase_orders').delete().eq('id', newPO.id);
        throw lineError;
      }

      const { error: totalsError } = await supabase
        .from('purchase_orders')
        .update({
          po_subtotal_estimate_items: 0,
          po_subtotal_non_estimate_items: nonEstimateSubtotal,
          po_subtotal_total: nonEstimateSubtotal,
          po_tax_total: 0,
          tax_percent_applied: 0,
          po_total: nonEstimateSubtotal,
        })
        .eq('id', newPO.id);

      if (totalsError) throw totalsError;

      if (!sendNow) {
        toast.success(`Pricing draft ${poNumber} created`);
        await fetchLinkedRequests();
        return;
      }

      if (isTC && poRequiresApproval) {
        const { error: approvalError } = await supabase
          .from('purchase_orders')
          .update({ status: 'PENDING_APPROVAL' as any })
          .eq('id', newPO.id);

        if (approvalError) throw approvalError;
        toast.success(`Pricing request ${poNumber} sent to GC for approval`);
        await fetchLinkedRequests();
        return;
      }

      const supplierEmail = await resolveSupplierEmail();
      if (!supplierEmail) {
        toast.warning(`Pricing draft ${poNumber} created — no supplier email found to send.`);
        await fetchLinkedRequests();
        return;
      }

      const { error: sendError } = await supabase.functions.invoke('send-po', {
        body: { po_id: newPO.id, supplier_email: supplierEmail },
      });

      if (sendError) {
        console.warn('CO pricing request email failed (draft preserved):', sendError);
        toast.warning(`Pricing draft ${poNumber} created but email could not be sent.`);
      } else {
        toast.success(`Pricing request ${poNumber} sent to supplier`);
      }

      await fetchLinkedRequests();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create pricing request');
    } finally {
      setPricingAction(null);
    }
  }

  const pickerTitle = pickerRef.current?.getTitle() ?? 'Add Material';

  return (
    <div className="co-light-shell">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border co-light-header">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Materials</h3>
          {materialsOnSite && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              On site — pricing ref only
            </span>
          )}
        </div>
        {canManageMaterials && (
          <div className="flex items-center gap-1">
            {supplierId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setPickerOpen(true)}
                disabled={supplierLoading}
              >
                <ShoppingCart className="h-3 w-3" />
                Catalog
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addRow}>
              <Plus className="h-3 w-3" />
              Custom
            </Button>
          </div>
        )}
      </div>

      {materials.length === 0 && draftRows.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">No materials added yet</p>
          {canManageMaterials && (
            <div className="flex justify-center gap-2 mt-3">
              {supplierId && (
                <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setPickerOpen(true)}>
                  <ShoppingCart className="h-3 w-3" />
                  Add from catalog / estimate
                </Button>
              )}
              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={addRow}>
                <Plus className="h-3 w-3" />
                Add custom item
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2 font-medium">Description</th>
                  <th className="text-right px-2 py-2 font-medium">Qty</th>
                  <th className="text-left px-2 py-2 font-medium">UOM</th>
                  {showPricingColumns && <th className="text-right px-2 py-2 font-medium">Unit cost</th>}
                  {showPricingColumns && <th className="text-right px-2 py-2 font-medium">Markup %</th>}
                  {!isFC && <th className="text-right px-4 py-2 font-medium">Amount</th>}
                  {canManageMaterials && <th className="w-8" />}
                </tr>
              </thead>
              <tbody>
                {materials.map(material => (
                  <tr key={material.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground">{material.description}</p>
                      {material.supplier_sku && (
                        <p className="text-[10px] text-muted-foreground">SKU: {material.supplier_sku}</p>
                      )}
                    </td>
                    <td className="text-right px-2 py-2.5 text-foreground">{material.quantity}</td>
                    <td className="px-2 py-2.5 text-muted-foreground">{material.uom}</td>
                    {showPricingColumns && (
                      <td className="text-right px-2 py-2.5 text-muted-foreground">
                        {material.unit_cost != null ? `$${fmt(material.unit_cost)}` : '—'}
                      </td>
                    )}
                    {showPricingColumns && (
                      <td className="text-right px-2 py-2.5 text-muted-foreground">
                        {material.markup_percent > 0 ? `${material.markup_percent}%` : '—'}
                      </td>
                    )}
                    {!isFC && (
                      <td className="text-right px-4 py-2.5 font-medium text-foreground">
                        ${fmt(material.billed_amount ?? 0)}
                      </td>
                    )}
                    {canManageMaterials && (
                      <td className="px-2 py-2.5">
                        <button
                          onClick={() => deleteRow(material.id)}
                          disabled={deleting === material.id}
                          className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                        >
                          {deleting === material.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}

                {draftRows.map(row => {
                  const qty = parseFloat(row.quantity) || 0;
                  const cost = parseFloat(row.unit_cost) || 0;
                  const markup = parseFloat(row.markup_percent) || 0;
                  const billed = qty * cost * (1 + markup / 100);

                  return (
                    <tr key={row.tempId} className="border-b border-border last:border-0 bg-muted/20">
                      <td className="px-4 py-2">
                        <Input
                          value={row.description}
                          onChange={e => updateRow(row.tempId, 'description', e.target.value)}
                          placeholder="Description *"
                          className="h-7 text-xs"
                        />
                        <Input
                          value={row.supplier_sku}
                          onChange={e => updateRow(row.tempId, 'supplier_sku', e.target.value)}
                          placeholder="SKU (optional)"
                          className="h-6 text-[10px] mt-1 border-dashed"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          value={row.quantity}
                          onChange={e => updateRow(row.tempId, 'quantity', e.target.value)}
                          className="h-7 text-xs w-16 text-right"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Select value={row.uom} onValueChange={value => updateRow(row.tempId, 'uom', value)}>
                          <SelectTrigger className="h-7 text-xs w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UOM_OPTIONS.map(uom => (
                              <SelectItem key={uom} value={uom}>{uom}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      {showPricingColumns && (
                        <td className="px-2 py-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                            <Input
                              type="number"
                              value={row.unit_cost}
                              onChange={e => updateRow(row.tempId, 'unit_cost', e.target.value)}
                              placeholder="0.00"
                              className="h-7 text-xs pl-5 w-24 text-right"
                            />
                          </div>
                        </td>
                      )}
                      {showPricingColumns && (
                        <td className="px-2 py-2">
                          <div className="relative">
                            <Input
                              type="number"
                              value={row.markup_percent}
                              onChange={e => updateRow(row.tempId, 'markup_percent', e.target.value)}
                              className="h-7 text-xs w-16 text-right pr-5"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                          </div>
                        </td>
                      )}
                      {!isFC && (
                        <td className="text-right px-4 py-2 text-xs text-muted-foreground">
                          {billed > 0 ? `$${fmt(billed)}` : '—'}
                        </td>
                      )}
                      <td className="px-2 py-2">
                        <button
                          onClick={() => removeRow(row.tempId)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {draftRows.length > 0 && (
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setDraftRows([])} disabled={saving}>
                Discard
              </Button>
              <Button
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={saveRows}
                disabled={saving || draftRows.every(row => !row.description.trim())}
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                Save {draftRows.filter(row => row.description.trim()).length} row{draftRows.filter(row => row.description.trim()).length !== 1 ? 's' : ''}
              </Button>
            </div>
          )}

          {materials.length > 0 && !isFC && (
            <div className="px-4 py-3 border-t border-border space-y-1">
              {showPricingColumns && totalCost > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Cost</span>
                  <span className="text-muted-foreground">${fmt(totalCost)}</span>
                </div>
              )}
              {showPricingColumns && totalBilled > totalCost && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Markup</span>
                  <span className="co-light-success-text">+${fmt(totalBilled - totalCost)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">${fmt(totalBilled)}</span>
              </div>
            </div>
          )}

          {materials.length > 0 && canManageMaterials && (
            <div className="px-4 py-3 border-t border-border space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Supplier pricing</p>
                  {loadingRequests ? (
                    <p className="text-sm text-muted-foreground">Loading pricing requests…</p>
                  ) : activePricingRequest ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground">{activePricingRequest.po_number}</p>
                        <Badge variant="outline">{getPOStatusLabel(activePricingRequest.status)}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {getLinkedRequestDescription(activePricingRequest.status, activePricingRequest.supplier?.name)}
                        {linkedRequests.length > 1 ? ` · ${linkedRequests.length} total requests` : ''}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Create a draft PO or send this material list to the supplier for pricing.
                    </p>
                  )}
                </div>

                {activePricingRequest && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => navigate(`/project/${projectId}?tab=purchase-orders&po=${activePricingRequest.id}`)}
                  >
                    Open linked PO
                  </Button>
                )}
              </div>

              {!activePricingRequest && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => createPricingRequest(false)}
                    disabled={pricingAction !== null || supplierLoading || !supplierId}
                  >
                    {pricingAction === 'draft' ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShoppingCart className="h-3 w-3" />}
                    Create pricing draft
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => createPricingRequest(true)}
                    disabled={pricingAction !== null || supplierLoading || !supplierId}
                  >
                    {pricingAction === 'send' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    {isTC && poRequiresApproval ? 'Send to GC for approval' : 'Send to supplier for pricing'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0 rounded-t-2xl">
          <SheetHeader className="flex-row items-center gap-2 px-4 py-3 border-b border-border space-y-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => {
                if (pickerRef.current) {
                  const step = pickerRef.current.getStep();
                  if (step === 'category' || step === 'source') {
                    setPickerOpen(false);
                  } else {
                    pickerRef.current.goBack();
                  }
                } else {
                  setPickerOpen(false);
                }
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <SheetTitle className="text-base font-semibold">{pickerTitle}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            {supplierId && (
              <ProductPickerContent
                ref={pickerRef}
                supplierId={supplierId}
                projectId={projectId}
                onAddItem={handlePickerAdd}
                editingItem={null}
                onClearEdit={() => {}}
                hidePricing={false}
                onClose={() => setPickerOpen(false)}
                onExitPicker={() => setPickerOpen(false)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

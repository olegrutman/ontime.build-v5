import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, Trash2, Loader2, Package, ShoppingCart, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { COMaterialItem } from '@/types/changeOrder';
import type { POWizardV2LineItem } from '@/types/poWizardV2';
import { ProductPickerContent, ProductPickerHandle } from '@/components/po-wizard-v2/ProductPicker';

const UOM_OPTIONS = ['ea', 'LF', 'SF', 'SQ', 'bag', 'box', 'sheet', 'roll', 'gal', 'lb', 'ton', 'hr'];

interface COMaterialsPanelProps {
  coId:            string;
  orgId:           string;
  projectId:       string;
  materials:       COMaterialItem[];
  isTC:            boolean;
  isGC:            boolean;
  isFC:            boolean;
  materialsOnSite: boolean;
  canEdit:         boolean;
  onRefresh:       () => void;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface DraftRow {
  tempId:         string;
  description:    string;
  supplier_sku:   string;
  quantity:       string;
  uom:            string;
  unit_cost:      string;
  markup_percent: string;
  notes:          string;
}

function newDraftRow(): DraftRow {
  return {
    tempId:         crypto.randomUUID(),
    description:    '',
    supplier_sku:   '',
    quantity:       '1',
    uom:            'ea',
    unit_cost:      '',
    markup_percent: '0',
    notes:          '',
  };
}

export function COMaterialsPanel({
  coId,
  orgId,
  projectId,
  materials,
  isTC,
  isGC,
  isFC,
  materialsOnSite,
  canEdit,
  onRefresh,
}: COMaterialsPanelProps) {
  const { user } = useAuth();
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);

  // Picker state
  const [pickerOpen, setPickerOpen]     = useState(false);
  const [supplierId, setSupplierId]     = useState<string | null>(null);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const pickerRef = useRef<ProductPickerHandle>(null);

  const totalCost   = materials.reduce((s, m) => s + (m.line_cost ?? 0), 0);
  const totalBilled = materials.reduce((s, m) => s + (m.billed_amount ?? 0), 0);

  // Resolve supplier for this project
  useEffect(() => {
    if (!isTC || !projectId) return;
    let cancelled = false;
    const resolve = async () => {
      setSupplierLoading(true);
      try {
        // Get supplier org from project_team
        const { data: teamData } = await supabase
          .from('project_team')
          .select('org_id')
          .eq('project_id', projectId)
          .eq('role', 'Supplier');

        const orgIds = (teamData || []).map(t => t.org_id);
        let sid: string | null = null;

        if (orgIds.length > 0) {
          const { data: supplierData } = await supabase
            .from('suppliers')
            .select('id')
            .in('organization_id', orgIds)
            .limit(1)
            .maybeSingle();
          sid = supplierData?.id ?? null;
        }

        // Fallback to system supplier
        if (!sid) {
          const { data: sys } = await supabase
            .from('suppliers')
            .select('id')
            .eq('is_system', true)
            .limit(1)
            .maybeSingle();
          sid = sys?.id ?? null;
        }

        if (!cancelled) setSupplierId(sid);
      } catch (err) {
        console.error('Failed to resolve supplier for CO picker', err);
      } finally {
        if (!cancelled) setSupplierLoading(false);
      }
    };
    resolve();
    return () => { cancelled = true; };
  }, [isTC, projectId]);

  function addRow() {
    setDraftRows(r => [...r, newDraftRow()]);
  }

  function updateRow(tempId: string, field: keyof DraftRow, value: string) {
    setDraftRows(rows =>
      rows.map(r => (r.tempId === tempId ? { ...r, [field]: value } : r))
    );
  }

  function removeRow(tempId: string) {
    setDraftRows(rows => rows.filter(r => r.tempId !== tempId));
  }

  async function saveRows() {
    const valid = draftRows.filter(r => r.description.trim() && parseFloat(r.quantity) > 0);
    if (valid.length === 0) return;

    setSaving(true);
    try {
      const rows = valid.map((r, idx) => ({
        co_id:          coId,
        org_id:         orgId,
        added_by_role:  'TC',
        line_number:    materials.length + idx + 1,
        description:    r.description.trim(),
        supplier_sku:   r.supplier_sku.trim() || null,
        quantity:       parseFloat(r.quantity) || 1,
        uom:            r.uom,
        unit_cost:      parseFloat(r.unit_cost) || null,
        markup_percent: parseFloat(r.markup_percent) || 0,
        notes:          r.notes.trim() || null,
        is_on_site:     materialsOnSite,
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

  // Handle item added from ProductPicker
  const handlePickerAdd = useCallback(async (item: POWizardV2LineItem) => {
    try {
      const { error } = await supabase.from('co_material_items').insert({
        co_id:          coId,
        org_id:         orgId,
        added_by_role:  'TC',
        line_number:    materials.length + 1,
        description:    item.name,
        supplier_sku:   item.supplier_sku || null,
        quantity:       item.quantity,
        uom:            item.uom || 'ea',
        unit_cost:      item.unit_price ?? null,
        markup_percent: 0,
        is_on_site:     materialsOnSite,
      });
      if (error) throw error;
      toast.success('Material added from catalog');
      onRefresh();
      setPickerOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to add material');
    }
  }, [coId, orgId, materials.length, materialsOnSite, onRefresh]);

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
        {canEdit && isTC && (
          <div className="flex items-center gap-1">
            {supplierId && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setPickerOpen(true)}>
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
          {canEdit && isTC && (
            <div className="flex justify-center gap-2 mt-3">
              {supplierId && (
                <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setPickerOpen(true)}>
                  <ShoppingCart className="h-3 w-3" />
                  Add from catalog
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
                  {isTC && <th className="text-right px-2 py-2 font-medium">Unit cost</th>}
                  {isTC && <th className="text-right px-2 py-2 font-medium">Markup %</th>}
                  {!isFC && <th className="text-right px-4 py-2 font-medium">{isGC ? 'Amount' : 'Billed'}</th>}
                  {canEdit && isTC && <th className="w-8" />}
                </tr>
              </thead>
              <tbody>
                {materials.map(m => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground">{m.description}</p>
                      {m.supplier_sku && (
                        <p className="text-[10px] text-muted-foreground">SKU: {m.supplier_sku}</p>
                      )}
                    </td>
                    <td className="text-right px-2 py-2.5 text-foreground">{m.quantity}</td>
                    <td className="px-2 py-2.5 text-muted-foreground">{m.uom}</td>
                    {isTC && (
                      <td className="text-right px-2 py-2.5 text-muted-foreground">
                        {m.unit_cost != null ? `$${fmt(m.unit_cost)}` : '—'}
                      </td>
                    )}
                    {isTC && (
                      <td className="text-right px-2 py-2.5 text-muted-foreground">
                        {m.markup_percent > 0 ? `${m.markup_percent}%` : '—'}
                      </td>
                    )}
                    {!isFC && (
                      <td className="text-right px-4 py-2.5 font-medium text-foreground">
                        ${fmt(m.billed_amount ?? 0)}
                      </td>
                    )}
                    {canEdit && isTC && (
                      <td className="px-2 py-2.5">
                        <button
                          onClick={() => deleteRow(m.id)}
                          disabled={deleting === m.id}
                          className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                        >
                          {deleting === m.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}

                {draftRows.map((row) => {
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
                        <Select value={row.uom} onValueChange={v => updateRow(row.tempId, 'uom', v)}>
                          <SelectTrigger className="h-7 text-xs w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UOM_OPTIONS.map(u => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      {isTC && (
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
                      {isTC && (
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
                disabled={saving || draftRows.every(r => !r.description.trim())}
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                Save {draftRows.filter(r => r.description.trim()).length} row{draftRows.filter(r => r.description.trim()).length !== 1 ? 's' : ''}
              </Button>
            </div>
          )}

          {materials.length > 0 && !isFC && (
            <div className="px-4 py-3 border-t border-border space-y-1">
              {isTC && totalCost > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Cost</span>
                  <span className="text-muted-foreground">${fmt(totalCost)}</span>
                </div>
              )}
              {isTC && totalBilled > totalCost && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Markup</span>
                  <span className="text-amber-600">+${fmt(totalBilled - totalCost)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">${fmt(totalBilled)}</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Product Picker Sheet */}
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

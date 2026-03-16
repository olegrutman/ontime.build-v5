import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { WorkOrderWizardData, WOMaterialRowDraft, WOMaterialUnit } from '@/types/workOrderWizard';
import { MATERIAL_UNIT_OPTIONS } from '@/types/workOrderWizard';

interface MaterialsStepProps {
  data: WorkOrderWizardData;
  onChange: (updates: Partial<WorkOrderWizardData>) => void;
  isTC: boolean;
}

function newMaterialRow(markupPct: number): WOMaterialRowDraft {
  return {
    tempId: crypto.randomUUID(),
    description: '',
    supplier: '',
    quantity: 1,
    unit: 'ea',
    unit_cost: 0,
    markup_percent: markupPct,
  };
}

export function MaterialsStep({ data, onChange, isTC }: MaterialsStepProps) {
  const rows = data.materials;

  const addRow = () => {
    onChange({ materials: [...rows, newMaterialRow(data.materials_markup_pct)] });
  };

  const updateRow = (tempId: string, updates: Partial<WOMaterialRowDraft>) => {
    onChange({
      materials: rows.map(r => r.tempId === tempId ? { ...r, ...updates } : r),
    });
  };

  const removeRow = (tempId: string) => {
    onChange({ materials: rows.filter(r => r.tempId !== tempId) });
  };

  const applyDefaultMarkup = (pct: number) => {
    onChange({
      materials_markup_pct: pct,
      materials: rows.map(r => ({ ...r, markup_percent: pct })),
    });
  };

  return (
    <div className="space-y-4">
      {isTC && (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground">Default markup %</label>
            <Input
              type="number"
              min={0}
              step={1}
              value={data.materials_markup_pct || ''}
              onChange={(e) => applyDefaultMarkup(Number(e.target.value) || 0)}
              className="mt-1 w-24"
              placeholder="0"
            />
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No materials added yet.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const lineCost = row.quantity * row.unit_cost;
            const billed = lineCost * (1 + row.markup_percent / 100);

            return (
              <div key={row.tempId} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Input
                    placeholder="Description"
                    value={row.description}
                    onChange={(e) => updateRow(row.tempId, { description: e.target.value })}
                    className="flex-1 text-sm"
                  />
                  <button onClick={() => removeRow(row.tempId)} className="p-2 text-destructive hover:bg-destructive/10 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase">Supplier</label>
                  <Input
                    placeholder="Supplier name (optional)"
                    value={row.supplier}
                    onChange={(e) => updateRow(row.tempId, { supplier: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase">Qty</label>
                    <Input
                      type="number"
                      min={0}
                      value={row.quantity || ''}
                      onChange={(e) => updateRow(row.tempId, { quantity: Number(e.target.value) || 0 })}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase">Unit</label>
                    <Select value={row.unit} onValueChange={(v) => updateRow(row.tempId, { unit: v as WOMaterialUnit })}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MATERIAL_UNIT_OPTIONS.map(u => (
                          <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase">Unit cost $</label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.unit_cost || ''}
                      onChange={(e) => updateRow(row.tempId, { unit_cost: Number(e.target.value) || 0 })}
                      className="text-sm"
                    />
                  </div>
                </div>
                {isTC && (
                  <div className="flex items-center justify-between pt-1 text-sm">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-muted-foreground uppercase">Markup %</label>
                      <Input
                        type="number"
                        min={0}
                        value={row.markup_percent || ''}
                        onChange={(e) => updateRow(row.tempId, { markup_percent: Number(e.target.value) || 0 })}
                        className="w-16 text-sm"
                      />
                    </div>
                    <span className="text-primary font-semibold font-barlow-condensed">
                      ${billed.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Button variant="outline" size="sm" onClick={addRow} className="w-full">
        <Plus className="w-4 h-4 mr-1" />
        Add material
      </Button>
    </div>
  );
}

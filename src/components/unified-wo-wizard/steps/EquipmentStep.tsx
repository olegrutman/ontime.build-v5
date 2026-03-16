import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { UnifiedWizardData, WOEquipmentRowDraft } from '@/types/unifiedWizard';

interface EquipmentStepProps {
  data: UnifiedWizardData;
  onChange: (updates: Partial<UnifiedWizardData>) => void;
  isTC: boolean;
}

function newEquipmentRow(markupPct: number): WOEquipmentRowDraft {
  return {
    tempId: crypto.randomUUID(),
    description: '',
    duration_note: '',
    cost: 0,
    markup_percent: markupPct,
  };
}

export function EquipmentStep({ data, onChange, isTC }: EquipmentStepProps) {
  const rows = data.equipment;

  const addRow = () => {
    onChange({ equipment: [...rows, newEquipmentRow(data.equipment_markup_pct)] });
  };

  const updateRow = (tempId: string, updates: Partial<WOEquipmentRowDraft>) => {
    onChange({
      equipment: rows.map(r => r.tempId === tempId ? { ...r, ...updates } : r),
    });
  };

  const removeRow = (tempId: string) => {
    onChange({ equipment: rows.filter(r => r.tempId !== tempId) });
  };

  const applyDefaultMarkup = (pct: number) => {
    onChange({
      equipment_markup_pct: pct,
      equipment: rows.map(r => ({ ...r, markup_percent: pct })),
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
              value={data.equipment_markup_pct || ''}
              onChange={(e) => applyDefaultMarkup(Number(e.target.value) || 0)}
              className="mt-1 w-24"
              placeholder="0"
            />
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No equipment added yet. Tap Add equipment to log costs.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const billed = row.cost * (1 + row.markup_percent / 100);

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
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase">Duration note</label>
                    <Input
                      placeholder="e.g. 2 days"
                      value={row.duration_note}
                      onChange={(e) => updateRow(row.tempId, { duration_note: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase">Cost $</label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.cost || ''}
                      onChange={(e) => updateRow(row.tempId, { cost: Number(e.target.value) || 0 })}
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
        Add equipment
      </Button>
    </div>
  );
}

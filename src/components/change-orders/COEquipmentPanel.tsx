import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Loader2, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { COEquipmentItem } from '@/types/changeOrder';

interface COEquipmentPanelProps {
  coId:      string;
  orgId:     string;
  equipment: COEquipmentItem[];
  isTC:      boolean;
  isGC:      boolean;
  isFC:      boolean;
  canEdit:   boolean;
  onRefresh: () => void;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface DraftEquip {
  tempId:         string;
  description:    string;
  duration_note:  string;
  cost:           string;
  markup_percent: string;
  notes:          string;
}

function newDraft(): DraftEquip {
  return {
    tempId:         crypto.randomUUID(),
    description:    '',
    duration_note:  '',
    cost:           '',
    markup_percent: '0',
    notes:          '',
  };
}

const EQUIPMENT_SUGGESTIONS = [
  'Forklift', 'Scissor lift', 'Boom lift / JLG', 'Skid steer / Bobcat',
  'Generator', 'Compressor', 'Concrete mixer', 'Scaffolding (per section)',
  'Dumpster / roll-off', 'Pressure washer', 'Welder', 'Water pump',
  'Temporary fencing', 'Dump truck', 'Flatbed trailer',
];

export function COEquipmentPanel({
  coId,
  orgId,
  equipment,
  isTC,
  isGC,
  isFC,
  canEdit,
  onRefresh,
}: COEquipmentPanelProps) {
  const [drafts, setDrafts]         = useState<DraftEquip[]>([]);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const totalCost   = equipment.reduce((s, e) => s + (e.cost ?? 0), 0);
  const totalBilled = equipment.reduce((s, e) => s + (e.billed_amount ?? 0), 0);

  function addBlank() {
    setDrafts(d => [...d, newDraft()]);
    setShowPicker(false);
  }

  function addFromSuggestion(name: string) {
    setDrafts(d => [...d, { ...newDraft(), description: name }]);
    setShowPicker(false);
  }

  function updateDraft(tempId: string, field: keyof DraftEquip, value: string) {
    setDrafts(d => d.map(r => (r.tempId === tempId ? { ...r, [field]: value } : r)));
  }

  function removeDraft(tempId: string) {
    setDrafts(d => d.filter(r => r.tempId !== tempId));
  }

  async function saveDrafts() {
    const valid = drafts.filter(d => d.description.trim() && parseFloat(d.cost) > 0);
    if (valid.length === 0) return;

    setSaving(true);
    try {
      const rows = valid.map(d => ({
        co_id:          coId,
        org_id:         orgId,
        added_by_role:  isGC ? 'GC' : isFC ? 'FC' : 'TC',
        description:    d.description.trim(),
        duration_note:  d.duration_note.trim() || null,
        cost:           parseFloat(d.cost) || 0,
        markup_percent: parseFloat(d.markup_percent) || 0,
        notes:          d.notes.trim() || null,
      }));

      const { error } = await supabase.from('co_equipment_items').insert(rows);
      if (error) throw error;

      setDrafts([]);
      toast.success(`${valid.length} equipment item${valid.length > 1 ? 's' : ''} added`);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id: string) {
    setDeleting(id);
    try {
      const { error } = await supabase.from('co_equipment_items').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="co-light-shell">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border co-light-header">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Equipment</h3>
        </div>
        {canEdit && (isTC || isGC || isFC) && (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowPicker(p => !p)}>
              Pick from list
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addBlank}>
              <Plus className="h-3 w-3" />
              Custom
            </Button>
          </div>
        )}
      </div>

      {showPicker && (
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <p className="text-xs font-medium text-muted-foreground mb-2">Common equipment</p>
          <div className="flex flex-wrap gap-1.5">
            {EQUIPMENT_SUGGESTIONS.map(name => (
              <button
                key={name}
                onClick={() => addFromSuggestion(name)}
                className="text-xs px-2.5 py-1 rounded-full border border-border bg-card hover:border-primary/40 hover:bg-muted/40 transition-colors text-foreground"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {equipment.length === 0 && drafts.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">No equipment added yet</p>
          {canEdit && (isTC || isGC || isFC) && (
            <Button variant="outline" size="sm" className="mt-3 text-xs gap-1" onClick={() => setShowPicker(true)}>
              <Plus className="h-3 w-3" />
              Add equipment
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="divide-y divide-border">
            {equipment.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.description}</p>
                  {item.duration_note && (
                    <p className="text-xs text-muted-foreground">{item.duration_note}</p>
                  )}
                </div>
                <div className="text-right text-sm shrink-0">
                  {isTC && (
                    <div className="text-xs text-muted-foreground">
                      Cost: ${fmt(item.cost ?? 0)}
                    </div>
                  )}
                  {isTC && item.markup_percent > 0 && (
                    <div className="text-[10px] text-muted-foreground">
                      +{item.markup_percent}% markup
                    </div>
                  )}
                  {!isFC && (
                    <div className="font-medium text-foreground">
                      ${fmt(item.billed_amount ?? 0)}
                    </div>
                  )}
                </div>
                {canEdit && isTC && (
                  <button
                    onClick={() => deleteItem(item.id)}
                    disabled={deleting === item.id}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-1 shrink-0"
                  >
                    {deleting === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            ))}

            {drafts.map(draft => {
              const cost   = parseFloat(draft.cost) || 0;
              const markup = parseFloat(draft.markup_percent) || 0;
              const billed = cost * (1 + markup / 100);

              return (
                <div key={draft.tempId} className="px-4 py-3 space-y-2 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Input
                      value={draft.description}
                      onChange={e => updateDraft(draft.tempId, 'description', e.target.value)}
                      placeholder="Equipment description *"
                      className="flex-1 h-8 text-sm"
                    />
                    <button
                      onClick={() => removeDraft(draft.tempId)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Duration</p>
                      <Input
                        value={draft.duration_note}
                        onChange={e => updateDraft(draft.tempId, 'duration_note', e.target.value)}
                        placeholder="e.g. 2 days"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Cost $</p>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                        <Input
                          type="number"
                          value={draft.cost}
                          onChange={e => updateDraft(draft.tempId, 'cost', e.target.value)}
                          placeholder="0.00"
                          className="h-7 text-xs pl-5"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Markup %</p>
                      <div className="relative">
                        <Input
                          type="number"
                          value={draft.markup_percent}
                          onChange={e => updateDraft(draft.tempId, 'markup_percent', e.target.value)}
                          className="h-7 text-xs pr-5"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>

                  {billed > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Billed</span>
                      <span className="font-medium text-foreground">${fmt(billed)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {drafts.length > 0 && (
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setDrafts([])} disabled={saving}>
                Discard
              </Button>
              <Button
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={saveDrafts}
                disabled={saving || drafts.every(d => !d.description.trim() || !d.cost)}
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                Save
              </Button>
            </div>
          )}

          {equipment.length > 0 && !isFC && (
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
                  <span className="co-light-success-text">+${fmt(totalBilled - totalCost)}</span>
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
    </div>
  );
}

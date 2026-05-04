import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Sparkles, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ScopeCatalogItem, COReasonCode } from '@/types/changeOrder';
import type { SelectedScopeItem } from './wizardTypes';

interface AddCustomItemDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  locationTag: string;
  reason: COReasonCode | null;
  onAdd: (item: SelectedScopeItem) => void;
}

const UNITS = ['EA', 'SF', 'LF', 'HR', 'LS', 'CY', 'TON'];

const DIVISIONS: { value: string; label: string }[] = [
  { value: 'interior_finish',   label: 'Interior finishes' },
  { value: 'framing',           label: 'Framing' },
  { value: 'structural',        label: 'Structural' },
  { value: 'sheathing',         label: 'Sheathing' },
  { value: 'envelope_wrb',      label: 'WRB & Envelope' },
  { value: 'envelope_exterior', label: 'Exterior skin' },
  { value: 'demo',              label: 'Demo' },
  { value: 'fix',               label: 'Backout & Fixes' },
  { value: 'general',           label: 'General' },
  { value: 'custom',            label: 'Other / Custom' },
];

export function AddCustomItemDialog({ open, onOpenChange, locationTag, reason, onAdd }: AddCustomItemDialogProps) {
  const { userOrgRoles } = useAuth();
  const orgRole = userOrgRoles?.[0];
  const canPromoteToOrg = !!orgRole?.organization_id && !!orgRole?.is_admin;

  const [name, setName] = useState('');
  const [unit, setUnit] = useState('SF');
  const [division, setDivision] = useState('interior_finish');
  const [category, setCategory] = useState('');
  const [qty, setQty] = useState('');
  const [description, setDescription] = useState('');
  const [saveToOrg, setSaveToOrg] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() {
    setName(''); setUnit('SF'); setDivision('interior_finish'); setCategory('');
    setQty(''); setDescription(''); setSaveToOrg(false);
  }

  async function handleAdd() {
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      toast.error('Give the item a short name');
      return;
    }
    setSaving(true);
    try {
      let catalogId: string | null = null;
      const cleanCategory = (category.trim() || 'custom').toLowerCase().replace(/[^a-z0-9_]+/g, '_');

      if (saveToOrg && canPromoteToOrg) {
        const slug = `org_${orgRole!.organization_id!.slice(0, 8)}_${cleanCategory}_${Date.now()}`;
        const { data: inserted, error } = await supabase
          .from('catalog_definitions')
          .insert({
            slug,
            kind: 'scope',
            is_platform: false,
            org_id: orgRole!.organization_id!,
            canonical_name: trimmed,
            division,
            category: cleanCategory,
            unit,
            search_text: `${trimmed} ${description}`.toLowerCase(),
            applicable_work_types: [],
            applicable_reasons: [],
            sort_order: 999,
          } as any)
          .select('id')
          .single();
        if (error) throw error;
        catalogId = inserted.id;
        toast.success('Saved to your organization catalog');
      }

      const tempId = catalogId ?? `custom_${crypto.randomUUID()}`;
      const base: ScopeCatalogItem = {
        id: tempId,
        item_name: trimmed,
        unit,
        division,
        category_id: cleanCategory,
        category_name: cleanCategory.replace(/_/g, ' '),
        group_id: cleanCategory,
        group_label: cleanCategory.replace(/_/g, ' '),
        category_color: '',
        category_bg: '',
        category_icon: '✎',
        sort_order: 999,
        org_id: catalogId ? orgRole!.organization_id! : null,
        qty: qty ? Number(qty) : null,
        quantity_source: qty ? 'manual' : null,
      };

      const item: SelectedScopeItem & { isCustom?: boolean; catalogId?: string | null } = {
        ...base,
        locationTag: locationTag || '',
        reason: (reason ?? 'addition') as COReasonCode,
        reasonDescription: description.trim(),
        isCustom: !catalogId,
        catalogId,
      } as any;

      onAdd(item);
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to add custom item');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" /> Add a custom scope item
          </DialogTitle>
          <DialogDescription className="text-xs">
            Use this when nothing in the catalog fits — e.g. T&G wood ceiling install, specialty trim, or a one-off task.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Item name *</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. T&G wood ceiling — install"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Quantity (optional)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="0"
                className="mt-1 h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Division</Label>
              <Select value={division} onValueChange={setDivision}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIVISIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Category (optional)</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. ceiling_finish"
                className="mt-1 h-9"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any context that helps the crew price/build this."
              className="mt-1 min-h-[64px] text-xs"
            />
          </div>

          {canPromoteToOrg && (
            <label className="flex items-start gap-2 rounded-md border bg-muted/30 p-2.5 cursor-pointer">
              <Checkbox
                checked={saveToOrg}
                onCheckedChange={(v) => setSaveToOrg(!!v)}
                className="mt-0.5"
              />
              <div className="text-xs">
                <p className="font-medium">Save to my organization's catalog</p>
                <p className="text-muted-foreground">Future change orders in your org will see this item.</p>
              </div>
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleAdd} disabled={saving || name.trim().length < 3}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Add item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

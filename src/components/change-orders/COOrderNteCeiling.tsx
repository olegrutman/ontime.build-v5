import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { nteCeilingError } from '@/lib/coNteCeiling';

interface COOrderNteCeilingProps {
  coId: string;
  ceiling: number | null;
  currentActuals: number;
  canEdit: boolean;
  onRefresh: () => void | Promise<unknown>;
}

export function COOrderNteCeiling({ coId, ceiling, currentActuals, canEdit, onRefresh }: COOrderNteCeilingProps) {
  const [value, setValue] = useState(ceiling == null ? '' : String(ceiling));
  const [saving, setSaving] = useState(false);
  const parsed = value.trim() ? Number(value) : null;
  const error = nteCeilingError('nte', parsed, currentActuals);

  async function save() {
    if (error || parsed == null) {
      toast.error(error ?? 'Enter a valid ceiling.');
      return;
    }
    setSaving(true);
    try {
      const { error: saveError } = await supabase.rpc('set_co_nte_ceiling', {
        _co_id: coId,
        _ceiling: parsed,
      });
      if (saveError) throw saveError;
      await onRefresh();
      toast.success('Not-to-exceed ceiling saved');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save the ceiling');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-state-open/30 bg-state-open-bg p-3 space-y-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-state-open-foreground" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">Order ceiling</p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Labor, materials and equipment together cannot pass this amount.
          </p>
        </div>
      </div>
      {canEdit ? (
        <>
          <Label htmlFor={`order-nte-ceiling-${coId}`} className="text-xs">Not-to-exceed ceiling</Label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                id={`order-nte-ceiling-${coId}`}
                type="number"
                min="0.01"
                step="0.01"
                value={value}
                onChange={event => setValue(event.target.value)}
                className="pl-7 font-mono"
                placeholder="0.00"
                disabled={saving}
              />
            </div>
            <Button type="button" size="sm" onClick={save} disabled={saving || !!error}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
          {error && value.trim() && <p className="text-[11px] text-destructive">{error}</p>}
        </>
      ) : (
        <p className="text-xs text-state-open-foreground">
          {ceiling == null ? 'No ceiling is set. Submission and approval are blocked.' : `Ceiling: $${ceiling.toFixed(2)}`}
        </p>
      )}
    </div>
  );
}

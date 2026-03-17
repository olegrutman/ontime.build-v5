import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Check, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import type { COLaborRole, COPricingMode } from '@/types/changeOrder';

interface LaborEntryFormProps {
  coId: string;
  lineItemId: string;
  orgId: string;
  enteredByRole: COLaborRole;
  pricingType: 'fixed' | 'tm' | 'nte';
  isActualCost?: boolean;
  onSaved: () => void;
  onCancel: () => void;
  nteCap?: number | null;
  nteUsed?: number;
}

export function LaborEntryForm({
  coId,
  lineItemId,
  orgId,
  enteredByRole,
  pricingType,
  isActualCost = false,
  onSaved,
  onCancel,
  nteCap,
  nteUsed = 0,
}: LaborEntryFormProps) {
  const { user } = useAuth();

  const [mode, setMode] = useState<COPricingMode>(
    pricingType === 'fixed' ? 'lump_sum' : 'hourly'
  );
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [hours, setHours] = useState('');
  const [rate, setRate] = useState('');
  const [lumpSum, setLumpSum] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [showNTEWarn, setShowNTEWarn] = useState(false);

  useEffect(() => {
    async function loadRate() {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('hourly_rate')
        .eq('id', user.id)
        .single();
      if (data?.hourly_rate) {
        setRate(String(data.hourly_rate));
      }
    }
    loadRate();
  }, [user]);

  const computedTotal =
    mode === 'lump_sum'
      ? parseFloat(lumpSum) || 0
      : (parseFloat(hours) || 0) * (parseFloat(rate) || 0);

  const projectedUsed = nteUsed + computedTotal;
  const ntePercent = nteCap && nteCap > 0 ? (projectedUsed / nteCap) * 100 : null;
  const willExceed = ntePercent !== null && ntePercent >= 95;

  const canSave =
    entryDate &&
    computedTotal > 0 &&
    (mode === 'lump_sum' ? !!lumpSum : !!hours);

  async function attemptSave() {
    if (!canSave || !user) return;

    if (!isActualCost && willExceed && !showNTEWarn) {
      setShowNTEWarn(true);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('co_labor_entries').insert({
        co_id: coId,
        co_line_item_id: lineItemId,
        org_id: orgId,
        entered_by_role: enteredByRole,
        entry_date: entryDate,
        pricing_mode: mode,
        hours: mode === 'hourly' ? parseFloat(hours) || null : null,
        hourly_rate: mode === 'hourly' ? parseFloat(rate) || null : null,
        lump_sum: mode === 'lump_sum' ? parseFloat(lumpSum) || null : null,
        description: description.trim() || null,
        is_actual_cost: isActualCost,
      });
      if (error) throw error;
      onSaved();
    } catch (err: any) {
      console.error('Failed to save labor entry:', err);
    } finally {
      setSaving(false);
      setShowNTEWarn(false);
    }
  }

  return (
    <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/20">
      {isActualCost && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
          <span>🔒</span>
          Actual cost — private to you, not visible to TC or GC
        </div>
      )}

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setMode('hourly')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
            mode === 'hourly'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:border-primary/40'
          )}
        >
          <Clock className="h-3 w-3" />
          Hourly
        </button>
        <button
          type="button"
          onClick={() => setMode('lump_sum')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
            mode === 'lump_sum'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:border-primary/40'
          )}
        >
          <DollarSign className="h-3 w-3" />
          Lump sum
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Date</Label>
          <Input
            type="date"
            value={entryDate}
            onChange={e => setEntryDate(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {mode === 'hourly' ? (
          <>
            <div>
              <Label className="text-xs">Hours</Label>
              <Input
                type="number"
                step="0.25"
                min="0"
                value={hours}
                onChange={e => setHours(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="col-span-2">
              <div className="flex items-baseline gap-1">
                <Label className="text-xs">Rate ($/hr)</Label>
                <span className="text-[10px] text-muted-foreground">from your profile</span>
              </div>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={rate}
                  onChange={e => setRate(e.target.value)}
                  className="h-8 text-sm pl-6"
                />
              </div>
            </div>
          </>
        ) : (
          <div>
            <Label className="text-xs">Amount</Label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={lumpSum}
                onChange={e => setLumpSum(e.target.value)}
                className="h-8 text-sm pl-6"
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <Label className="text-xs">Description (optional)</Label>
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What work was done…"
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      {computedTotal > 0 && (
        <div className="flex items-center justify-between text-sm bg-muted/30 rounded px-2 py-1.5">
          <span className="text-muted-foreground text-xs">Entry total</span>
          <span className="font-semibold text-foreground">
            ${computedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {showNTEWarn && ntePercent !== null && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
          <p className="text-xs font-medium text-destructive">NTE cap warning</p>
          <p className="text-xs text-destructive/80">
            This entry will bring you to{' '}
            <span className="font-semibold">{ntePercent.toFixed(1)}%</span> of the $
            {nteCap?.toLocaleString('en-US', { minimumFractionDigits: 2 })} cap.
            {ntePercent >= 100
              ? ' You will exceed the cap. GC will be notified.'
              : ' Consider requesting an increase before continuing.'}
          </p>
          <p className="text-xs text-destructive/80 font-medium">Log this entry anyway?</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs h-7"
              onClick={() => setShowNTEWarn(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 text-xs h-7"
              onClick={attemptSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Log anyway'}
            </Button>
          </div>
        </div>
      )}

      {!showNTEWarn && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="flex-1 h-8 text-xs gap-1"
            onClick={attemptSave}
            disabled={!canSave || saving}
          >
            {saving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
            Save entry
          </Button>
        </div>
      )}
    </div>
  );
}

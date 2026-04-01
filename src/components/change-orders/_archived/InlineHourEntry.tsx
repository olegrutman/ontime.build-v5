import { useState, useEffect } from 'react';
import { Clock, DollarSign, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { COLaborRole, COPricingMode } from '@/types/changeOrder';

interface InlineHourEntryProps {
  coId: string;
  lineItemId: string;
  orgId: string;
  role: COLaborRole;
  isFC: boolean;
  pricingType: 'fixed' | 'tm' | 'nte';
  nteCap?: number | null;
  nteUsed?: number;
  onSaved: () => void;
}

const QUICK_HOURS = [2, 4, 8];

export function InlineHourEntry({
  coId,
  lineItemId,
  orgId,
  role,
  isFC,
  pricingType,
  nteCap,
  nteUsed = 0,
  onSaved,
}: InlineHourEntryProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<COPricingMode>(pricingType === 'fixed' ? 'lump_sum' : 'hourly');
  const [hours, setHours] = useState<number | null>(null);
  const [lumpSum, setLumpSum] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [customInput, setCustomInput] = useState(false);

  // Load rate from profile for TC
  useEffect(() => {
    if (isFC || !user) return;
    let cancelled = false;
    async function loadRate() {
      const { data } = await supabase
        .from('profiles')
        .select('hourly_rate')
        .eq('user_id', user!.id)
        .single();
      if (!cancelled && data?.hourly_rate) setRate(data.hourly_rate);
    }
    loadRate();
    return () => { cancelled = true; };
  }, [user, isFC]);

  const displayValue = mode === 'lump_sum' ? (lumpSum ?? 0) : (hours ?? 0);
  const computedTotal = mode === 'lump_sum' ? (lumpSum ?? 0) : (hours ?? 0) * (rate ?? 0);

  function selectQuickHour(h: number) {
    setHours(h);
    setCustomInput(false);
  }

  async function handleSubmit() {
    if (!user) return;

    // Validation
    if (mode === 'hourly' && (!hours || hours <= 0)) {
      toast.error('Enter hours greater than zero.');
      return;
    }
    if (mode === 'lump_sum' && (!lumpSum || lumpSum <= 0)) {
      toast.error('Enter an amount greater than zero.');
      return;
    }
    if (mode === 'hourly' && !isFC && (!rate || rate <= 0)) {
      toast.error('Enter an hourly rate.');
      return;
    }

    // NTE hard block
    if (nteCap && nteCap > 0 && nteUsed >= nteCap) {
      toast.error('NTE cap reached. GC must increase the cap.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('co_labor_entries').insert({
        co_id: coId,
        co_line_item_id: lineItemId,
        org_id: orgId,
        entered_by_role: role,
        entry_date: entryDate,
        pricing_mode: mode,
        hours: mode === 'hourly' ? hours : null,
        hourly_rate: mode === 'hourly' && !isFC ? rate : null,
        lump_sum: mode === 'lump_sum' ? lumpSum : null,
        description: description.trim() || null,
        is_actual_cost: false,
      });
      if (error) throw error;
      toast.success('Hours logged');
      onSaved();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 py-3">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('hourly')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all min-h-[44px] flex-1',
            mode === 'hourly'
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-border bg-card text-muted-foreground',
          )}
        >
          <Clock className="h-4 w-4" />
          Hours
        </button>
        <button
          type="button"
          onClick={() => setMode('lump_sum')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all min-h-[44px] flex-1',
            mode === 'lump_sum'
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-border bg-card text-muted-foreground',
          )}
        >
          <DollarSign className="h-4 w-4" />
          Lump sum
        </button>
      </div>

      {/* Large number display */}
      <div className="text-center py-4">
        <p
          className="tabular-nums leading-none text-foreground"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '3.5rem', fontWeight: 800 }}
        >
          {mode === 'hourly'
            ? (hours !== null ? hours : '—')
            : (lumpSum !== null ? `$${lumpSum.toLocaleString()}` : '—')
          }
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {mode === 'hourly' ? 'hours' : 'lump sum amount'}
        </p>
      </div>

      {/* Quick-select pills (hourly mode) */}
      {mode === 'hourly' && (
        <div className="flex items-center gap-2 justify-center">
          {QUICK_HOURS.map(h => (
            <button
              key={h}
              type="button"
              onClick={() => selectQuickHour(h)}
              className={cn(
                'px-5 py-2.5 rounded-full text-sm font-semibold border-2 transition-all min-h-[44px]',
                hours === h
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40',
              )}
            >
              {h}h
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setCustomInput(true);
              setHours(null);
            }}
            className={cn(
              'px-5 py-2.5 rounded-full text-sm font-semibold border-2 transition-all min-h-[44px]',
              customInput
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40',
            )}
          >
            +
          </button>
        </div>
      )}

      {/* Custom input */}
      {mode === 'hourly' && customInput && (
        <div className="animate-fade-in">
          <Input
            type="number"
            step="0.25"
            min="0"
            placeholder="Enter hours"
            value={hours ?? ''}
            onChange={e => setHours(parseFloat(e.target.value) || null)}
            className="h-12 text-center text-lg font-semibold"
            autoFocus
          />
        </div>
      )}

      {mode === 'lump_sum' && (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={lumpSum ?? ''}
            onChange={e => setLumpSum(parseFloat(e.target.value) || null)}
            className="h-12 text-center text-lg font-semibold pl-8"
          />
        </div>
      )}

      {/* Date row */}
      <button
        type="button"
        onClick={() => {
          const input = document.getElementById('inline-date-input') as HTMLInputElement;
          input?.showPicker?.();
        }}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card text-sm min-h-[44px]"
      >
        <span className="text-foreground font-medium">
          {entryDate === format(new Date(), 'yyyy-MM-dd')
            ? `Today, ${format(new Date(), 'MMM d')}`
            : format(new Date(entryDate + 'T12:00:00'), 'EEE, MMM d')}
        </span>
        <span className="text-muted-foreground">▾</span>
      </button>
      <input
        id="inline-date-input"
        type="date"
        value={entryDate}
        onChange={e => setEntryDate(e.target.value)}
        className="sr-only"
      />

      {/* Optional description */}
      <Textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="What did you work on? (optional)"
        rows={2}
        className="resize-none text-sm"
      />

      {/* TC rate field (non-FC only) */}
      {!isFC && mode === 'hourly' && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card">
          <span className="text-xs text-muted-foreground">Your rate:</span>
          <span className="text-sm font-semibold text-foreground">${rate ?? '—'}/hr</span>
        </div>
      )}

      {/* Preview bar */}
      <div className="rounded-xl px-4 py-3 bg-secondary text-secondary-foreground">
        <div className="flex items-center justify-between">
          <span className="text-xs">
            {isFC ? 'Your entry (TC will price)' : 'Your price to GC'}
          </span>
          <span className="font-semibold text-primary" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {isFC
              ? (mode === 'hourly'
                  ? `${hours ?? 0} hrs`
                  : `$${(lumpSum ?? 0).toLocaleString()}`)
              : `$${computedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            }
          </span>
        </div>
      </div>

      {/* Submit button */}
      <Button
        onClick={handleSubmit}
        disabled={saving || displayValue <= 0}
        className="w-full h-12 text-sm font-semibold gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        {isFC
          ? `Submit ${mode === 'hourly' ? `${hours ?? 0} hours` : 'amount'} to TC`
          : 'Submit pricing to GC'}
      </Button>
    </div>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DT } from '@/lib/design-tokens';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface COHourEntryInlineProps {
  coId: string;
  lineItemId: string;
  orgId: string;
  pricingType: 'fixed' | 'tm' | 'nte';
  nteCap?: number | null;
  nteUsed?: number;
  onSaved: () => void;
}

const QUICK_HOURS = [2, 4, 8];

export function COHourEntryInline({
  coId, lineItemId, orgId, pricingType, nteCap, nteUsed = 0, onSaved,
}: COHourEntryInlineProps) {
  const { user } = useAuth();
  const [hours, setHours] = useState<number | null>(null);
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [customInput, setCustomInput] = useState(false);

  async function handleSubmit() {
    if (!user || !hours || hours <= 0) {
      toast.error('Enter hours greater than zero.');
      return;
    }
    if (nteCap && nteCap > 0 && nteUsed >= nteCap) {
      toast.error('NTE cap reached.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('co_labor_entries').insert({
        co_id: coId,
        co_line_item_id: lineItemId,
        org_id: orgId,
        entered_by_role: 'FC',
        entry_date: entryDate,
        pricing_mode: 'hourly',
        hours,
        description: description.trim() || null,
        is_actual_cost: false,
      });
      if (error) throw error;
      toast.success('Hours logged');
      setHours(null);
      setDescription('');
      setCustomInput(false);
      onSaved();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'hsl(var(--navy))' }}>
      <div className="px-4 pt-4 pb-2">
        <p className="text-[0.6rem] uppercase tracking-[0.1em] font-medium" style={{ color: 'hsl(220 27% 65%)' }}>
          LOG YOUR HOURS
        </p>
      </div>

      {/* Giant number */}
      <div className="text-center py-4">
        <p
          className="tabular-nums leading-none"
          style={{ ...DT.heading, fontSize: '4rem', fontWeight: 900, color: 'hsl(var(--amber))' }}
        >
          {hours ?? '—'}
        </p>
        <p className="text-[0.65rem] mt-1" style={{ color: 'hsl(220 27% 65%)' }}>
          hours
        </p>
      </div>

      {/* Quick-tap pills */}
      <div className="flex items-center gap-2 justify-center px-4">
        {QUICK_HOURS.map(h => (
          <button
            key={h}
            type="button"
            onClick={() => { setHours(h); setCustomInput(false); }}
            className={cn(
              'px-5 py-2.5 rounded-full text-sm font-semibold border-2 transition-all min-h-[44px]',
              hours === h && !customInput
                ? 'border-[hsl(var(--amber))] bg-[hsl(var(--amber))] text-[hsl(var(--navy))]'
                : 'border-white/20 bg-white/5 text-white/80 hover:border-white/40',
            )}
          >
            {h}h
          </button>
        ))}
        <button
          type="button"
          onClick={() => { setCustomInput(true); setHours(null); }}
          className={cn(
            'px-5 py-2.5 rounded-full text-sm font-semibold border-2 transition-all min-h-[44px]',
            customInput
              ? 'border-[hsl(var(--amber))] bg-[hsl(var(--amber))] text-[hsl(var(--navy))]'
              : 'border-white/20 bg-white/5 text-white/80 hover:border-white/40',
          )}
        >
          +
        </button>
      </div>

      {/* Custom input */}
      {customInput && (
        <div className="px-4 mt-3">
          <Input
            type="number"
            step="0.25"
            min="0"
            placeholder="Enter hours"
            value={hours ?? ''}
            onChange={e => setHours(parseFloat(e.target.value) || null)}
            className="h-12 text-center text-lg font-semibold bg-white/10 border-white/20 text-white placeholder:text-white/40"
            autoFocus
          />
        </div>
      )}

      {/* Date selector */}
      <div className="px-4 mt-3">
        <button
          type="button"
          onClick={() => {
            const input = document.getElementById('co-inline-date') as HTMLInputElement;
            input?.showPicker?.();
          }}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-white/15 bg-white/5 text-sm min-h-[44px] text-white"
        >
          <span className="font-medium">
            {entryDate === format(new Date(), 'yyyy-MM-dd')
              ? `Today, ${format(new Date(), 'MMM d')}`
              : format(new Date(entryDate + 'T12:00:00'), 'EEE, MMM d')}
          </span>
          <span className="text-white/50">▾</span>
        </button>
        <input
          id="co-inline-date"
          type="date"
          value={entryDate}
          onChange={e => setEntryDate(e.target.value)}
          className="sr-only"
        />
      </div>

      {/* Description */}
      <div className="px-4 mt-3">
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What did you work on? (optional)"
          rows={2}
          className="resize-none text-sm bg-white/10 border-white/20 text-white placeholder:text-white/40"
        />
      </div>

      {/* Preview bar */}
      <div className="mx-4 mt-3 rounded-xl px-4 py-3 bg-white/5 border border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-[0.7rem]" style={{ color: 'hsl(220 27% 70%)' }}>
            Your entry (TC will price)
          </span>
          <span className="font-bold" style={{ ...DT.heading, color: 'hsl(var(--amber))' }}>
            {hours ?? 0} hrs
          </span>
        </div>
      </div>

      {/* Submit */}
      <div className="px-4 pt-3 pb-4">
        <Button
          onClick={handleSubmit}
          disabled={saving || !hours || hours <= 0}
          className="w-full h-12 text-sm font-semibold gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Submit {hours ?? 0} hours to TC
        </Button>
      </div>
    </div>
  );
}

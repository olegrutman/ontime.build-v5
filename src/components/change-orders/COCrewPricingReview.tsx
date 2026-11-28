import { useMemo, useState } from 'react';
import { Check, CheckCheck, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { crewReviewSubmission, type CrewReviewChoice } from '@/lib/crewHourReview';
import { fmtHours } from '@/lib/crewWorkload';
import type { COLaborEntry, COLineItem } from '@/types/changeOrder';

const money = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Props {
  crewName: string;
  lineItems: COLineItem[];
  laborEntries: COLaborEntry[];
  submitted: boolean;
  onRefresh: () => void;
}

/** One review of the crew's pricing: choices stay provisional until "Confirm decisions". */
export function COCrewPricingReview({ crewName, lineItems, laborEntries, submitted, onRefresh }: Props) {
  const pending = useMemo(() => laborEntries.filter(e =>
    e.entered_by_role === 'FC' && !e.is_actual_cost && e.crew_review_status === 'pending'), [laborEntries]);
  const [choices, setChoices] = useState<Record<string, CrewReviewChoice | undefined>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  if (pending.length === 0) return null;
  if (!submitted) {
    const saved = pending.reduce((sum, e) => sum + Number(e.line_total ?? 0), 0);
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground break-words sm:px-4">
        <span className="font-semibold text-foreground">{crewName} is still pricing</span> · {money(saved)} saved, not sent yet. You can review it once they send it to you.
      </div>
    );
  }

  const decided = pending.filter(e => choices[e.id]).length;
  const total = pending.reduce((s, e) => s + Number(e.line_total ?? 0), 0);
  const itemName = (id: string) => lineItems.find(i => i.id === id)?.item_name ?? 'Scope item';

  function choose(id: string, choice: CrewReviewChoice | undefined) {
    setChoices(prev => ({ ...prev, [id]: choice }));
  }

  async function submit() {
    const { error, decisions } = crewReviewSubmission(pending.map(e => e.id), choices);
    if (error) { toast.error(error); return; }
    setSaving(true);
    try {
      for (const d of decisions) {
        const { error: rpcError } = await supabase.rpc('review_fc_labor_entry', { _entry_id: d.id, _decision: d.decision, _note: d.note });
        if (rpcError) throw rpcError;
      }
      const rejected = decisions.filter(d => d.decision === 'rejected').length;
      toast.success(rejected > 0
        ? `Decisions saved — ${decisions.length - rejected} accepted, ${rejected} sent back to ${crewName}`
        : `Decisions saved — all ${crewName} pricing accepted`);
      setChoices({});
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save decisions');
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div id="crew-pricing-review" className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-3 py-3 sm:px-4">
        <div className="w-full min-w-0 sm:w-auto sm:flex-1">
          <p className="text-sm font-semibold text-foreground break-words">Review {crewName} pricing</p>
          <p className="mt-0.5 break-words text-[11px] text-muted-foreground">
            Pricing sent · {pending.length} entr{pending.length === 1 ? 'y' : 'ies'} · {money(total)} · {decided} decided. Nothing is saved until you confirm your decisions.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" className="h-8 shrink-0 gap-1.5 text-xs" disabled={saving}
          onClick={() => setChoices(prev => Object.fromEntries(pending.map(e => [e.id, prev[e.id] ?? { decision: 'approved' }])))}>
          <CheckCheck className="h-3.5 w-3.5" /> Accept all remaining
        </Button>
        <Button type="button" size="sm" className="h-8 shrink-0 gap-1.5 text-xs" disabled={saving || decided < pending.length} onClick={() => void submit()}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Confirm decisions
        </Button>
      </div>
      <div className="divide-y divide-border/60">
        {pending.map(e => {
          const choice = choices[e.id];
          return (
            <div key={e.id} className="px-3 py-2.5 sm:px-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-full min-w-0 sm:w-auto sm:flex-1">
                  <p className="break-words text-xs font-semibold text-foreground">{itemName(e.co_line_item_id)}</p>
                  <p className="break-words text-[11px] text-muted-foreground">
                    {e.entry_date} · {e.pricing_mode === 'hourly' ? `${fmtHours(Number(e.hours ?? 0))}h` : 'lump sum'}{e.description ? ` · ${e.description}` : ''}
                  </p>
                </div>
                <span className="mr-auto shrink-0 font-mono text-sm sm:mr-0 font-semibold text-foreground">{money(Number(e.line_total ?? 0))}</span>
                <div className="flex shrink-0 gap-1.5">
                  <Button type="button" size="sm" variant={choice?.decision === 'approved' ? 'secondary' : 'outline'}
                    className={cn('h-7 gap-1 px-2.5 text-[11px]', choice?.decision === 'approved' && 'ring-1 ring-state-approved')}
                    disabled={saving} onClick={() => { choose(e.id, { decision: 'approved' }); setRejectingId(null); }}>
                    <Check className="h-3 w-3" /> Accept
                  </Button>
                  <Button type="button" size="sm" variant="outline"
                    className={cn('h-7 gap-1 px-2.5 text-[11px] text-destructive hover:text-destructive', choice?.decision === 'rejected' && 'ring-1 ring-destructive')}
                    disabled={saving} onClick={() => { choose(e.id, { decision: 'rejected', note: choice?.note ?? '' }); setRejectingId(e.id); }}>
                    <X className="h-3 w-3" /> Reject
                  </Button>
                </div>
              </div>
              {choice?.decision === 'rejected' && (
                <div className="mt-2">
                  <label htmlFor={`crew-review-${e.id}`} className="text-[11px] font-semibold text-foreground">Reason {crewName} will see *</label>
                  <Textarea id={`crew-review-${e.id}`} rows={2} className="mt-1 resize-none text-xs" autoFocus={rejectingId === e.id}
                    value={choice.note ?? ''} placeholder="Explain what the crew needs to correct"
                    onChange={ev => choose(e.id, { decision: 'rejected', note: ev.target.value })} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

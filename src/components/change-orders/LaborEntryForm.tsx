import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Check, Clock, DollarSign, Hash, Lock, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { COLaborRole, COPricingMode, COLaborEntry } from '@/types/changeOrder';

interface LaborEntryFormProps {
  coId: string;
  lineItemId: string;
  orgId: string;
  enteredByRole: COLaborRole;
  pricingType: 'fixed' | 'tm' | 'nte';
  isTC?: boolean;
  isFC?: boolean;
  isActualCost?: boolean;
  /** When provided, the form edits this existing entry instead of inserting a new one. */
  editingEntry?: COLaborEntry;
  onSaved: () => void;
  onCancel?: () => void;
  nteCap?: number | null;
  nteUsed?: number;
}

const QUICK_HOURS = [2, 4, 8, 10];
type EntryMode = 'hourly' | 'lump_sum' | 'unit_price';

export function LaborEntryForm({
  coId, lineItemId, orgId, enteredByRole, pricingType,
  isTC = false, isFC = false, isActualCost = false,
  editingEntry,
  onSaved, onCancel, nteCap, nteUsed = 0,
}: LaborEntryFormProps) {
  const { user } = useAuth();
  const isEditing = !!editingEntry;

  const [mode, setMode] = useState<EntryMode>(
    editingEntry
      ? (editingEntry.pricing_mode === 'lump_sum' ? 'lump_sum' : 'hourly')
      : (pricingType === 'fixed' ? 'lump_sum' : 'hourly'),
  );
  const [entryDate, setEntryDate] = useState(editingEntry?.entry_date ?? format(new Date(), 'yyyy-MM-dd'));
  const [hours, setHours] = useState(editingEntry?.hours != null ? String(editingEntry.hours) : '');
  const [rate, setRate] = useState(editingEntry?.hourly_rate != null ? String(editingEntry.hourly_rate) : '');
  const [markup, setMarkup] = useState('');
  const [lumpSum, setLumpSum] = useState(editingEntry?.lump_sum != null ? String(editingEntry.lump_sum) : '');
  const [qty, setQty] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [description, setDescription] = useState(editingEntry?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [showNTEWarn, setShowNTEWarn] = useState(false);
  const [internalCostOpen, setInternalCostOpen] = useState(true);
  const [internalCost, setInternalCost] = useState('');
  const [costType, setCostType] = useState('labor_wages');

  useEffect(() => {
    let cancelled = false;
    async function loadDefaults() {
      if (!user || !orgId) return;
      const [orgRes, profileRes] = await Promise.all([
        supabase.from('org_settings').select('default_hourly_rate, labor_markup_percent').eq('organization_id', orgId).maybeSingle(),
        supabase.from('profiles').select('hourly_rate').eq('user_id', user.id).single(),
      ]);
      if (cancelled) return;
      const orgRate = orgRes.data?.default_hourly_rate;
      const profileRate = profileRes.data?.hourly_rate;
      if (orgRate) setRate(String(orgRate));
      else if (profileRate) setRate(String(profileRate));
      const orgMarkup = orgRes.data?.labor_markup_percent;
      if (orgMarkup && isTC) setMarkup(String(orgMarkup));
    }
    loadDefaults();
    return () => { cancelled = true; };
  }, [user, orgId, isTC]);

  const hoursValue = parseFloat(hours) || 0;
  const rateValue = parseFloat(rate) || 0;
  const lumpSumValue = parseFloat(lumpSum) || 0;
  const qtyValue = parseFloat(qty) || 0;
  const unitPriceValue = parseFloat(unitPrice) || 0;
  const markupPct = parseFloat(markup) || 0;
  const internalCostValue = parseFloat(internalCost) || 0;

  const baseTotal = mode === 'lump_sum' ? lumpSumValue : mode === 'unit_price' ? qtyValue * unitPriceValue : hoursValue * rateValue;
  const markupAmount = isTC && markupPct > 0 ? baseTotal * (markupPct / 100) : 0;
  const computedTotal = baseTotal + markupAmount;

  const showMarginPreview = !isActualCost && computedTotal > 0 && internalCostValue > 0;
  const marginDollars = computedTotal - internalCostValue;
  const marginPercent = computedTotal > 0 ? (marginDollars / computedTotal) * 100 : 0;

  const projectedUsed = nteUsed + computedTotal;
  const ntePercent = nteCap && nteCap > 0 ? (projectedUsed / nteCap) * 100 : null;
  const willExceed = ntePercent !== null && ntePercent >= 95;

  const validationMessage =
    !entryDate ? 'Select a date.'
    : mode === 'lump_sum' ? (lumpSumValue <= 0 ? 'Enter an amount greater than zero.' : null)
    : mode === 'unit_price' ? (qtyValue <= 0 ? 'Enter quantity.' : unitPriceValue <= 0 ? 'Enter unit price.' : null)
    : hoursValue <= 0 ? 'Enter hours greater than zero.'
    : rateValue <= 0 ? 'Enter an hourly rate greater than zero.'
    : null;

  const canSave = !validationMessage;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const dateLabel = entryDate === todayStr
    ? `Today, ${format(new Date(), 'MMM d')}`
    : format(new Date(entryDate + 'T12:00:00'), 'EEE, MMM d');

  function handleQuickHour(h: number) { setHours(String(h)); setMode('hourly'); }

  function resetForm() {
    setHours(''); setLumpSum(''); setQty(''); setUnitPrice(''); setDescription('');
    setInternalCost(''); setInternalCostOpen(true); setCostType('labor_wages');
    setShowNTEWarn(false); setEntryDate(format(new Date(), 'yyyy-MM-dd'));
  }

  function getDbMode(): COPricingMode { return mode === 'lump_sum' ? 'lump_sum' : 'hourly'; }
  function getDbHours() { return mode === 'hourly' ? hoursValue : mode === 'unit_price' ? qtyValue : null; }
  function getDbRate() {
    const baseRate = mode === 'hourly' ? rateValue : mode === 'unit_price' ? unitPriceValue : null;
    if (baseRate && isTC && markupPct > 0) return baseRate + baseRate * (markupPct / 100);
    return baseRate;
  }

  async function attemptSave() {
    if (!user) { toast.error('Sign in required'); return; }
    if (!canSave) { toast.error(validationMessage ?? 'Complete required fields.'); return; }

    if (!isActualCost && nteCap && nteCap > 0) {
      if (nteUsed >= nteCap) { toast.error('NTE cap reached. GC must increase.'); return; }
      if (willExceed && !showNTEWarn) { setShowNTEWarn(true); return; }
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('co_labor_entries').insert({
        co_id: coId, co_line_item_id: lineItemId, org_id: orgId,
        entered_by_role: enteredByRole, entry_date: entryDate,
        pricing_mode: getDbMode(), hours: getDbHours(), hourly_rate: getDbRate(),
        lump_sum: mode === 'lump_sum' ? (lumpSumValue + (isTC && markupPct > 0 ? lumpSumValue * (markupPct / 100) : 0)) : null,
        description: description.trim() || null, is_actual_cost: isActualCost,
      });
      if (error) throw error;

      if (!isActualCost && internalCostValue > 0) {
        await supabase.from('co_labor_entries').insert({
          co_id: coId, co_line_item_id: lineItemId, org_id: orgId,
          entered_by_role: enteredByRole, entry_date: entryDate,
          pricing_mode: 'lump_sum', lump_sum: internalCostValue,
          description: description.trim() ? `Internal: ${description.trim()}` : `Internal cost (${costType.replace(/_/g, ' ')})`,
          is_actual_cost: true,
        });
      }

      // NTE threshold notifications
      if (nteCap && nteCap > 0 && !isActualCost) {
        const newUsed = nteUsed + computedTotal;
        const pct = (newUsed / nteCap) * 100;
        const prevPct = (nteUsed / nteCap) * 100;
        if ((pct >= 100 && prevPct < 100) || (pct >= 80 && prevPct < 80)) {
          try {
            const { sendCONotification, buildCONotification } = await import('@/lib/coNotifications');
            const { data: coData } = await supabase.from('change_orders').select('title, project_id, org_id, assigned_to_org_id').eq('id', coId).single();
            if (coData) {
              const notifType = pct >= 100 ? 'NTE_BLOCKED_100' : 'NTE_WARNING_80';
              const orgs = [coData.org_id, coData.assigned_to_org_id].filter(Boolean) as string[];
              const { title, body } = buildCONotification(notifType, coData.title);
              for (const oid of orgs) {
                const { data: members } = await supabase.from('user_org_roles').select('user_id').eq('organization_id', oid).limit(10);
                if (members) {
                  for (const m of members) { sendCONotification({ recipient_user_id: m.user_id, recipient_org_id: oid, co_id: coId, project_id: coData.project_id, type: notifType, title, body }); }
                }
              }
            }
          } catch { /* non-critical */ }
        }
      }

      toast.success('Entry saved');
      resetForm();
      onSaved();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save');
    } finally { setSaving(false); setShowNTEWarn(false); }
  }

  return (
    <div className="rounded-xl overflow-hidden border-2 shadow-sm" style={{ borderColor: 'hsl(var(--amber)/0.3)' }}>
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: 'hsl(var(--amber)/0.08)' }}>
        <div className="flex items-center gap-2">
          {isActualCost ? (
            <Lock className="h-4 w-4 text-muted-foreground" />
          ) : (
            <DollarSign className="h-4 w-4" style={{ color: 'hsl(var(--amber-d))' }} />
          )}
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isActualCost ? undefined : 'hsl(var(--amber-d))' }}>
            {isActualCost ? 'Log Internal Cost (Private)' : 'Add Pricing Entry'}
          </span>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground transition-colors">✕</button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* 3-tile Entry Type */}
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: 'hourly' as const, icon: Clock, label: 'Hours', sub: 'Rate × Hours' },
            { key: 'lump_sum' as const, icon: DollarSign, label: 'Flat Rate', sub: 'Fixed Amount' },
            { key: 'unit_price' as const, icon: Hash, label: 'Unit Price', sub: 'Qty × Unit' },
          ]).map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMode(opt.key)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl text-xs font-semibold border-2 transition-all min-h-[56px]',
                mode === opt.key
                  ? 'border-[hsl(var(--amber))] bg-[hsl(var(--amber-pale))]'
                  : 'border-border bg-background text-muted-foreground hover:border-[hsl(var(--amber)/0.4)]',
              )}
              style={mode === opt.key ? { color: 'hsl(var(--amber-d))' } : undefined}
            >
              <opt.icon className="h-4 w-4" />
              <span>{opt.label}</span>
              <span className={cn('text-[9px] font-normal', mode === opt.key ? 'opacity-70' : 'text-muted-foreground/70')}>{opt.sub}</span>
            </button>
          ))}
        </div>

        {/* Quick hours */}
        {!isActualCost && mode === 'hourly' && (
          <div className="flex gap-2">
            {QUICK_HOURS.map(h => (
              <button
                key={h} type="button" onClick={() => handleQuickHour(h)}
                className={cn(
                  'flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all min-h-[48px]',
                  hoursValue === h
                    ? 'border-[hsl(var(--amber))] bg-[hsl(var(--amber-pale))] shadow-sm'
                    : 'border-border bg-background text-muted-foreground hover:border-[hsl(var(--amber)/0.3)]',
                )}
                style={hoursValue === h ? { color: 'hsl(var(--amber-d))' } : undefined}
              >
                {h}h
              </button>
            ))}
          </div>
        )}

        {/* Date + Description */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1 block">Date</Label>
            <button
              type="button"
              onClick={() => { const input = document.getElementById(`labor-date-${lineItemId}`) as HTMLInputElement; input?.showPicker?.(); }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-medium min-h-[44px] hover:border-[hsl(var(--amber)/0.3)] transition-colors"
            >
              <span className="text-xs">{dateLabel}</span>
              <span className="text-muted-foreground">▾</span>
            </button>
            <input id={`labor-date-${lineItemId}`} type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="sr-only" />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1 block">Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What work was done…" className="h-[44px] text-sm" />
          </div>
        </div>

        {/* Mode-specific fields */}
        {mode === 'hourly' ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">Hours</Label>
              <Input type="number" step="0.25" min="0" value={hours} onChange={e => setHours(e.target.value)} placeholder="0" className="h-11 text-base font-semibold" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">Rate ($/hr)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">$</span>
                <Input type="number" step="0.01" min="0" value={rate} onChange={e => setRate(e.target.value)} className="h-11 text-base font-semibold pl-7" />
              </div>
            </div>
          </div>
        ) : mode === 'unit_price' ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">Quantity</Label>
              <Input type="number" step="1" min="0" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" className="h-11 text-base font-semibold" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">Unit Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">$</span>
                <Input type="number" step="0.01" min="0" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="0.00" className="h-11 text-base font-semibold pl-7" />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1 block">Billable Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">$</span>
              <Input type="number" step="0.01" min="0" value={lumpSum} onChange={e => setLumpSum(e.target.value)} placeholder="0.00" className="h-11 text-base font-semibold pl-7" />
            </div>
          </div>
        )}

        {/* TC markup */}
        {isTC && !isActualCost && (
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1 block">Markup %</Label>
            <Input type="number" step="0.5" min="0" value={markup} onChange={e => setMarkup(e.target.value)} className="h-11 text-base font-semibold w-32" placeholder="0" />
          </div>
        )}

        {/* Live total */}
        {computedTotal > 0 && (
          <div className="flex items-center justify-between rounded-xl px-4 py-3 border" style={{ background: 'hsl(var(--amber)/0.05)', borderColor: 'hsl(var(--amber)/0.15)' }}>
            <span className="text-xs font-medium text-muted-foreground">
              Entry total{markupAmount > 0 && ` (incl. ${markupPct}% markup)`}
            </span>
            <span className="text-lg font-bold" style={{ color: 'hsl(var(--amber-d))' }}>
              ${computedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Margin preview */}
        {showMarginPreview && (
          <div className={cn(
            'flex items-center justify-between rounded-xl px-4 py-2.5 border',
            marginDollars >= 0
              ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/30'
              : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/30',
          )}>
            <span className="text-xs font-medium text-muted-foreground">Margin on this entry</span>
            <span className={cn('text-sm font-bold', marginDollars >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400')}>
              ${marginDollars.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({marginPercent.toFixed(1)}%)
            </span>
          </div>
        )}

        {/* Internal cost section */}
        {!isActualCost && (isTC || isFC) && (
          <Collapsible open={internalCostOpen} onOpenChange={setInternalCostOpen}>
            <CollapsibleTrigger asChild>
              <button type="button" className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-dashed border-border hover:border-[hsl(var(--amber)/0.3)] transition-colors text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  <span className="font-medium">Log internal cost</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold dark:bg-emerald-950/30 dark:text-emerald-400">Private · optional</span>
                </div>
                <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', internalCostOpen && 'rotate-180')} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pt-3 space-y-3">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Internal costs are private and never shared with the General Contractor. Use this to track your actual labor and material costs.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground mb-1 block">Your Cost</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">$</span>
                      <Input type="number" step="0.01" min="0" value={internalCost} onChange={e => setInternalCost(e.target.value)} placeholder="0.00" className="h-11 text-base font-semibold pl-7" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground mb-1 block">Cost Type</Label>
                    <select
                      value={costType}
                      onChange={e => setCostType(e.target.value)}
                      className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium"
                    >
                      <option value="labor_wages">Labor wages</option>
                      <option value="subcontractor">Subcontractor</option>
                      <option value="materials">Materials</option>
                      <option value="equipment">Equipment</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* NTE warning */}
        {showNTEWarn && ntePercent !== null && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
            <p className="text-sm font-semibold text-destructive">NTE cap warning</p>
            <p className="text-xs text-destructive/80">
              This entry will bring you to <span className="font-semibold">{ntePercent.toFixed(1)}%</span> of the ${nteCap?.toLocaleString('en-US', { minimumFractionDigits: 2 })} cap.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-10" onClick={() => setShowNTEWarn(false)}>Cancel</Button>
              <Button variant="destructive" className="flex-1 h-10" onClick={attemptSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log anyway'}
              </Button>
            </div>
          </div>
        )}

        {/* Footer buttons */}
        {!showNTEWarn && (
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button variant="ghost" onClick={onCancel} className="flex-1 h-11 text-sm">Cancel</Button>
            )}
            <Button
              onClick={attemptSave}
              disabled={!canSave || saving}
              className={cn('h-11 text-sm font-bold gap-2 rounded-xl shadow-md', onCancel ? 'flex-1' : 'w-full')}
              style={{ background: 'hsl(var(--amber))', color: 'hsl(var(--navy))' }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {computedTotal > 0 ? `Save Entry — $${computedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'Save Entry'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

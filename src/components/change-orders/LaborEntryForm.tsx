import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Check, Clock, DollarSign, Lock, ChevronDown } from 'lucide-react';
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
type EntryMode = 'hourly' | 'lump_sum';

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

  // Field-crew logged hours on this line item — importable as internal cost (TC only).
  const [fcHours, setFcHours] = useState(0);
  const [fcCost, setFcCost] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function loadFC() {
      if (!isTC || isActualCost || isEditing || !lineItemId) return;
      const { data } = await supabase
        .from('co_labor_entries')
        .select('hours, hourly_rate, lump_sum, pricing_mode')
        .eq('co_line_item_id', lineItemId)
        .eq('entered_by_role', 'FC');
      if (cancelled || !data) return;
      let h = 0, c = 0;
      for (const e of data) {
        h += Number(e.hours ?? 0);
        c += e.pricing_mode === 'lump_sum'
          ? Number(e.lump_sum ?? 0)
          : Number(e.hours ?? 0) * Number(e.hourly_rate ?? 0);
      }
      setFcHours(Math.round(h * 100) / 100);
      setFcCost(Math.round(c * 100) / 100);
    }
    loadFC();
    return () => { cancelled = true; };
  }, [lineItemId, isTC, isActualCost, isEditing]);

  const fcAvailable = fcCost > 0 || fcHours > 0;
  function importFCHours() {
    if (fcCost > 0) setInternalCost(String(fcCost));
    if (fcHours > 0 && !hours) { setHours(String(fcHours)); setMode('hourly'); }
    setCostType('labor_wages');
    toast.success(`Imported ${fcHours}h of field crew time`);
  }



  const hoursValue = parseFloat(hours) || 0;
  const rateValue = parseFloat(rate) || 0;
  const lumpSumValue = parseFloat(lumpSum) || 0;
  const markupPct = parseFloat(markup) || 0;
  const internalCostValue = parseFloat(internalCost) || 0;

  const baseTotal = mode === 'lump_sum' ? lumpSumValue : hoursValue * rateValue;
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
    setHours(''); setLumpSum(''); setDescription('');
    setInternalCost(''); setInternalCostOpen(true); setCostType('labor_wages');
    setShowNTEWarn(false); setEntryDate(format(new Date(), 'yyyy-MM-dd'));
  }

  function getDbMode(): COPricingMode { return mode === 'lump_sum' ? 'lump_sum' : 'hourly'; }
  function getDbHours() { return mode === 'hourly' ? hoursValue : null; }

  // Base = TC internal cost, billable = post-markup amount GC sees.
  const effectiveMarkup = isTC && markupPct > 0 ? markupPct : 0;
  function baseHourly() { return mode === 'hourly' ? rateValue : null; }
  function billableHourly() {
    const b = baseHourly();
    return b == null ? null : b + b * (effectiveMarkup / 100);
  }
  function baseLump() { return mode === 'lump_sum' ? lumpSumValue : null; }
  function billableLump() {
    const b = baseLump();
    return b == null ? null : b + b * (effectiveMarkup / 100);
  }

  async function attemptSave() {
    if (!user) { toast.error('Sign in required'); return; }
    if (!canSave) { toast.error(validationMessage ?? 'Complete required fields.'); return; }

    if (!isActualCost && !isEditing && nteCap && nteCap > 0) {
      if (nteUsed >= nteCap) { toast.error('NTE cap reached. GC must increase.'); return; }
      if (willExceed && !showNTEWarn) { setShowNTEWarn(true); return; }
    }

    setSaving(true);
    try {
      if (isEditing && editingEntry) {
        const { error } = await supabase
          .from('co_labor_entries')
          .update({
            entry_date: entryDate,
            pricing_mode: getDbMode(),
            hours: getDbHours(),
            base_hourly_rate: baseHourly(),
            base_lump_sum: baseLump(),
            markup_percent: effectiveMarkup,
            hourly_rate: billableHourly(),
            lump_sum: billableLump(),
            description: description.trim() || null,
          })
          .eq('id', editingEntry.id);
        if (error) throw error;
        toast.success('Entry updated');
        onSaved();
        return;
      }

      const { error } = await supabase.from('co_labor_entries').insert({
        co_id: coId, co_line_item_id: lineItemId, org_id: orgId,
        entered_by_role: enteredByRole, entry_date: entryDate,
        pricing_mode: getDbMode(),
        hours: getDbHours(),
        base_hourly_rate: baseHourly(),
        base_lump_sum: baseLump(),
        markup_percent: effectiveMarkup,
        hourly_rate: billableHourly(),
        lump_sum: billableLump(),
        description: description.trim() || null, is_actual_cost: isActualCost,
      });
      if (error) throw error;

      if (!isActualCost && internalCostValue > 0) {
        await supabase.from('co_labor_entries').insert({
          co_id: coId, co_line_item_id: lineItemId, org_id: orgId,
          entered_by_role: enteredByRole, entry_date: entryDate,
          pricing_mode: 'lump_sum',
          base_lump_sum: internalCostValue,
          markup_percent: 0,
          lump_sum: internalCostValue,
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
                  // Exclude the actor from receiving their own NTE notification
                  for (const m of members) { if (m.user_id !== user.id) { sendCONotification({ recipient_user_id: m.user_id, recipient_org_id: oid, co_id: coId, project_id: coData.project_id, type: notifType, title, body }); } }
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

  const fieldInput = 'w-full h-10 rounded-lg px-3 text-sm bg-[hsl(var(--navy-xd))] border border-[hsl(var(--navy-line))] text-[hsl(var(--navy-fg))] placeholder:text-[hsl(var(--navy-fg-muted)/0.6)] focus:outline-none focus:border-[hsl(var(--amber)/0.6)] focus:ring-1 focus:ring-[hsl(var(--amber)/0.4)] transition-colors';
  const microLabel = 'text-[10px] uppercase tracking-wider font-bold text-[hsl(var(--navy-fg-muted))]';
  const mono = { fontFamily: "'IBM Plex Mono', monospace" };

  return (
    <div className="rounded-2xl overflow-hidden border border-[hsl(var(--navy-line))] shadow-xl bg-[hsl(var(--navy-d))]">
      {/* Header / mode switch */}
      <div className="px-4 py-3 border-b border-[hsl(var(--navy-line))] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {isActualCost ? <Lock className="h-3.5 w-3.5 text-[hsl(var(--navy-fg-muted))]" /> : <DollarSign className="h-3.5 w-3.5" style={{ color: 'hsl(var(--amber))' }} />}
          <h3 className="text-xs uppercase tracking-widest font-bold text-[hsl(var(--navy-fg-muted))] truncate font-heading">
            {isEditing
              ? (isActualCost ? 'Edit internal cost' : 'Edit pricing entry')
              : (isActualCost ? 'Log internal cost' : 'Add pricing entry')}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex p-1 rounded-lg bg-[hsl(var(--navy-xd))] border border-[hsl(var(--navy-line))]">
            {([
              { key: 'hourly' as const, label: 'Hours', icon: Clock },
              { key: 'lump_sum' as const, label: 'Flat rate', icon: DollarSign },
            ]).map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setMode(opt.key)}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded transition-all flex items-center gap-1.5',
                  mode === opt.key
                    ? 'shadow-sm'
                    : 'text-[hsl(var(--navy-fg-muted))] hover:text-[hsl(var(--navy-fg))]',
                )}
                style={mode === opt.key ? { background: 'hsl(var(--amber))', color: 'hsl(var(--navy))' } : undefined}
              >
                <opt.icon className="h-3 w-3" />
                {opt.label}
              </button>
            ))}
          </div>
          {onCancel && (
            <button type="button" onClick={onCancel} aria-label="Close pricing entry" className="text-[hsl(var(--navy-fg-muted))] hover:text-[hsl(var(--navy-fg))] text-sm px-1">✕</button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Context row: description + date */}
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 sm:col-span-8 space-y-1.5">
            <label className={microLabel}>Description</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What work was done…"
              className={fieldInput}
            />
          </div>
          <div className="col-span-12 sm:col-span-4 space-y-1.5">
            <label className={microLabel}>Date</label>
            <button
              type="button"
              onClick={() => { const input = document.getElementById(`labor-date-${lineItemId}`) as HTMLInputElement; input?.showPicker?.(); }}
              className={cn(fieldInput, 'flex items-center justify-between text-left')}
            >
              <span>{dateLabel}</span>
              <span className="text-[hsl(var(--navy-fg-muted))]">▾</span>
            </button>
            <input id={`labor-date-${lineItemId}`} type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="sr-only" />
          </div>
        </div>

        {/* Billable row */}
        {mode === 'hourly' ? (
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className={cn('space-y-1.5', isTC && !isActualCost ? 'col-span-6 sm:col-span-4' : 'col-span-6')}>
              <div className="flex items-center justify-between gap-2">
                <label className={microLabel} style={{ color: 'hsl(var(--amber))' }}>Hours</label>
                {!isActualCost && (
                  <div className="flex gap-1">
                    {QUICK_HOURS.map(h => (
                      <button
                        key={h} type="button" onClick={() => handleQuickHour(h)}
                        className={cn(
                          'text-[9px] px-1.5 py-0.5 rounded font-bold transition-colors',
                          hoursValue === h
                            ? 'text-[hsl(var(--navy))]'
                            : 'bg-[hsl(var(--navy-line))] text-[hsl(var(--navy-fg-muted))] hover:text-[hsl(var(--navy-fg))]',
                        )}
                        style={hoursValue === h ? { background: 'hsl(var(--amber))' } : undefined}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] uppercase text-[hsl(var(--navy-fg-muted)/0.7)]">Qty</span>
                <input
                  type="number" step="0.25" min="0" value={hours} onChange={e => setHours(e.target.value)} placeholder="0"
                  className={cn(fieldInput, 'text-right text-base font-medium pl-10')}
                  style={{ ...mono, color: 'hsl(var(--amber))' }}
                />
              </div>
            </div>
            <div className={cn('space-y-1.5', isTC && !isActualCost ? 'col-span-6 sm:col-span-4' : 'col-span-6')}>
              <label className={microLabel}>Rate ($/hr)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--navy-fg-muted)/0.7)]">$</span>
                <input
                  type="number" step="0.01" min="0" value={rate} onChange={e => setRate(e.target.value)}
                  className={cn(fieldInput, 'text-right text-base font-medium pl-7')}
                  style={mono}
                />
              </div>
            </div>
            {isTC && !isActualCost && (
              <div className="col-span-12 sm:col-span-4 space-y-1.5">
                <label className={microLabel}>Markup (%)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--navy-fg-muted)/0.7)]">%</span>
                  <input
                    type="number" step="0.5" min="0" value={markup} onChange={e => setMarkup(e.target.value)} placeholder="0"
                    className={cn(fieldInput, 'text-right text-base font-medium pl-7')}
                    style={mono}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className={cn('space-y-1.5', isTC && !isActualCost ? 'col-span-12 sm:col-span-8' : 'col-span-12')}>
              <label className={microLabel} style={{ color: 'hsl(var(--amber))' }}>Billable amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--navy-fg-muted)/0.7)]">$</span>
                <input
                  type="number" step="0.01" min="0" value={lumpSum} onChange={e => setLumpSum(e.target.value)} placeholder="0.00"
                  className={cn(fieldInput, 'text-right text-base font-medium pl-7')}
                  style={{ ...mono, color: 'hsl(var(--amber))' }}
                />
              </div>
            </div>
            {isTC && !isActualCost && (
              <div className="col-span-12 sm:col-span-4 space-y-1.5">
                <label className={microLabel}>Markup (%)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--navy-fg-muted)/0.7)]">%</span>
                  <input
                    type="number" step="0.5" min="0" value={markup} onChange={e => setMarkup(e.target.value)} placeholder="0"
                    className={cn(fieldInput, 'text-right text-base font-medium pl-7')}
                    style={mono}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Private internal cost band */}
        {!isActualCost && !isEditing && (isTC || isFC) && (
          <div className="rounded-xl border border-dashed border-[hsl(var(--navy-line))] bg-[hsl(var(--navy-xd)/0.6)] p-3.5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="h-3 w-3 text-[hsl(var(--navy-fg-muted))]" />
                <span className="text-[11px] font-bold uppercase tracking-tight text-[hsl(var(--navy-fg-muted))] truncate">
                  Private internal cost
                </span>
              </div>
              {fcAvailable && (
                <button
                  type="button"
                  onClick={importFCHours}
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors shrink-0"
                  style={{ color: 'hsl(var(--amber))', background: 'hsl(var(--amber)/0.12)' }}
                >
                  + Import field hours ({fcHours}h · ${fcCost.toLocaleString('en-US', { maximumFractionDigits: 0 })})
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] uppercase text-[hsl(var(--navy-fg-muted)/0.7)]">Your cost</span>
                <input
                  type="number" step="0.01" min="0" value={internalCost} onChange={e => setInternalCost(e.target.value)} placeholder="0.00"
                  className={cn(fieldInput, 'text-right pl-20')}
                  style={mono}
                />
              </div>
              <select
                value={costType}
                onChange={e => setCostType(e.target.value)}
                className={fieldInput}
              >
                <option value="labor_wages">Labor wages</option>
                <option value="subcontractor">Subcontractor</option>
                <option value="materials">Materials</option>
                <option value="equipment">Equipment</option>
                <option value="other">Other</option>
              </select>
            </div>
            <p className="text-[10px] text-[hsl(var(--navy-fg-muted)/0.8)] mt-2">Never shared upstream — used for your margin tracking only.</p>
          </div>
        )}

        {/* NTE warning */}
        {showNTEWarn && ntePercent !== null && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 space-y-3">
            <p className="text-sm font-semibold text-destructive">NTE cap warning</p>
            <p className="text-xs text-destructive/90">
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
      </div>

      {/* Summary + actions */}
      {!showNTEWarn && (
        <div className="px-4 py-3 border-t border-[hsl(var(--navy-line))] bg-[hsl(var(--navy-xd)/0.8)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-5">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-widest font-bold text-[hsl(var(--navy-fg-muted))]">
                {isActualCost ? 'Cost total' : 'Billable total'}
              </span>
              <span className="text-lg font-semibold text-[hsl(var(--navy-fg))]" style={mono}>
                ${computedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {showMarginPreview && (
              <>
                <div className="h-8 w-px bg-[hsl(var(--navy-line))]" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-widest font-bold text-[hsl(var(--navy-fg-muted))]">Est. margin</span>
                  <span className={cn('text-lg font-semibold', marginDollars >= 0 ? 'text-emerald-400' : 'text-red-400')} style={mono}>
                    {marginPercent.toFixed(1)}%
                  </span>
                </div>
              </>
            )}
            {markupAmount > 0 && (
              <span className="text-[10px] text-[hsl(var(--navy-fg-muted))]">incl. {markupPct}% markup</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onCancel && (
              <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-bold text-[hsl(var(--navy-fg-muted))] hover:text-[hsl(var(--navy-fg))] transition-colors">Cancel</button>
            )}
            <Button
              onClick={attemptSave}
              disabled={!canSave || saving}
              className="h-10 px-6 text-sm font-bold gap-2 rounded-lg shadow-lg"
              style={{ background: 'hsl(var(--amber))', color: 'hsl(var(--navy))' }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isEditing ? 'Update entry' : 'Save entry'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


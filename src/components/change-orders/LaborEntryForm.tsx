import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Check, Clock, DollarSign, Lock, CalendarDays } from 'lucide-react';
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

  // Crew workload math: crew_size × days × hours_per_day = total hours.
  const hasCrewFields = !!(editingEntry?.crew_size ?? editingEntry?.days ?? editingEntry?.hours_per_day);
  const [useCrewMath, setUseCrewMath] = useState(hasCrewFields);
  const [crewSize, setCrewSize] = useState(editingEntry?.crew_size != null ? String(editingEntry.crew_size) : '6');
  const [days, setDays] = useState(editingEntry?.days != null ? String(editingEntry.days) : '10');
  const [hoursPerDay, setHoursPerDay] = useState(editingEntry?.hours_per_day != null ? String(editingEntry.hours_per_day) : '8');

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
  const [fcEntryIds, setFcEntryIds] = useState<string[]>([]);
  const [importedFC, setImportedFC] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function loadFC() {
      if (!isTC || isActualCost || isEditing || !lineItemId) return;
      const { data } = await supabase
        .from('co_labor_entries')
        .select('id, hours, hourly_rate, lump_sum, pricing_mode')
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
      setFcEntryIds(data.map((e: any) => e.id));
    }
    loadFC();
    return () => { cancelled = true; };
  }, [lineItemId, isTC, isActualCost, isEditing]);

  const fcAvailable = fcCost > 0 || fcHours > 0;
  function importFCHours() {
    if (fcCost > 0) setInternalCost(String(fcCost));
    if (fcHours > 0 && !hours) { setHours(String(fcHours)); setMode('hourly'); }
    setCostType('labor_wages');
    setImportedFC(true);
    toast.success(`Imported ${fcHours}h of field crew time`);
  }



  const crewSizeValue = parseFloat(crewSize) || 0;
  const daysValue = parseFloat(days) || 0;
  const hoursPerDayValue = parseFloat(hoursPerDay) || 0;
  const crewMathHours = crewSizeValue > 0 && daysValue > 0 && hoursPerDayValue > 0
    ? crewSizeValue * daysValue * hoursPerDayValue
    : 0;
  const rawHoursValue = parseFloat(hours) || 0;
  const hoursValue = useCrewMath ? crewMathHours : rawHoursValue;
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
    : useCrewMath
      ? (crewSizeValue <= 0 ? 'Enter crew size.'
        : daysValue <= 0 ? 'Enter days.'
        : hoursPerDayValue <= 0 ? 'Enter hours per day.'
        : rateValue <= 0 ? 'Enter an hourly rate greater than zero.'
        : null)
    : hoursValue <= 0 ? 'Enter hours greater than zero.'
    : rateValue <= 0 ? 'Enter an hourly rate greater than zero.'
    : null;

  const canSave = !validationMessage;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const dateLabel = entryDate === todayStr
    ? `Today, ${format(new Date(), 'MMM d')}`
    : format(new Date(entryDate + 'T12:00:00'), 'EEE, MMM d');

  function handleQuickHour(h: number) {
    setHours(String(h));
    setMode('hourly');
    setUseCrewMath(false);
  }

  function resetForm() {
    setHours(''); setLumpSum(''); setDescription('');
    setInternalCost(''); setInternalCostOpen(true); setCostType('labor_wages');
    setImportedFC(false);
    setShowNTEWarn(false); setEntryDate(format(new Date(), 'yyyy-MM-dd'));
    setCrewSize('6'); setDays('10'); setHoursPerDay('8'); setUseCrewMath(true);
  }

  function getDbMode(): COPricingMode { return mode === 'lump_sum' ? 'lump_sum' : 'hourly'; }
  function getDbHours() { return mode === 'hourly' ? hoursValue : null; }
  function getCrewFields() {
    if (mode !== 'hourly' || !useCrewMath) return { crew_size: null, days: null, hours_per_day: null };
    return {
      crew_size: crewSizeValue > 0 ? crewSizeValue : null,
      days: daysValue > 0 ? daysValue : null,
      hours_per_day: hoursPerDayValue > 0 ? hoursPerDayValue : null,
    };
  }

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
      const crewFields = getCrewFields();

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
            crew_size: crewFields.crew_size,
            days: crewFields.days,
            hours_per_day: crewFields.hours_per_day,
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
        crew_size: crewFields.crew_size,
        days: crewFields.days,
        hours_per_day: crewFields.hours_per_day,
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
          // Provenance: ties this internal cost row back to the field crew time it came from.
          source_fc_entry_ids: importedFC && fcEntryIds.length > 0 ? fcEntryIds : null,
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

  const fieldInput = 'w-full h-10 rounded-lg px-3 text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-[hsl(var(--amber))] focus:ring-2 focus:ring-[hsl(var(--amber)/0.25)] transition-colors';
  const microLabel = 'text-[10px] uppercase tracking-wider font-bold text-muted-foreground';
  const mono = { fontFamily: "'IBM Plex Mono', monospace" };
  const COST_TYPES: { key: string; label: string }[] = [
    { key: 'labor_wages', label: 'Wages' },
    { key: 'subcontractor', label: 'Sub' },
    { key: 'materials', label: 'Materials' },
    { key: 'equipment', label: 'Equipment' },
    { key: 'other', label: 'Other' },
  ];

  const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-md">
      {/* Header / mode switch */}
      <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {isActualCost ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : <DollarSign className="h-3.5 w-3.5" style={{ color: 'hsl(var(--amber-d))' }} />}
          <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground truncate font-heading">
            {isEditing
              ? (isActualCost ? 'Edit internal cost' : 'Edit pricing entry')
              : (isActualCost ? 'Log internal cost' : 'Add pricing entry')}
          </h3>
        </div>
        <div className="flex p-1 rounded-lg bg-background border border-border">
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
                mode === opt.key ? 'shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
              style={mode === opt.key ? { background: 'hsl(var(--amber))', color: 'hsl(var(--navy))' } : undefined}
            >
              <opt.icon className="h-3 w-3" />
              {opt.label}
            </button>
          ))}
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
            <div className="relative">
              <input
                id={`labor-date-${lineItemId}`}
                type="date"
                value={entryDate}
                onChange={e => setEntryDate(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Entry date"
              />
              <div className={cn(fieldInput, 'flex items-center justify-between gap-2 pointer-events-none')}>
                <span className="truncate">{dateLabel}</span>
                <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </div>
          </div>
        </div>

        {/* Billable precision grid — stable 4/4/4 geometry */}
        <div className="grid grid-cols-12 gap-3">
          {mode === 'hourly' ? (
            <>
              {useCrewMath ? (
                <>
                  <div className="col-span-4 space-y-1.5">
                    <label className={microLabel} style={{ color: 'hsl(var(--amber-d))' }}>Crew</label>
                    <div className="relative">
                      <input
                        type="number" step="1" min="0" value={crewSize} onChange={e => setCrewSize(e.target.value)} placeholder="0"
                        className={cn(fieldInput, 'text-center text-base font-semibold pr-10')}
                        style={{ ...mono, color: 'hsl(var(--amber-d))' }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase text-muted-foreground pointer-events-none">men</span>
                    </div>
                  </div>
                  <div className="col-span-4 space-y-1.5">
                    <label className={microLabel} style={{ color: 'hsl(var(--amber-d))' }}>Days</label>
                    <div className="relative">
                      <input
                        type="number" step="0.5" min="0" value={days} onChange={e => setDays(e.target.value)} placeholder="0"
                        className={cn(fieldInput, 'text-center text-base font-semibold pr-10')}
                        style={{ ...mono, color: 'hsl(var(--amber-d))' }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase text-muted-foreground pointer-events-none">days</span>
                    </div>
                  </div>
                  <div className="col-span-4 space-y-1.5">
                    <label className={microLabel} style={{ color: 'hsl(var(--amber-d))' }}>Hrs/Day</label>
                    <div className="relative">
                      <input
                        type="number" step="0.25" min="0" value={hoursPerDay} onChange={e => setHoursPerDay(e.target.value)} placeholder="0"
                        className={cn(fieldInput, 'text-center text-base font-semibold pr-10')}
                        style={{ ...mono, color: 'hsl(var(--amber-d))' }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase text-muted-foreground pointer-events-none">hr/d</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="col-span-6 sm:col-span-4 space-y-1.5">
                  <label className={microLabel} style={{ color: 'hsl(var(--amber-d))' }}>Hours</label>
                  <div className="relative">
                    <input
                      type="number" step="0.25" min="0" value={hours} onChange={e => setHours(e.target.value)} placeholder="0"
                      className={cn(fieldInput, 'text-right text-base font-semibold pr-12')}
                      style={{ ...mono, color: 'hsl(var(--amber-d))' }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold uppercase text-muted-foreground pointer-events-none">hrs</span>
                  </div>
                </div>
              )}
              <div className={useCrewMath ? 'col-span-12 sm:col-span-4 space-y-1.5' : 'col-span-6 sm:col-span-4 space-y-1.5'}>
                <label className={microLabel}>Rate</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  <input
                    type="number" step="0.01" min="0" value={rate} onChange={e => setRate(e.target.value)}
                    className={cn(fieldInput, 'text-right text-base font-semibold pl-7 pr-10')}
                    style={mono}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold uppercase text-muted-foreground pointer-events-none">/hr</span>
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-12 sm:col-span-8 space-y-1.5">
              <label className={microLabel} style={{ color: 'hsl(var(--amber-d))' }}>Billable amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <input
                  type="number" step="0.01" min="0" value={lumpSum} onChange={e => setLumpSum(e.target.value)} placeholder="0.00"
                  className={cn(fieldInput, 'text-right text-base font-semibold pl-7')}
                  style={{ ...mono, color: 'hsl(var(--amber-d))' }}
                />
              </div>
            </div>
          )}

          {/* Third precision cell always occupied: markup (TC) or line total (others) */}
          {isTC && !isActualCost ? (
            <div className="col-span-12 sm:col-span-4 space-y-1.5">
              <label className={microLabel}>Markup</label>
              <div className="relative">
                <input
                  type="number" step="0.5" min="0" value={markup} onChange={e => setMarkup(e.target.value)} placeholder="0"
                  className={cn(fieldInput, 'text-right text-base font-semibold pr-8')}
                  style={mono}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">%</span>
              </div>
            </div>
          ) : (
            <div className="col-span-12 sm:col-span-4 space-y-1.5">
              <label className={microLabel}>Line total</label>
              <div className={cn(fieldInput, 'flex items-center justify-end bg-muted/50 text-foreground font-semibold text-base')} style={mono}>
                {money(computedTotal)}
              </div>
            </div>
          )}
        </div>

        {/* Quick-hour chip rail */}
        {mode === 'hourly' && !isActualCost && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground shrink-0">Quick</span>
            <div className="flex gap-2 flex-1">
              {QUICK_HOURS.map(h => (
                <button
                  key={h} type="button" onClick={() => handleQuickHour(h)}
                  className={cn(
                    'flex-1 h-8 rounded-lg text-xs font-bold border transition-colors',
                    hoursValue === h
                      ? 'border-transparent'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-[hsl(var(--amber)/0.5)]',
                  )}
                  style={hoursValue === h ? { background: 'hsl(var(--amber))', color: 'hsl(var(--navy))' } : undefined}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Live math expression */}
        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5" style={mono}>
          {mode === 'hourly' ? (
            <>
              <span>{hoursValue || 0} hrs</span>
              <span className="text-muted-foreground/60">×</span>
              <span>{money(rateValue)}</span>
            </>
          ) : (
            <span>{money(lumpSumValue)}</span>
          )}
          {markupAmount > 0 && (
            <>
              <span className="text-muted-foreground/60">+</span>
              <span>{markupPct}% markup ({money(markupAmount)})</span>
            </>
          )}
          <span className="text-muted-foreground/60">=</span>
          <span className="font-bold text-foreground">{money(computedTotal)}</span>
        </div>

        {/* Private internal cost band */}
        {!isActualCost && !isEditing && (isTC || isFC) && (
          <div className="rounded-xl border border-dashed border-border bg-muted/40 p-3.5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground truncate">
                  Private internal cost
                </span>
              </div>
              {fcAvailable && (
                <button
                  type="button"
                  onClick={importFCHours}
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors shrink-0"
                  style={{ color: 'hsl(var(--amber-d))', background: 'hsl(var(--amber)/0.14)' }}
                >
                  + Import field hours ({fcHours}h · ${fcCost.toLocaleString('en-US', { maximumFractionDigits: 0 })})
                </button>
              )}
            </div>
            <div className="space-y-2.5">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-muted-foreground">Your cost</span>
                <input
                  type="number" step="0.01" min="0" value={internalCost} onChange={e => setInternalCost(e.target.value)} placeholder="0.00"
                  className={cn(fieldInput, 'text-right pl-24 font-semibold')}
                  style={mono}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COST_TYPES.map(t => (
                  <button
                    key={t.key} type="button" onClick={() => setCostType(t.key)}
                    className={cn(
                      'px-2.5 h-7 rounded-lg text-[11px] font-bold border transition-colors',
                      costType === t.key
                        ? 'border-transparent'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground',
                    )}
                    style={costType === t.key ? { background: 'hsl(var(--amber))', color: 'hsl(var(--navy))' } : undefined}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2.5">Never shared upstream — used for your margin tracking only.</p>
          </div>
        )}

        {/* NTE warning */}
        {showNTEWarn && ntePercent !== null && (
          <div className="rounded-xl border border-dashed border-destructive/50 bg-destructive/5 p-3.5 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-tight text-destructive">NTE cap warning</p>
            <p className="text-xs text-destructive/90">
              This entry will bring you to <span className="font-bold" style={mono}>{ntePercent.toFixed(1)}%</span> of the {money(nteCap ?? 0)} cap.
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
        <div className="px-4 py-3 border-t border-border bg-muted/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-5">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">
                {isActualCost ? 'Cost total' : 'Billable total'}
              </span>
              <span className="text-lg font-bold text-foreground" style={mono}>{money(computedTotal)}</span>
            </div>
            {showMarginPreview && (
              <>
                <div className="h-8 w-px bg-border" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">Est. margin</span>
                  <span className={cn('text-lg font-bold', marginDollars >= 0 ? 'text-emerald-600' : 'text-destructive')} style={mono}>
                    {marginPercent.toFixed(1)}%
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onCancel && (
              <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            )}
            <Button
              onClick={attemptSave}
              disabled={!canSave || saving}
              className="h-10 px-6 text-sm font-bold gap-2 rounded-lg shadow-sm"
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

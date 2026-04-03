import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Check, Clock, DollarSign, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
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
  isTC?: boolean;
  isFC?: boolean;
  isActualCost?: boolean;
  onSaved: () => void;
  onCancel?: () => void;
  nteCap?: number | null;
  nteUsed?: number;
}

const QUICK_HOURS = [2, 4, 8, 10];

export function LaborEntryForm({
  coId, lineItemId, orgId, enteredByRole, pricingType,
  isTC = false, isFC = false, isActualCost = false,
  onSaved, onCancel, nteCap, nteUsed = 0,
}: LaborEntryFormProps) {
  const { user } = useAuth();

  const [mode, setMode] = useState<COPricingMode>(
    pricingType === 'fixed' ? 'lump_sum' : 'hourly'
  );
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [hours, setHours] = useState('');
  const [rate, setRate] = useState('');
  const [markup, setMarkup] = useState('');
  const [lumpSum, setLumpSum] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [showNTEWarn, setShowNTEWarn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadDefaults() {
      if (!user || !orgId) return;
      // Load from org_settings first (authoritative), fallback to profile
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
  const markupPct = parseFloat(markup) || 0;

  const baseTotal = mode === 'lump_sum' ? lumpSumValue : hoursValue * rateValue;
  const markupAmount = isTC && markupPct > 0 ? baseTotal * (markupPct / 100) : 0;
  const computedTotal = baseTotal + markupAmount;

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

  function handleQuickHour(h: number) {
    setHours(String(h));
    setMode('hourly');
  }

  function resetForm() {
    setHours('');
    setLumpSum('');
    setDescription('');
    setShowNTEWarn(false);
    setEntryDate(format(new Date(), 'yyyy-MM-dd'));
  }

  async function attemptSave() {
    if (!user) { toast.error('Sign in required'); return; }
    if (!canSave) { toast.error(validationMessage ?? 'Complete required fields.'); return; }

    if (!isActualCost && nteCap && nteCap > 0) {
      if (nteUsed >= nteCap) {
        toast.error('NTE cap reached. GC must increase.');
        return;
      }
      if (willExceed && !showNTEWarn) {
        setShowNTEWarn(true);
        return;
      }
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
        hours: mode === 'hourly' ? hoursValue : null,
        hourly_rate: mode === 'hourly' ? (rateValue + (isTC && markupPct > 0 ? rateValue * (markupPct / 100) : 0)) : null,
        lump_sum: mode === 'lump_sum' ? (lumpSumValue + (isTC && markupPct > 0 ? lumpSumValue * (markupPct / 100) : 0)) : null,
        description: description.trim() || null,
        is_actual_cost: isActualCost,
      });
      if (error) throw error;

      // NTE threshold notifications
      if (nteCap && nteCap > 0 && !isActualCost) {
        const newUsed = nteUsed + computedTotal;
        const pct = (newUsed / nteCap) * 100;
        const prevPct = (nteUsed / nteCap) * 100;

        if ((pct >= 100 && prevPct < 100) || (pct >= 80 && prevPct < 80)) {
          try {
            const { sendCONotification, buildCONotification } = await import('@/lib/coNotifications');
            const { data: coData } = await supabase
              .from('change_orders')
              .select('title, project_id, org_id, assigned_to_org_id')
              .eq('id', coId)
              .single();
            if (coData) {
              const notifType = pct >= 100 ? 'NTE_BLOCKED_100' : 'NTE_WARNING_80';
              const orgs = [coData.org_id, coData.assigned_to_org_id].filter(Boolean) as string[];
              const { title, body } = buildCONotification(notifType, coData.title);
              for (const oid of orgs) {
                const { data: members } = await supabase.from('user_org_roles').select('user_id').eq('organization_id', oid).limit(10);
                if (members) {
                  for (const m of members) {
                    sendCONotification({ recipient_user_id: m.user_id, recipient_org_id: oid, co_id: coId, project_id: coData.project_id, type: notifType, title, body });
                  }
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
    } finally {
      setSaving(false);
      setShowNTEWarn(false);
    }
  }

  const roleColor = isFC ? 'hsl(var(--amber))' : isTC ? 'hsl(142 71% 45%)' : 'hsl(var(--primary))';

  return (
    <div
      className="rounded-xl overflow-hidden border-2 border-primary/20 bg-card"
      style={{ borderLeftWidth: 4, borderLeftColor: roleColor }}
    >
      {/* Header */}
      <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isActualCost ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <DollarSign className="h-4 w-4" style={{ color: roleColor }} />
          )}
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isActualCost ? undefined : roleColor }}>
            {isActualCost ? 'Log Actual Cost (Private)' : 'Enter Pricing'}
          </span>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Mode toggle — larger pills */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('hourly')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all min-h-[48px]',
              mode === 'hourly'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40',
            )}
          >
            <Clock className="h-4 w-4" /> Hourly
          </button>
          <button
            type="button"
            onClick={() => setMode('lump_sum')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all min-h-[48px]',
              mode === 'lump_sum'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40',
            )}
          >
            <DollarSign className="h-4 w-4" /> Lump Sum
          </button>
        </div>

        {/* Quick-pick hours — visible for all roles in hourly mode */}
        {!isActualCost && mode === 'hourly' && (
          <div className="flex gap-2">
            {QUICK_HOURS.map(h => (
              <button
                key={h}
                type="button"
                onClick={() => handleQuickHour(h)}
                className={cn(
                  'flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all min-h-[48px]',
                  hoursValue === h
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:bg-muted/20',
                )}
              >
                {h}h
              </button>
            ))}
          </div>
        )}

        {/* Date — friendly label with hidden picker */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1 block">Date</Label>
          <button
            type="button"
            onClick={() => {
              const input = document.getElementById(`labor-date-${lineItemId}`) as HTMLInputElement;
              input?.showPicker?.();
            }}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium min-h-[44px] hover:border-primary/30 transition-colors"
          >
            <span>{dateLabel}</span>
            <span className="text-muted-foreground">▾</span>
          </button>
          <input
            id={`labor-date-${lineItemId}`}
            type="date"
            value={entryDate}
            onChange={e => setEntryDate(e.target.value)}
            className="sr-only"
          />
        </div>

        {/* Fields — stacked vertically */}
        {mode === 'hourly' ? (
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">Hours</Label>
              <Input
                type="number"
                step="0.25"
                min="0"
                value={hours}
                onChange={e => setHours(e.target.value)}
                placeholder="0"
                className="h-11 text-base font-semibold"
              />
            </div>
            <div>
              <div className="flex items-baseline gap-1 mb-1">
                <Label className="text-xs font-medium text-muted-foreground">Rate ($/hr)</Label>
                {isFC && <span className="text-[10px] text-muted-foreground">from your profile</span>}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={rate}
                  onChange={e => setRate(e.target.value)}
                  className="h-11 text-base font-semibold pl-7"
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1 block">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={lumpSum}
                onChange={e => setLumpSum(e.target.value)}
                placeholder="0.00"
                className="h-11 text-base font-semibold pl-7"
              />
            </div>
          </div>
        )}

        {/* TC markup */}
        {isTC && !isActualCost && (
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1 block">Markup %</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={markup}
              onChange={e => setMarkup(e.target.value)}
              className="h-11 text-base font-semibold w-32"
              placeholder="0"
            />
          </div>
        )}

        {/* Description */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1 block">Notes (optional)</Label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What work was done…"
            rows={2}
            className="text-sm resize-none"
          />
        </div>

        {/* Live total bar */}
        {computedTotal > 0 && (
          <div className="flex items-center justify-between rounded-xl px-4 py-3 bg-primary/5 border border-primary/15">
            <span className="text-xs font-medium text-muted-foreground">
              Entry total
              {markupAmount > 0 && ` (incl. ${markupPct}% markup)`}
            </span>
            <span className="text-lg font-bold text-primary">
              ${computedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
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

        {/* Save button — full-width prominent */}
        {!showNTEWarn && (
          <Button
            onClick={attemptSave}
            disabled={!canSave || saving}
            className="w-full h-12 text-sm font-bold gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {computedTotal > 0
              ? `Save — $${computedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              : 'Save Entry'}
          </Button>
        )}
      </div>
    </div>
  );
}

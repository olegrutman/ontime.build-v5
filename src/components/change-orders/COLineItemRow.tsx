import { CODescriptionEditor } from './CODescriptionEditor';
import { useState, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { COItemPricingDialog } from './COItemPricingDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, CheckCircle, MapPin, Lock, DollarSign, Trash2, Pencil, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtHours } from '@/lib/crewWorkload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CO_REASON_LABELS } from '@/types/changeOrder';
import type { COLineItem, COLaborEntry, COCreatedByRole, COReasonCode, COPricingType } from '@/types/changeOrder';
import type { MarkupVisibility } from '@/hooks/useMarkupVisibility';
import { useRoleLabelsContext } from '@/contexts/RoleLabelsContext';
import { actualEntryBaseCost } from '@/lib/laborEntryMath';
import { computeFcPricingBase } from '@/lib/fcPricingBase';

interface COLineItemRowProps {
  item: COLineItem;
  laborEntries: COLaborEntry[];
  role: COCreatedByRole;
  isGC: boolean;
  isTC: boolean;
  isFC: boolean;
  coId: string;
  orgId: string;
  coPricingType: COPricingType;
  coNteCap?: number | null;
  coNteUsed?: number;
  canAddLabor: boolean;
  /** Edit window for billable / external fields (locked once CO is submitted upstream). */
  canEditExternal?: boolean;
  /** Edit window for internal / private cost fields (locked once CO is finalized). */
  canEditInternal?: boolean;
  onRefresh: () => void;
  isEven?: boolean;
  index?: number;
  /** How much TC cost breakdown to show GCs. Default 'hidden'. */
  markupVisibility?: MarkupVisibility;
  /**
   * Crew-time pricing base for this change order. When enabled, an unpriced item
   * shows the amount derived from the crew's submitted time instead of "Set price",
   * so the item card agrees with the side panel before anything is saved.
   */
  crewPricingBase?: { enabled: boolean; hourlyRate: number; markupPercent: number };
  /** CO lifecycle status — the subcontractor's price is frozen once submitted upstream. */
  coStatus?: string;
  /** Item-level approval stays inside the same item window. */
  canReview?: boolean;
}


function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}



type StatusColor = 'gray' | 'amber' | 'green';

function getStatusColor(entries: COLaborEntry[], showGCApproval: boolean): StatusColor {
  if (entries.length === 0) return 'gray';
  if (showGCApproval && entries.every(e => (e as any).gc_approved)) return 'green';
  if (entries.length > 0) return 'amber';
  return 'gray';
}

const STATUS_BORDER_CLASS: Record<StatusColor, string> = {
  gray: 'border-l-border',
  amber: 'border-l-state-open',
  green: 'border-l-state-approved',
};

export const COLineItemRow = forwardRef<HTMLDivElement, COLineItemRowProps>(function COLineItemRow({
  item, laborEntries, role, isGC, isTC, isFC,
  coId, orgId, coPricingType, coNteCap, coNteUsed = 0,
  canAddLabor, canEditExternal = false, canEditInternal = false,
  onRefresh, isEven = true, index, markupVisibility = 'hidden', crewPricingBase, coStatus,
  canReview = false,
}, ref) {
  const rl = useRoleLabelsContext();

  // Resolve effective pricing type: line-item override wins, else CO default
  const pricingType: COPricingType = (item.pricing_type as COPricingType) ?? coPricingType;
  const nteCap = item.nte_cap ?? coNteCap;
  const nteUsed = coNteUsed; // NTE used is CO-level aggregate
  const hasPricingOverride = item.pricing_type != null && item.pricing_type !== coPricingType;
  const [expanded, setExpanded] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editHeaderOpen, setEditHeaderOpen] = useState(false);
  const [savingHeader, setSavingHeader] = useState(false);
  const [draftName, setDraftName] = useState(item.item_name);
  const [draftDesc, setDraftDesc] = useState(item.description ?? '');
  const [draftQty, setDraftQty] = useState(item.qty != null ? String(item.qty) : '');
  const [draftLocation, setDraftLocation] = useState(item.location_tag ?? '');
  const [draftReason, setDraftReason] = useState<COReasonCode | ''>(item.reason ?? '');
  const [draftPricingType, setDraftPricingType] = useState<COPricingType | ''>(item.pricing_type as COPricingType ?? '');
  const [draftNteCap, setDraftNteCap] = useState(item.nte_cap != null ? String(item.nte_cap) : '');

  const isMyOrgItem = item.org_id === orgId;
  const canEditHeader = canEditExternal && isMyOrgItem;

  const [deleting, setDeleting] = useState(false);

  async function saveHeader() {
    setSavingHeader(true);
    try {
      const qtyNum = draftQty.trim() === '' ? null : Number(draftQty);
      if (qtyNum != null && Number.isNaN(qtyNum)) { toast.error('Quantity must be a number'); return; }
      const nteCapNum = draftNteCap.trim() === '' ? null : Number(draftNteCap);
      if (nteCapNum != null && (Number.isNaN(nteCapNum) || nteCapNum <= 0)) { toast.error('NTE cap must be a positive number'); setSavingHeader(false); return; }
      const { error } = await supabase
        .from('co_line_items')
        .update({
          qty: qtyNum,
          location_tag: draftLocation.trim() || null,
          reason: draftReason || null,
          pricing_type: draftPricingType || null,
          nte_cap: draftPricingType === 'nte' ? nteCapNum : null,
        })
        .eq('id', item.id);
      if (error) throw error;
      const { error: descriptionError } = await supabase.rpc('update_co_description', {
        _co_id: coId,
        _line_item_id: item.id,
        _title: draftName.trim() || item.item_name,
        _description: draftDesc,
        _request_review: coStatus !== 'draft',
      });
      if (descriptionError) throw descriptionError;
      toast.success('Item updated');
      setEditHeaderOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update item');
    } finally {
      setSavingHeader(false);
    }
  }

  async function deleteItem() {
    const hasEntries = laborEntries.length > 0;
    const msg = hasEntries
      ? `Delete "${item.item_name}"? This will also remove ${laborEntries.length} time/cost entr${laborEntries.length === 1 ? 'y' : 'ies'} attached to it.`
      : `Delete "${item.item_name}"?`;
    if (!window.confirm(msg)) return;
    setDeleting(true);
    try {
      // Remove dependent labor entries first to satisfy FK constraints in any environment.
      if (hasEntries) {
        await supabase.from('co_labor_entries').delete().eq('co_line_item_id', item.id);
      }
      const { error } = await supabase.from('co_line_items').delete().eq('id', item.id);
      if (error) throw error;
      toast.success('Scope item deleted');
      setEditHeaderOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete item');
    } finally {
      setDeleting(false);
    }
  }

  const billable = laborEntries.filter(e => !e.is_actual_cost);
  const myRole = isFC ? 'FC' : isTC ? 'TC' : null;
  const actualCosts = laborEntries.filter(e => e.is_actual_cost && e.entered_by_role === myRole);

  const fcBillable = billable.filter(e => e.entered_by_role === 'FC');
  const tcBillable = billable.filter(e => e.entered_by_role === 'TC');

  const fcTotal = fcBillable.reduce((s, e) => s + (e.line_total ?? 0), 0);
  const tcTotal = tcBillable.reduce((s, e) => s + (e.line_total ?? 0), 0);
  const actualTotal = actualCosts.reduce((s, e) => s + actualEntryBaseCost(e), 0);

  // Crew log hours without a rate — those hours carry no dollar value until
  // someone prices them, so surface it instead of letting the line read as $0.
  const unpricedFCHours = fcBillable
    .filter(e => (e.hours ?? 0) > 0 && (e.line_total ?? 0) === 0)
    .reduce((s, e) => s + Number(e.hours ?? 0), 0);

  // Any crew time logged on this scope item — used to tell a subcontractor there's
  // already work here waiting to be priced.
  const crewHoursOnItem = fcBillable.reduce((s, e) => s + Number(e.hours ?? 0), 0);
  const crewLumpOnItem = fcBillable
    .filter(e => e.pricing_mode === 'lump_sum')
    .reduce((s, e) => s + Number(e.lump_sum ?? 0), 0);
  const crewCostOnItem = fcBillable.reduce((s, e) => s + Number(e.line_total ?? 0), 0);

  // Provisional billable amount straight from the crew's submitted time. Shown to a
  // subcontractor while the item is still unpriced so the card and the side panel
  // never disagree. Nothing is written until it's confirmed or edited.
  const crewBase = crewPricingBase?.enabled
    ? computeFcPricingBase({
        fcTotalHours: crewHoursOnItem,
        fcLumpSumTotal: crewLumpOnItem,
        hourlyRate: crewPricingBase.hourlyRate,
        markupPercent: crewPricingBase.markupPercent,
        pricingType,
      })
    : null;
  const provisionalAmount = crewBase?.fcHasSubmitted ? crewBase.calculatedPrice : 0;
  const [confirmingCrewPrice, setConfirmingCrewPrice] = useState(false);

  async function confirmCrewPrice() {
    if (!crewBase || provisionalAmount <= 0) return;
    setConfirmingCrewPrice(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const markupPct = crewBase.isHourly ? 0 : (crewPricingBase?.markupPercent ?? 0);
      const { error } = await supabase.from('co_labor_entries').insert({
        co_id: coId, co_line_item_id: item.id, org_id: orgId,
        entered_by_role: 'TC', entry_date: today,
        pricing_mode: crewBase.isHourly ? 'hourly' : 'lump_sum',
        hours: crewBase.isHourly ? crewHoursOnItem : null,
        base_hourly_rate: crewBase.isHourly ? (crewPricingBase?.hourlyRate ?? 0) : null,
        base_lump_sum: crewBase.isHourly ? null : crewLumpOnItem,
        markup_percent: markupPct,
        hourly_rate: crewBase.isHourly ? (crewPricingBase?.hourlyRate ?? 0) : null,
        lump_sum: crewBase.isHourly ? null : provisionalAmount,
        description: `Priced from ${rl.FC} submitted time`,
        is_actual_cost: false,
        crew_pricing_derived: true,
      });
      if (error) throw error;
      if (crewCostOnItem > 0) {
        await supabase.from('co_labor_entries').insert({
          co_id: coId, co_line_item_id: item.id, org_id: orgId,
          entered_by_role: 'TC', entry_date: today,
          pricing_mode: 'lump_sum',
          base_lump_sum: crewCostOnItem,
          markup_percent: 0,
          lump_sum: crewCostOnItem,
          description: `Internal cost (${rl.FC} time)`,
          is_actual_cost: true,
          crew_pricing_derived: true,
          source_fc_entry_ids: fcBillable.map(e => e.id),
        });
      }
      toast.success('Priced from crew time');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to price this item');
    } finally {
      setConfirmingCrewPrice(false);
    }
  }




  // Markup visibility logic for GC
  const hideGCBreakdown = isGC && markupVisibility === 'hidden' && pricingType === 'fixed';
  const gcSummaryOnly = isGC && markupVisibility === 'summary';
  // GC hidden mode: show the GC's per-line cost (the approved billable amount) without
  // revealing the TC's internal rates or margin.
  const visibleBillable = hideGCBreakdown ? tcBillable : gcSummaryOnly ? [] : isGC ? tcBillable : isFC ? fcBillable : tcBillable;
  const totalForRole = isGC ? tcTotal : isFC ? fcTotal : tcTotal;
  const entryCount = visibleBillable.length;

  const showGCApproval = isGC && (pricingType === 'tm' || pricingType === 'nte');

  const statusColor = getStatusColor(visibleBillable, showGCApproval);

  // Cost per scope item.
  // For a TC, what the crew bills them IS a cost of this scope item, so it
  // rolls into the private cost cell alongside any manually logged internal costs.
  // Crew entries that were already captured via "Import field hours" live
  // inside an internal-cost row, so exclude them here to avoid double counting.
  const importedFCEntryIds = new Set<string>(
    actualCosts.flatMap(e => ((e as { source_fc_entry_ids?: string[] | null }).source_fc_entry_ids ?? [])),
  );
  const fcCostForTC = isTC
    ? fcBillable
        .filter(e => !importedFCEntryIds.has(e.id))
        .reduce((s, e) => s + (e.line_total ?? 0), 0)
    : 0;
  const roleCostTotal = actualTotal + fcCostForTC;


  // Margin
  const billableTotal = isFC ? fcTotal : tcTotal;
  const hasMargin = billableTotal > 0 && roleCostTotal > 0;
  const marginAmount = billableTotal - roleCostTotal;
  const marginPct = hasMargin ? (marginAmount / billableTotal) * 100 : 0;



  // Strip markdown asterisks AND any trailing "Scope:" bullet list
  // (the AI narrative already covers what's in the bullets — showing both reads as duplicate)
  const cleanDescription = (item.description ?? '')
    .replace(/\*+/g, '')
    .split(/\n\s*Scope\s*:/i)[0]
    .trim();

  // Friendly unit label — "EA" reads as jargon to non-technical users
  const friendlyUnit = (() => {
    if (!item.unit) return null;
    const u = item.unit.trim().toUpperCase();
    if (u === 'EA') return 'each';
    if (u === 'LF') return 'linear ft';
    if (u === 'SF') return 'sq ft';
    if (u === 'CY') return 'cu yd';
    if (u === 'LS') return 'lump sum';
    return item.unit;
  })();

  // ---- Collapsed-row table cell values (hoisted so the header grid stays declarative) ----
  const isHourlyMode = visibleBillable.length > 0
    ? !visibleBillable.every(e => e.pricing_mode === 'lump_sum')
    : pricingType === 'tm';
  const modeLabel = isHourlyMode ? 'Hourly' : visibleBillable.length > 0 ? 'Lump sum' : pricingType === 'fixed' ? 'Fixed' : pricingType === 'tm' ? 'Hourly' : 'NTE';
  const totalHours = isHourlyMode ? visibleBillable.reduce((s, e) => s + (e.hours ?? 0), 0) : 0;
  const isPriced = entryCount > 0 || totalForRole > 0;
  // Once the order is submitted upstream the subcontractor's price is frozen —
  // no provisional confirm or new billable entries until recall.
  const tcPricingLocked = isTC && ['submitted', 'approved', 'rejected', 'contracted'].includes(coStatus ?? '');
  const showProvisional = !isPriced && canAddLabor && isTC && !tcPricingLocked && provisionalAmount > 0;
  const showInternalCell = (isTC || isFC || (isGC && markupVisibility === 'detailed')) && (roleCostTotal > 0 || hasMargin);

  async function handleGCApproval(entryId: string, approved: boolean) {
    try {
      const { error } = await supabase
        .from('co_labor_entries')
        .update({ gc_approved: approved, gc_approved_at: approved ? new Date().toISOString() : null })
        .eq('id', entryId);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update approval');
    }
  }

  return (
    <div ref={ref} className={cn('border-b border-l-2 border-border last:border-b-0', STATUS_BORDER_CLASS[statusColor])}>
      {/* Item header — clickable to expand */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(true)}
        onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(true); } }}
        aria-label={`Open ${item.item_name} details and pricing`}
        className="w-full cursor-pointer px-3 py-3 text-left transition-colors hover:bg-accent/30 sm:px-4"
      >
        <div className="flex flex-col gap-2 md:grid md:grid-cols-[2rem_minmax(0,1fr)_7rem_8rem_7rem_5rem] md:items-center md:gap-3">
          {/* # column — desktop */}
          <div className="hidden md:flex items-center justify-center w-8 h-8 rounded-full shrink-0" style={{ background: 'hsl(var(--amber)/0.15)', color: 'hsl(var(--amber-d))' }}>
            {index !== undefined && <span className="text-sm font-bold">{index}</span>}
          </div>
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Numbered index — mobile */}
            {index !== undefined && (
              <div className="md:hidden flex items-center justify-center w-8 h-8 rounded-full shrink-0 mt-0.5" style={{ background: 'hsl(var(--amber)/0.15)', color: 'hsl(var(--amber-d))' }}>
                <span className="text-sm font-bold">{index}</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-1.5">
                <p className="min-w-0 break-words font-heading text-base font-bold leading-tight tracking-tight text-foreground">{item.item_name}</p>
                {isMyOrgItem && coStatus && coStatus !== 'withdrawn' && (
                  <span onClick={(e) => e.stopPropagation()} className="shrink-0">
                    <CODescriptionEditor coId={item.co_id} status={coStatus} lineItemId={item.id} title={item.item_name} description={item.description ?? ''} label="Edit item description" onSaved={onRefresh} />
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {unpricedFCHours > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-state-open-bg text-state-open-foreground">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {unpricedFCHours}h {rl.FC} time unpriced
                  </span>
                )}

                {friendlyUnit && item.qty == null && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground font-medium">{friendlyUnit}</span>
                )}
                {item.qty != null && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground font-medium font-mono">qty {item.qty}</span>
                )}
                {item.location_tag && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-[10px] font-medium text-muted-foreground">
                    <MapPin className="h-2.5 w-2.5" /> {item.location_tag}
                  </span>
                )}
                {hasPricingOverride && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400">
                    <DollarSign className="h-2.5 w-2.5" />
                    {pricingType === 'fixed' ? 'Fixed' : pricingType === 'tm' ? 'T&M' : 'NTE'}
                  </span>
                )}
              </div>

              {/* Mobile money line — desktop shows table columns instead */}
              <div className="md:hidden mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                {isPriced ? (
                  <span className="font-mono text-lg font-bold text-foreground">${fmt(totalForRole)}</span>
                ) : showProvisional ? (
                  <button
                    type="button"
                    disabled={confirmingCrewPrice}
                    onClick={(e) => { e.stopPropagation(); confirmCrewPrice(); }}
                    className="inline-flex items-center gap-1 rounded-md border border-dashed border-state-open/70 bg-[hsl(var(--amber)/0.08)] px-2 py-1 font-mono text-xs font-semibold text-foreground"
                  >
                    {confirmingCrewPrice ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" style={{ color: 'hsl(var(--amber-d))' }} />}
                    Confirm ${fmt(provisionalAmount)}
                  </button>
                ) : canAddLabor && !tcPricingLocked ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setExpanded(true); setFormOpen(true); }}
                    className="inline-flex items-center gap-1 rounded-md border border-dashed border-state-open/70 bg-[hsl(var(--amber)/0.08)] px-2 py-1 text-xs font-semibold"
                    style={{ color: 'hsl(var(--amber-d))' }}
                  >
                    <DollarSign className="h-3 w-3" /> Set price
                  </button>
                ) : (
                  <span className="text-muted-foreground">Not priced</span>
                )}
                <span className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  item.approval_status === 'approved' && 'bg-state-approved-bg text-state-approved-foreground',
                  item.approval_status === 'rejected' && 'bg-destructive/10 text-destructive',
                  item.approval_status === 'pending' && 'bg-muted text-muted-foreground',
                )}>
                  {item.approval_status === 'approved' ? 'Approved' : item.approval_status === 'rejected' ? 'Rejected' : 'Pending review'}
                </span>
              </div>
            </div>
          </div>

          {/* Crew cost column (desktop) */}
          <div className="hidden text-right">
            {isTC && fcTotal > 0 ? (
              <>
                <span className="inline-flex items-center justify-end gap-1 font-mono text-sm font-semibold text-foreground">
                  ${fmt(fcTotal)}
                  <Lock className="h-3 w-3 text-state-approved" />
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  {crewHoursOnItem > 0 ? `${fmtHours(crewHoursOnItem)}h` : 'lump sum'} · private
                </span>
              </>
            ) : isTC && entryCount > 0 && actualTotal === 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Lock className="h-2.5 w-2.5" /> No cost logged
              </span>
            ) : (
              <span className="text-sm text-muted-foreground/40">—</span>
            )}
          </div>

          {/* Rate column (desktop) */}
          <div className="hidden md:block text-right">
            <span className="text-sm text-foreground">{modeLabel}</span>
            {isHourlyMode && totalHours > 0 && (
              <span className="block font-mono text-[10px] text-muted-foreground">{fmtHours(totalHours)}h</span>
            )}
          </div>

          {/* Billable column (desktop) */}
          <div className="hidden md:block text-right">
            {isPriced ? (
              <span className="font-mono text-lg font-bold text-foreground">${fmt(totalForRole)}</span>
            ) : showProvisional ? (
              <button
                type="button"
                disabled={confirmingCrewPrice}
                onClick={(e) => { e.stopPropagation(); confirmCrewPrice(); }}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-state-open/70 bg-[hsl(var(--amber)/0.08)] hover:bg-[hsl(var(--amber)/0.15)] px-2 py-1 font-mono text-xs font-semibold text-foreground transition-colors"
              >
                {confirmingCrewPrice ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" style={{ color: 'hsl(var(--amber-d))' }} />}
                Confirm ${fmt(provisionalAmount)}
              </button>
            ) : canAddLabor && !tcPricingLocked ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setExpanded(true); setFormOpen(true); }}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-state-open/70 bg-[hsl(var(--amber)/0.08)] hover:bg-[hsl(var(--amber)/0.15)] px-2 py-1 text-xs font-semibold transition-colors"
                style={{ color: 'hsl(var(--amber-d))' }}
              >
                <DollarSign className="h-3 w-3" /> Set price
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">Not priced</span>
            )}
          </div>

          {/* Margin column (desktop) */}
          <div className="hidden text-right">
            {showInternalCell && hasMargin ? (
              <span className={cn(
                'font-mono text-sm font-semibold',
                marginAmount >= 0 ? 'text-state-approved' : 'text-destructive',
              )}>
                {marginPct.toFixed(1)}%
              </span>
            ) : (
              <span className="text-sm text-muted-foreground/40">—</span>
            )}
          </div>


          <div className="hidden justify-end md:flex">
            <span className={cn(
              'inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold',
              item.approval_status === 'approved' && 'bg-state-approved-bg text-state-approved-foreground',
              item.approval_status === 'rejected' && 'bg-destructive/10 text-destructive',
              item.approval_status === 'pending' && 'bg-muted text-muted-foreground',
            )}>
              {item.approval_status === 'approved' ? 'Approved' : item.approval_status === 'rejected' ? 'Rejected' : 'Pending'}
            </span>
          </div>

            <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
              {canAddLabor && !tcPricingLocked && (
                <button
                  type="button"
                  aria-label={`Add pricing for ${item.item_name}`}
                  title="Add pricing"
                  onClick={() => { setExpanded(true); setFormOpen(true); }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-primary/20 md:hidden"
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Price</span>
                </button>
              )}
              {canEditHeader && (
                <Popover open={editHeaderOpen} onOpenChange={(o) => {
                  setEditHeaderOpen(o);
                  if (o) {
                    setDraftName(item.item_name);
                    setDraftDesc(item.description ?? '');
                    setDraftQty(item.qty != null ? String(item.qty) : '');
                    setDraftLocation(item.location_tag ?? '');
                    setDraftReason(item.reason ?? '');
                    setDraftPricingType(item.pricing_type as COPricingType ?? '');
                    setDraftNteCap(item.nte_cap != null ? String(item.nte_cap) : '');
                  }
                }}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Edit scope item"
                      className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[calc(100vw-2.5rem)] max-w-96 p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-foreground">Edit scope item</p>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Unit: {item.unit}</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Name</Label>
                        <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <Textarea
                          value={draftDesc}
                          onChange={(e) => setDraftDesc(e.target.value)}
                          rows={4}
                          className="text-sm whitespace-pre-line"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Quantity</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            value={draftQty}
                            onChange={(e) => setDraftQty(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Location</Label>
                          <Input value={draftLocation} onChange={(e) => setDraftLocation(e.target.value)} className="h-8 text-sm" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Reason</Label>
                        <Select value={draftReason || 'none'} onValueChange={(v) => setDraftReason(v === 'none' ? '' : (v as COReasonCode))}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="No reason" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No reason</SelectItem>
                            {(Object.keys(CO_REASON_LABELS) as COReasonCode[]).map((r) => (
                              <SelectItem key={r} value={r}>{CO_REASON_LABELS[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Pricing type</Label>
                          <Select value={draftPricingType || 'inherit'} onValueChange={(v) => setDraftPricingType(v === 'inherit' ? '' : (v as COPricingType))}>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inherit">CO default ({coPricingType === 'fixed' ? 'Fixed' : coPricingType === 'tm' ? 'T&M' : 'NTE'})</SelectItem>
                              <SelectItem value="fixed">Fixed</SelectItem>
                              <SelectItem value="tm">T&M</SelectItem>
                              <SelectItem value="nte">NTE</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {(draftPricingType === 'nte') && (
                          <div>
                            <Label className="text-xs text-muted-foreground">NTE cap ($)</Label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              value={draftNteCap}
                              onChange={(e) => setDraftNteCap(e.target.value)}
                              className="h-8 text-sm"
                              placeholder="Cap amount"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                        onClick={deleteItem}
                        disabled={savingHeader || deleting}
                      >
                        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Delete item
                      </Button>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditHeaderOpen(false)} disabled={savingHeader || deleting}>Cancel</Button>
                        <Button size="sm" onClick={saveHeader} disabled={savingHeader || deleting}>
                          {savingHeader ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              {!canEditExternal && isMyOrgItem && (
                <span title="Locked — CO submitted" className="text-muted-foreground/60">
                  <Lock className="h-3 w-3" />
                </span>
              )}
              <button
                type="button"
                aria-label={`Open ${item.item_name} details`}
                aria-expanded={expanded}
                onClick={() => setExpanded(true)}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', expanded && 'rotate-180')} />
              </button>
            </div>
          </div>
        </div>

      <COItemPricingDialog
        open={expanded}
        onOpenChange={(open) => {
          setExpanded(open);
          if (!open) setFormOpen(false);
        }}
        openFormOnOpen={formOpen}
        item={item}
        laborEntries={laborEntries}
        coId={coId}
        orgId={orgId}
        pricingType={pricingType}
        nteCap={nteCap}
        nteUsed={nteUsed}
        isGC={isGC}
        isTC={isTC}
        isFC={isFC}
        canAddLabor={canAddLabor}
        canEditExternal={canEditExternal}
        canEditInternal={canEditInternal}
        onRefresh={onRefresh}
        markupVisibility={markupVisibility}
        canReview={canReview}
        provisionalAmount={provisionalAmount}
        confirmingCrewPrice={confirmingCrewPrice}
        onConfirmCrewPrice={confirmCrewPrice}
      />
    </div>
  );
});

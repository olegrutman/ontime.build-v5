import { useState, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, CheckCircle, MapPin, Plus, Lock, TrendingUp, DollarSign, Trash2, Pencil, Loader2, AlertTriangle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { fmtHours, formatWorkload, formatWorkloadTooltip } from '@/lib/crewWorkload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LaborEntryForm } from './LaborEntryForm';
import { CO_REASON_LABELS, CO_REASON_COLORS } from '@/types/changeOrder';
import type { COLineItem, COLaborEntry, COCreatedByRole, COReasonCode, COPricingType } from '@/types/changeOrder';
import type { MarkupVisibility } from '@/hooks/useMarkupVisibility';
import { useRoleLabelsContext } from '@/contexts/RoleLabelsContext';

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

const STATUS_BORDER_COLOR: Record<StatusColor, string> = {
  gray: '#E4E8F0',
  amber: '#F5A623',
  green: '#059669',
};

export const COLineItemRow = forwardRef<HTMLDivElement, COLineItemRowProps>(function COLineItemRow({
  item, laborEntries, role, isGC, isTC, isFC,
  coId, orgId, coPricingType, coNteCap, coNteUsed = 0,
  canAddLabor, canEditExternal = false, canEditInternal = false,
  onRefresh, isEven = true, index, markupVisibility = 'hidden',
}, ref) {
  const rl = useRoleLabelsContext();
  // Resolve effective pricing type: line-item override wins, else CO default
  const pricingType: COPricingType = (item.pricing_type as COPricingType) ?? coPricingType;
  const nteCap = item.nte_cap ?? coNteCap;
  const nteUsed = coNteUsed; // NTE used is CO-level aggregate
  const hasPricingOverride = item.pricing_type != null && item.pricing_type !== coPricingType;
  const [showActualForm, setShowActualForm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  const [editHeaderOpen, setEditHeaderOpen] = useState(false);
  const [savingHeader, setSavingHeader] = useState(false);
  const [draftName, setDraftName] = useState(item.item_name);
  const [draftDesc, setDraftDesc] = useState(item.description ?? '');
  const [draftQty, setDraftQty] = useState(item.qty != null ? String(item.qty) : '');
  const [draftLocation, setDraftLocation] = useState(item.location_tag ?? '');
  const [draftReason, setDraftReason] = useState<COReasonCode | ''>(item.reason ?? '');
  const [draftPricingType, setDraftPricingType] = useState<COPricingType | ''>(item.pricing_type as COPricingType ?? '');
  const [draftNteCap, setDraftNteCap] = useState(item.nte_cap != null ? String(item.nte_cap) : '');

  const myRoleStr = isFC ? 'FC' : isTC ? 'TC' : isGC ? 'GC' : null;
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
          item_name: draftName.trim() || item.item_name,
          description: draftDesc.trim() || null,
          qty: qtyNum,
          location_tag: draftLocation.trim() || null,
          reason: draftReason || null,
          pricing_type: draftPricingType || null,
          nte_cap: draftPricingType === 'nte' ? nteCapNum : null,
        })
        .eq('id', item.id);
      if (error) throw error;
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

  function canEditEntry(entry: COLaborEntry): boolean {
    if (entry.entered_by_role !== myRoleStr) return false;
    if (entry.org_id !== orgId) return false;
    return entry.is_actual_cost ? canEditInternal : canEditExternal;
  }

  const billable = laborEntries.filter(e => !e.is_actual_cost);
  const myRole = isFC ? 'FC' : isTC ? 'TC' : null;
  const actualCosts = laborEntries.filter(e => e.is_actual_cost && e.entered_by_role === myRole);

  const fcBillable = billable.filter(e => e.entered_by_role === 'FC');
  const tcBillable = billable.filter(e => e.entered_by_role === 'TC');

  const fcTotal = fcBillable.reduce((s, e) => s + (e.line_total ?? 0), 0);
  const tcTotal = tcBillable.reduce((s, e) => s + (e.line_total ?? 0), 0);
  const actualTotal = actualCosts.reduce((s, e) => s + (e.line_total ?? 0), 0);

  // Field crew log hours without a rate — those hours carry no dollar value until
  // someone prices them, so surface it instead of letting the line read as $0.
  const unpricedFCHours = fcBillable
    .filter(e => (e.hours ?? 0) > 0 && (e.line_total ?? 0) === 0)
    .reduce((s, e) => s + Number(e.hours ?? 0), 0);

  // Markup visibility logic for GC
  const hideGCBreakdown = isGC && markupVisibility === 'hidden' && pricingType === 'fixed';
  const gcSummaryOnly = isGC && markupVisibility === 'summary';
  // GC hidden mode: show the GC's per-line cost (the approved billable amount) without
  // revealing the TC's internal rates or margin.
  const visibleBillable = hideGCBreakdown ? tcBillable : gcSummaryOnly ? [] : isGC ? tcBillable : isFC ? fcBillable : tcBillable;
  const tcDownstreamCosts = isTC ? fcBillable : [];
  const totalForRole = isGC ? tcTotal : isFC ? fcTotal : tcTotal;
  const entryCount = visibleBillable.length;

  const enteredByRole = isFC ? 'FC' as const : 'TC' as const;
  const showGCApproval = isGC && (pricingType === 'tm' || pricingType === 'nte');

  const statusColor = getStatusColor(visibleBillable, showGCApproval);

  // Cost per scope item.
  // For a TC, what the field crew bills them IS a cost of this scope item, so it
  // rolls into the private cost cell alongside any manually logged internal costs.
  // Field crew entries that were already captured via "Import field hours" live
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


  const autoExpand = canAddLabor && entryCount === 0 && !showActualForm;

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
    <div ref={ref} className={cn('border-b border-border last:border-b-0')} style={{ borderLeft: `3px solid ${STATUS_BORDER_COLOR[statusColor]}` }}>
      {/* Item header — clickable to expand */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded); } }}
        className="w-full text-left px-4 py-5 hover:bg-accent/30 transition-colors cursor-pointer"
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Numbered index */}
            {index !== undefined && (
              <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 mt-0.5" style={{ background: 'hsl(var(--amber)/0.15)', color: 'hsl(var(--amber-d))' }}>
                <span className="text-sm font-bold">{index}</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-heading text-foreground leading-tight tracking-tight" style={{ fontSize: '1.15rem', fontWeight: 700 }}>{item.item_name}</p>

              <div className="mt-2">
                <p className="text-[0.6rem] font-bold uppercase tracking-[1.2px] text-muted-foreground mb-1">Extra Notes</p>
                {cleanDescription ? (
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{cleanDescription}</p>
                ) : (
                  <p className="text-sm text-muted-foreground/60 italic">No extra notes</p>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {unpricedFCHours > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {unpricedFCHours}h {rl.FC.toLowerCase()} time unpriced
                  </span>
                )}

                {item.category_name && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground font-medium">{item.category_name}</span>
                )}
                {friendlyUnit && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground font-medium">{friendlyUnit}</span>
                )}
                {item.qty != null && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground font-medium font-mono">qty {item.qty}</span>
                )}
                {item.reason && (
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{
                      backgroundColor: CO_REASON_COLORS[item.reason as COReasonCode]?.bg,
                      color: CO_REASON_COLORS[item.reason as COReasonCode]?.text,
                    }}
                  >
                    {CO_REASON_LABELS[item.reason as COReasonCode]}
                  </span>
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
            </div>
          </div>

          {/* Right side — consolidated pricing module */}
          <div className="shrink-0 flex w-full sm:w-auto flex-wrap items-center justify-end gap-2.5">
            {(() => {
              const showInternalCell = (isTC || isFC || (isGC && markupVisibility === 'detailed')) && (roleCostTotal > 0 || hasMargin);
              // Prefer how the entries were actually priced; fall back to the CO pricing type.
              const isHourly = visibleBillable.length > 0
                ? !visibleBillable.every(e => e.pricing_mode === 'lump_sum')
                : pricingType === 'tm';
              const modeLabel = isHourly ? 'Hourly' : visibleBillable.length > 0 ? 'Lump sum' : pricingType === 'fixed' ? 'Fixed' : pricingType === 'tm' ? 'Hourly' : 'NTE';
              const totalHours = isHourly
                ? visibleBillable.reduce((s, e) => s + (e.hours ?? 0), 0)
                : 0;

              const isPriced = entryCount > 0 || totalForRole > 0;
              const primaryLabel = hideGCBreakdown ? 'Approved amount' : 'Billable';

              if (!isPriced && canAddLabor) {
                return (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setExpanded(true); setFormOpen(true); }}
                    className="group/price flex items-stretch rounded-lg border border-dashed border-amber-400/70 bg-[hsl(var(--amber)/0.06)] hover:border-amber-500 hover:bg-[hsl(var(--amber)/0.12)] transition-colors text-left"
                  >
                    <span className="flex flex-col justify-center px-2.5 border-r border-amber-400/40">
                      <span className="text-[9px] font-bold uppercase tracking-tight" style={{ color: 'hsl(var(--amber-d))' }}>{modeLabel}</span>
                    </span>
                    <span className="px-3.5 py-1.5">
                      <span className="block text-[9px] font-bold uppercase tracking-[1.2px] text-muted-foreground">Billable amount</span>
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5" style={{ color: 'hsl(var(--amber-d))' }} />
                        <span className="font-heading text-base font-bold text-foreground">Set price</span>
                      </span>
                    </span>
                  </button>
                );
              }

              if (!isPriced) {
                return (
                  <div className="rounded-lg border border-border bg-muted/20 px-3.5 py-1.5">
                    <span className="block text-[9px] font-bold uppercase tracking-[1.2px] text-muted-foreground">Billable amount</span>
                    <span className="font-mono text-sm text-muted-foreground">Not priced</span>
                  </div>
                );
              }

              return (
                <div className="flex items-stretch rounded-lg border border-border bg-card overflow-hidden">
                  {/* Mode */}
                  <div className="flex flex-col justify-center px-2 border-r border-border bg-muted/20">
                    <span className="text-[9px] font-bold uppercase tracking-tight leading-tight" style={{ color: 'hsl(var(--amber-d))' }}>{modeLabel}</span>
                    {entryCount > 0 && (
                      <span className="text-[9px] font-medium uppercase tracking-tight leading-tight text-muted-foreground/70">
                        {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
                        {isHourly && totalHours > 0 ? ` · ${totalHours}h` : ''}
                      </span>
                    )}
                  </div>

                  {/* Primary value */}
                  <div className="px-2.5 py-1.5">
                    <span className="block text-[9px] font-bold uppercase tracking-[1px] text-muted-foreground leading-tight">{primaryLabel}</span>
                    <span className="flex items-baseline gap-0.5">
                      <span className="font-mono text-sm" style={{ color: 'hsl(var(--amber-d))' }}>$</span>
                      <span className="font-mono text-base font-bold text-foreground">{fmt(totalForRole)}</span>
                    </span>
                  </div>

                  {/* Internal cost + margin */}
                  {showInternalCell && (
                    <div className="flex items-center gap-2.5 border-l border-border bg-muted/20 px-2.5 py-1.5">
                      <div>
                        <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-[1px] text-muted-foreground leading-tight">
                          <Lock className="h-2.5 w-2.5" /> Cost
                        </span>
                        <span className="font-mono text-xs text-foreground/70">
                          {roleCostTotal > 0 ? `$${fmt(roleCostTotal)}` : '—'}
                        </span>
                        {fcCostForTC > 0 && (
                          <span className="block text-[9px] font-medium text-muted-foreground/70 leading-tight">
                            incl. ${fmt(fcCostForTC)} {rl.FC.toLowerCase()}
                          </span>
                        )}
                      </div>

                      {hasMargin && (
                        <div className="text-right">
                          <span className="block text-[9px] font-bold uppercase tracking-[1px] text-muted-foreground leading-tight">Margin</span>
                          <span className={cn(
                            'font-mono text-xs font-semibold',
                            marginAmount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                          )}>
                            {marginPct.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );

            })()}

            {/* Internal-cost nudge for TCs who priced but logged no cost */}
            {isTC && entryCount > 0 && actualTotal === 0 && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted/40 text-muted-foreground">
                <Lock className="h-2.5 w-2.5" /> No cost logged
              </span>
            )}


            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
                aria-label={expanded ? 'Collapse pricing details' : 'Expand pricing details'}
                aria-expanded={expanded}
                onClick={() => setExpanded(!expanded)}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', expanded && 'rotate-180')} />
              </button>

            </div>
          </div>
        </div>
      </div>

      {/* Expanded entries panel */}
      {expanded && (
        <div className="bg-accent/30 border-t border-border">
          {hideGCBreakdown ? (
            <div className="px-5 py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Approved line total</span>
                <span className="font-mono font-semibold text-foreground">${fmt(tcTotal)}</span>
              </div>
              {visibleBillable.length > 0 && (
                <p className="text-[10px] text-muted-foreground">{visibleBillable.length} entr{visibleBillable.length === 1 ? 'y' : 'ies'} · TC rates and markup hidden</p>
              )}
            </div>
          ) : gcSummaryOnly ? (
            <div className="px-5 py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Labor Total</span>
                <span className="font-mono font-semibold text-foreground">${fmt(tcTotal)}</span>
              </div>
              {billable.length > 0 && (
                <p className="text-[10px] text-muted-foreground">{billable.length} entr{billable.length === 1 ? 'y' : 'ies'} · Rates hidden in summary mode</p>
              )}
            </div>
          ) : entryCount === 0 && !autoExpand ? (
            /* Empty state */
            <div className="px-6 py-8 text-center">
              <DollarSign className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">No pricing added yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add an entry to start tracking billable work for this scope item</p>
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div className="flex items-center text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium px-5 py-2 border-b border-border/50">
                <span className="w-20">Date</span>
                <span className="flex-1">Description</span>
                <span className="w-28 text-right">Workload</span>
                <span className="w-24 text-right">Billable</span>
                {(isTC || isFC || (isGC && markupVisibility === 'detailed')) && (
                  <span className="w-24 text-right flex items-center justify-end gap-1">
                    <Lock className="h-2.5 w-2.5" /> Int. Cost
                  </span>
                )}
              </div>

              {/* Entry rows */}
              {visibleBillable.map(entry => {
                const gcApproved = (entry as any).gc_approved;
                const matchingActual = actualCosts.find(a => a.entry_date === entry.entry_date);
                const billableEditable = canEditEntry(entry);
                const internalEditable = matchingActual ? canEditEntry(matchingActual) : false;
                const isEditingThisRow = editEntryId === entry.id || editEntryId === matchingActual?.id;

                return (
                  <div key={entry.id} className="border-b border-border/30">
                    <div className="flex items-center text-xs px-5 py-2.5 hover:bg-accent/40">
                      {showGCApproval && (
                        <Checkbox
                          checked={!!gcApproved}
                          onCheckedChange={(checked) => handleGCApproval(entry.id, !!checked)}
                          className="h-3.5 w-3.5 mr-2"
                        />
                      )}
                      <span className="w-20 text-muted-foreground">{entry.entry_date}</span>
                      <span className="flex-1 text-foreground truncate">{entry.description || '—'}</span>
                      <span
                        className="w-28 text-right font-mono text-muted-foreground truncate"
                        title={formatWorkloadTooltip(entry) ?? undefined}
                      >
                        {formatWorkload(entry)}
                      </span>
                      {/* Billable amount + inline edit pencil */}
                      <span className="w-24 text-right font-mono font-semibold text-foreground inline-flex items-center justify-end gap-1">
                        ${fmt(entry.line_total ?? 0)}
                        {billableEditable && (
                          <button
                            type="button"
                            aria-label="Edit billable entry"
                            onClick={(e) => { e.stopPropagation(); setEditEntryId(editEntryId === entry.id ? null : entry.id); }}
                            className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Edit billable entry"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                      {/* Internal cost + inline edit pencil */}
                      {(isTC || isFC || (isGC && markupVisibility === 'detailed')) && (
                        <span className="w-24 text-right inline-flex items-center justify-end gap-1">
                          {matchingActual ? (
                            <>
                              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                                <Lock className="h-2.5 w-2.5" /> ${fmt(matchingActual.line_total ?? 0)}
                              </span>
                              {internalEditable && (
                                <button
                                  type="button"
                                  aria-label="Edit internal cost"
                                  onClick={(e) => { e.stopPropagation(); setEditEntryId(editEntryId === matchingActual.id ? null : matchingActual.id); }}
                                  className="p-0.5 rounded hover:bg-muted text-emerald-700 hover:text-emerald-800"
                                  title="Edit internal cost"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              )}
                            </>
                          ) : (
                            canEditInternal && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setShowActualForm(true); }}
                                className="text-muted-foreground/50 hover:text-muted-foreground text-[10px]"
                              >
                                + add cost
                              </button>
                            )
                          )}
                        </span>
                      )}
                    </div>

                    {isEditingThisRow && (() => {
                      const editingObj = editEntryId === entry.id ? entry : matchingActual!;
                      return (
                        <div className="px-5 pb-3 pt-1 bg-accent/20">
                          <LaborEntryForm
                            coId={coId} lineItemId={item.id} orgId={orgId}
                            enteredByRole={enteredByRole} pricingType={pricingType}
                            isTC={isTC} isFC={isFC}
                            isActualCost={editingObj.is_actual_cost}
                            editingEntry={editingObj}
                            onSaved={() => { setEditEntryId(null); onRefresh(); }}
                            onCancel={() => setEditEntryId(null)}
                          />
                        </div>
                      );
                    })()}
                  </div>
                );
              })}

              {/* Orphan internal costs (no matching billable date) */}
              {(isTC || isFC) && (() => {
                const billableDates = new Set(visibleBillable.map(e => e.entry_date));
                const orphanActuals = actualCosts.filter(a => !billableDates.has(a.entry_date));
                if (orphanActuals.length === 0) return null;
                return (
                  <div className="border-t border-border/40 bg-emerald-50/30 dark:bg-emerald-950/10">
                    <div className="px-5 py-1.5 text-[10px] uppercase tracking-wider text-emerald-700/70 dark:text-emerald-400/70 font-semibold flex items-center gap-1">
                      <Lock className="h-2.5 w-2.5" /> Internal-only entries
                    </div>
                    {orphanActuals.map(a => {
                      const editable = canEditEntry(a);
                      const isEditingThisRow = editEntryId === a.id;
                      return (
                        <div key={a.id} className="border-b border-border/30 last:border-b-0">
                          <div className="flex items-center text-xs px-5 py-2 hover:bg-accent/40">
                            <span className="w-20 text-muted-foreground">{a.entry_date}</span>
                            <span className="flex-1 text-muted-foreground truncate">{a.description || '—'}</span>
                            <span
                              className="w-20 text-right font-mono text-muted-foreground truncate"
                              title={formatWorkloadTooltip(a) ?? undefined}
                            >
                              {formatWorkload(a)}
                            </span>
                            <span className="w-24 text-right font-mono text-muted-foreground/40">—</span>
                            <span className="w-28 text-right inline-flex items-center justify-end gap-1">
                              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium font-mono">
                                <Lock className="h-2.5 w-2.5" /> ${fmt(a.line_total ?? 0)}
                              </span>
                              {editable && (
                                <button
                                  type="button"
                                  aria-label="Edit internal cost"
                                  onClick={(e) => { e.stopPropagation(); setEditEntryId(editEntryId === a.id ? null : a.id); }}
                                  className="p-0.5 rounded hover:bg-muted text-emerald-700 hover:text-emerald-800"
                                  title="Edit internal cost"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              )}
                            </span>
                          </div>
                          {isEditingThisRow && (
                            <div className="px-5 pb-3 pt-1 bg-accent/20">
                              <LaborEntryForm
                                coId={coId} lineItemId={item.id} orgId={orgId}
                                enteredByRole={enteredByRole} pricingType={pricingType}
                                isTC={isTC} isFC={isFC}
                                isActualCost
                                editingEntry={a}
                                onSaved={() => { setEditEntryId(null); onRefresh(); }}
                                onCancel={() => setEditEntryId(null)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* TC's cost for this scope item — field crew charges + own internal costs */}
              {isTC && (tcDownstreamCosts.length > 0 || actualTotal > 0) && (
                <div className="border-t border-border px-5 py-2.5 bg-muted/20">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-bold mb-1.5 flex items-center gap-1">
                    <Lock className="h-2.5 w-2.5" /> Your cost for this item
                  </p>
                  {tcDownstreamCosts.map(entry => (
                    <div key={entry.id} className="flex items-center text-xs py-1.5 text-muted-foreground">
                      <span className="w-20">{entry.entry_date}</span>
                      <span className="flex-1 truncate">{rl.FC} · {entry.description || '—'}</span>
                      <span
                        className="w-20 text-right font-mono truncate"
                        title={formatWorkloadTooltip(entry) ?? undefined}
                      >
                        {formatWorkload(entry)}
                      </span>
                      <span className="w-24 text-right font-mono">${fmt(entry.line_total ?? 0)}</span>
                    </div>
                  ))}
                  {actualTotal > 0 && (
                    <div className="flex items-center text-xs py-1.5 text-muted-foreground">
                      <span className="flex-1 truncate">Own internal costs</span>
                      <span className="w-24 text-right font-mono">${fmt(actualTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-bold text-foreground pt-1.5 border-t border-border/40">
                    <span>Total cost</span>
                    <span className="font-mono">${fmt(roleCostTotal)}</span>
                  </div>
                  {billableTotal > 0 && (
                    <div className="flex justify-between text-xs pt-1 text-muted-foreground">
                      <span>Margin on this item</span>
                      <span className={cn('font-mono font-semibold', marginAmount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                        ${fmt(marginAmount)} · {marginPct.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              )}

            </>
          )}

          {/* Add pricing entry toggle */}
          {canAddLabor && (
            <Collapsible open={formOpen || autoExpand} onOpenChange={setFormOpen}>
              {!autoExpand && (
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'w-full flex items-center gap-2.5 px-5 py-3.5 text-xs transition-colors border-t border-border/50',
                      formOpen
                        ? 'bg-[hsl(var(--amber)/0.05)]'
                        : 'hover:bg-accent/40',
                    )}
                  >
                    <div className="w-6 h-6 rounded-full bg-[hsl(var(--amber)/0.1)] flex items-center justify-center">
                      <Plus className="h-3.5 w-3.5" style={{ color: 'hsl(var(--amber-d))' }} />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">Add pricing entry</p>
                      <p className="text-[10px] text-muted-foreground">Log hours, flat rate, or unit pricing</p>
                    </div>
                  </button>
                </CollapsibleTrigger>
              )}
              <CollapsibleContent>
                <div className="px-5 pb-4 pt-2">
                  <LaborEntryForm
                    coId={coId} lineItemId={item.id} orgId={orgId}
                    enteredByRole={enteredByRole} pricingType={pricingType}
                    isTC={isTC} isFC={isFC}
                    nteCap={nteCap} nteUsed={nteUsed}
                    onSaved={() => { setFormOpen(false); onRefresh(); }}
                    onCancel={() => setFormOpen(false)}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}


          {/* Internal cost entry stays open after approval / completion — real costs
              (invoices, timesheets, receipts) land late and never touch the billable side. */}
          {!canAddLabor && canEditInternal && (isTC || isFC) && !showActualForm && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowActualForm(true); }}
              className="w-full flex items-center gap-2.5 px-5 py-3 text-xs border-t border-border/50 hover:bg-accent/40 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Plus className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Log internal cost</p>
                <p className="text-[10px] text-muted-foreground">Private — does not change the billable amount</p>
              </div>
            </button>
          )}

          {/* Actual cost form */}
          {showActualForm && (
            <div className="px-5 pb-4 border-t border-border/50">
              <LaborEntryForm
                coId={coId} lineItemId={item.id} orgId={orgId}
                enteredByRole={enteredByRole} pricingType={pricingType}
                isTC={isTC} isFC={isFC} isActualCost
                onSaved={() => { setShowActualForm(false); onRefresh(); }}
                onCancel={() => setShowActualForm(false)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
});

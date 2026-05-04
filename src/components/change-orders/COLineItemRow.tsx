import { useState, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, CheckCircle, MapPin, Plus, Lock, TrendingUp, DollarSign, Trash2, Pencil, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LaborEntryForm } from './LaborEntryForm';
import { CO_REASON_LABELS, CO_REASON_COLORS } from '@/types/changeOrder';
import type { COLineItem, COLaborEntry, COCreatedByRole, COReasonCode, COPricingType } from '@/types/changeOrder';
import type { MarkupVisibility } from '@/hooks/useMarkupVisibility';

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

  // Markup visibility logic for GC
  const hideGCBreakdown = isGC && markupVisibility === 'hidden' && pricingType === 'fixed';
  const gcSummaryOnly = isGC && markupVisibility === 'summary';
  const visibleBillable = hideGCBreakdown ? [] : gcSummaryOnly ? [] : isGC ? tcBillable : isFC ? fcBillable : tcBillable;
  const tcDownstreamCosts = isTC ? fcBillable : [];
  const totalForRole = hideGCBreakdown ? 0 : isGC ? tcTotal : isFC ? fcTotal : tcTotal;
  const entryCount = hideGCBreakdown ? billable.length : gcSummaryOnly ? billable.length : visibleBillable.length;

  const enteredByRole = isFC ? 'FC' as const : 'TC' as const;
  const showGCApproval = isGC && (pricingType === 'tm' || pricingType === 'nte');

  const statusColor = getStatusColor(visibleBillable, showGCApproval);

  // Margin
  const billableTotal = isFC ? fcTotal : tcTotal;
  const hasMargin = billableTotal > 0 && actualTotal > 0;
  const marginAmount = billableTotal - actualTotal;
  const marginPct = hasMargin ? (marginAmount / billableTotal) * 100 : 0;

  const autoExpand = canAddLabor && entryCount === 0 && !showActualForm;

  // Strip markdown asterisks from description
  const cleanDescription = item.description?.replace(/\*+/g, '') ?? '';

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
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Numbered index */}
            {index !== undefined && (
              <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 mt-0.5" style={{ background: 'hsl(var(--amber)/0.15)', color: 'hsl(var(--amber-d))' }}>
                <span className="text-sm font-bold">{index}</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-heading text-foreground leading-tight tracking-tight" style={{ fontSize: '1.15rem', fontWeight: 700 }}>{item.item_name}</p>
              {cleanDescription && (
                <p className={cn(
                  'text-sm text-muted-foreground mt-1.5 leading-relaxed whitespace-pre-line',
                  item.category_name !== 'Combined scope' && 'line-clamp-3',
                )}>{cleanDescription}</p>
              )}
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                {item.category_name && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground font-medium">{item.category_name}</span>
                )}
                {item.unit && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground font-medium">{item.unit}</span>
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

          {/* Right side */}
          <div className="shrink-0 text-right flex flex-col items-end gap-1.5">
            {/* Status chip */}
            {(entryCount > 0 ? (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                Priced
              </span>
            ) : canAddLabor ? (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                Needs Pricing
              </span>
            ) : null)}

            {totalForRole > 0 && (
              <span className="font-mono text-sm font-bold text-foreground">${fmt(totalForRole)}</span>
            )}

            {/* Internal cost pill */}
            {isTC && (
              actualTotal > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                  <Lock className="h-2.5 w-2.5" /> Internal / ${fmt(actualTotal)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted/30 text-muted-foreground">
                  <Lock className="h-2.5 w-2.5" /> Internal / Not logged
                </span>
              )
            )}

            {/* Margin badge */}
            {hasMargin && (isTC || isFC) && (
              <span className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                marginAmount >= 0
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
              )}>
                <TrendingUp className="h-2.5 w-2.5" />
                {marginPct.toFixed(0)}%
              </span>
            )}

            <div className="flex items-center gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
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
                  <PopoverContent align="end" className="w-96 p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
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
              <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
            </div>
          </div>
        </div>
      </div>

      {/* Expanded entries panel */}
      {expanded && (
        <div className="bg-accent/30 border-t border-border">
          {hideGCBreakdown ? (
            <div className="px-6 py-8 text-center">
              <DollarSign className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">Pricing details hidden</p>
              <p className="text-xs text-muted-foreground mt-1">GC only sees the final submitted amount on fixed-price change orders.</p>
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
                <span className="w-14 text-right">Hours</span>
                <span className="w-24 text-right">Billable</span>
                {(isTC || isFC || (isGC && markupVisibility === 'detailed')) && (
                  <span className="w-28 text-right flex items-center justify-end gap-1">
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
                      <span className="w-14 text-right font-mono text-muted-foreground">
                        {entry.pricing_mode === 'lump_sum' ? '—' : `${entry.hours ?? 0}`}
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
                      {(isTC || isFC) && (
                        <span className="w-28 text-right inline-flex items-center justify-end gap-1">
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
                            <span className="w-14 text-right font-mono text-muted-foreground">
                              {a.pricing_mode === 'lump_sum' ? '—' : `${a.hours ?? 0}`}
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

              {/* TC downstream costs */}
              {isTC && tcDownstreamCosts.length > 0 && (
                <div className="border-t border-border px-5 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-1">FC Entries</p>
                  {tcDownstreamCosts.map(entry => (
                    <div key={entry.id} className="flex items-center text-xs py-1.5 text-muted-foreground">
                      <span className="w-20">{entry.entry_date}</span>
                      <span className="flex-1 truncate">{entry.description || '—'}</span>
                      <span className="w-14 text-right font-mono">{entry.hours ?? '—'}</span>
                      <span className="w-20 text-right font-mono">${fmt(entry.line_total ?? 0)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground pt-1 border-t border-border/30">
                    <span>FC total</span>
                    <span className="font-mono">${fmt(fcTotal)}</span>
                  </div>
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

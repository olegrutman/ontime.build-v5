import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle, Info, Lock, Loader2, MapPin, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { canRemoveLaborEntry } from '@/lib/laborEntryDelete';
import { actualEntryBaseCost } from '@/lib/laborEntryMath';
import { crewReviewDecisionError } from '@/lib/crewHourReview';
import { formatWorkloadTooltip, fmtHours } from '@/lib/crewWorkload';
import { useRoleLabelsContext } from '@/contexts/RoleLabelsContext';
import type { COLaborEntry, COLineItem, COLaborPricingMethod, COPricingType } from '@/types/changeOrder';
import type { MarkupVisibility } from '@/hooks/useMarkupVisibility';
import { LaborEntryForm } from './LaborEntryForm';
import { COLineItemReview } from './COLineReview';

const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function EntryRow({
  entry,
  privateEntry = false,
  downstream = false,
  hideRates = false,
  editable,
  deleting,
  onEdit,
  onDelete,
  showApproval = false,
  onApproval,
  showCrewReview = false,
  onCrewReview,
}: {
  entry: COLaborEntry;
  privateEntry?: boolean;
  downstream?: boolean;
  hideRates?: boolean;
  editable: boolean;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  showApproval?: boolean;
  onApproval?: (approved: boolean) => void;
  showCrewReview?: boolean;
  onCrewReview?: (decision: 'approved' | 'rejected', note?: string) => Promise<void>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const baseRate = entry.base_hourly_rate ?? entry.hourly_rate ?? 0;
  const baseLump = entry.base_lump_sum ?? entry.lump_sum ?? 0;
  const markup = privateEntry ? 0 : Number(entry.markup_percent ?? 0);
  const amount = privateEntry ? actualEntryBaseCost(entry) : Number(entry.line_total ?? 0);
  const workload = entry.pricing_mode === 'hourly'
    ? (formatWorkloadTooltip(entry) ?? `${fmtHours(Number(entry.hours ?? 0))} hrs`)
    : null;
  const reviewStatus = entry.crew_review_status ?? 'pending';

  async function reviewCrewHours(decision: 'approved' | 'rejected') {
    const validation = crewReviewDecisionError(decision, rejectionNote);
    if (validation) {
      toast.error(validation);
      return;
    }
    if (!onCrewReview) return;
    setReviewing(true);
    try {
      await onCrewReview(decision, rejectionNote);
      setRejecting(false);
      setRejectionNote('');
    } catch {
      // The parent reports the protected action's error and keeps the note intact.
    } finally {
      setReviewing(false);
    }
  }

  return (
    <div className="border-b border-border/60 px-4 py-4 last:border-b-0 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {showApproval && (
          <Checkbox
            checked={!!(entry as any).gc_approved}
            onCheckedChange={checked => onApproval?.(!!checked)}
            className="mt-1 h-4 w-4 shrink-0"
            aria-label="Approve labor entry"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {(privateEntry || downstream) && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            <p className="min-w-0 break-words text-sm font-semibold text-foreground">
              {entry.description || (privateEntry ? 'Private cost' : downstream ? 'Crew charge' : 'Billing entry')}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{entry.entry_date}</p>
          {!hideRates && (
            <div className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground">
              {entry.pricing_mode === 'hourly' ? (
                <p>{workload} × {money(baseRate)}/h</p>
              ) : (
                <p>Base amount {money(baseLump)}</p>
              )}
              {markup > 0 && <p>+ {markup}% markup on the billable amount</p>}
              {privateEntry && <p>Actual base cost · no markup</p>}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
          <span className="whitespace-nowrap font-mono text-base font-bold text-foreground sm:text-lg">{money(amount)}</span>
          {editable && (
            <>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label={privateEntry ? 'Edit private cost' : 'Edit billable entry'}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete} disabled={deleting} aria-label={privateEntry ? 'Remove private cost' : 'Remove billable entry'}>
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            </>
          )}
        </div>
      </div>

      {showCrewReview && (
        <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              reviewStatus === 'approved' && 'bg-state-approved-bg text-state-approved-foreground',
              reviewStatus === 'rejected' && 'bg-destructive/10 text-destructive',
              reviewStatus === 'pending' && 'bg-state-open-bg text-state-open-foreground',
            )}>
              {reviewStatus === 'approved' ? 'Hours approved' : reviewStatus === 'rejected' ? 'Hours rejected' : 'Review needed'}
            </span>
            {entry.crew_reviewed_at && (
              <span className="text-[11px] text-muted-foreground">Reviewed {new Date(entry.crew_reviewed_at).toLocaleDateString()}</span>
            )}
            {onCrewReview && !rejecting && (
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" disabled={reviewing} onClick={() => void reviewCrewHours('approved')}>
                  {reviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Approve hours
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-destructive hover:text-destructive" disabled={reviewing} onClick={() => setRejecting(true)}>
                  <X className="h-3.5 w-3.5" /> Reject hours
                </Button>
              </div>
            )}
          </div>
          {reviewStatus === 'rejected' && entry.crew_rejection_note && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive"><span className="font-semibold">Reason:</span> {entry.crew_rejection_note}</p>
          )}
          {rejecting && (
            <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <label htmlFor={`crew-rejection-${entry.id}`} className="text-xs font-semibold text-foreground">Why are these hours rejected?</label>
              <Textarea
                id={`crew-rejection-${entry.id}`}
                value={rejectionNote}
                onChange={event => setRejectionNote(event.target.value)}
                placeholder="Explain what the crew needs to correct"
                rows={2}
                className="bg-background"
                autoFocus
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" disabled={reviewing} onClick={() => { setRejecting(false); setRejectionNote(''); }}>Cancel</Button>
                <Button type="button" size="sm" variant="destructive" disabled={reviewing || !rejectionNote.trim()} onClick={() => void reviewCrewHours('rejected')}>
                  {reviewing && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Confirm rejection
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface COItemPricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openFormOnOpen?: boolean;
  item: COLineItem;
  laborEntries: COLaborEntry[];
  coId: string;
  orgId: string;
  pricingType: COPricingType;
  nteCap?: number | null;
  nteUsed?: number;
  isGC: boolean;
  isTC: boolean;
  isFC: boolean;
  canAddLabor: boolean;
  canEditExternal: boolean;
  canEditInternal: boolean;
  onRefresh: () => void;
  markupVisibility: MarkupVisibility;
  canReview: boolean;
  provisionalAmount?: number;
  confirmingCrewPrice?: boolean;
  onConfirmCrewPrice?: () => void;
  laborPricingMethod?: COLaborPricingMethod;
  canChangeLaborPricingMethod?: boolean;
  crewMethodBlockedReason?: string | null;
  onLaborPricingMethodChange?: (method: COLaborPricingMethod) => Promise<void>;
  canCompleteItem?: boolean;
  completingItem?: boolean;
  onCompleteItem?: () => void;
}

export function COItemPricingDialog({
  open,
  onOpenChange,
  openFormOnOpen = false,
  item,
  laborEntries,
  coId,
  orgId,
  pricingType,
  nteCap,
  nteUsed = 0,
  isGC,
  isTC,
  isFC,
  canAddLabor,
  canEditExternal,
  canEditInternal,
  onRefresh,
  markupVisibility,
  canReview,
  provisionalAmount = 0,
  confirmingCrewPrice = false,
  onConfirmCrewPrice,
  laborPricingMethod = 'manual',
  canChangeLaborPricingMethod = false,
  crewMethodBlockedReason = null,
  onLaborPricingMethodChange,
  canCompleteItem = false,
  completingItem = false,
  onCompleteItem,
}: COItemPricingDialogProps) {
  const rl = useRoleLabelsContext();
  const [activeTab, setActiveTab] = useState('billing');
  const [formMode, setFormMode] = useState<'billable' | 'cost' | null>(null);
  const [editingEntry, setEditingEntry] = useState<COLaborEntry | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [billedEntryIds, setBilledEntryIds] = useState<Set<string>>(new Set());
  const entryIdKey = laborEntries.map(entry => entry.id).sort().join(',');
  useEffect(() => {
    if (!open || !entryIdKey) { setBilledEntryIds(new Set()); return; }
    let cancelled = false;
    const ids = entryIdKey.split(',');
    (async () => {
      const { data } = await supabase
        .from('invoice_line_items')
        .select('source_entry_ids, invoices!inner(status)')
        .overlaps('source_entry_ids', ids)
        .neq('invoices.status', 'REJECTED');
      if (cancelled) return;
      const billed = new Set<string>();
      for (const row of (data ?? []) as any[]) for (const id of row.source_entry_ids ?? []) billed.add(id);
      setBilledEntryIds(billed);
    })();
    return () => { cancelled = true; };
  }, [open, entryIdKey]);
  const [changingLaborMethod, setChangingLaborMethod] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveTab('billing');
      setEditingEntry(null);
      setFormMode(openFormOnOpen && !(isTC && laborPricingMethod === 'crew') ? 'billable' : null);
    } else {
      setEditingEntry(null);
      setFormMode(null);
    }
  }, [open, openFormOnOpen, isTC, laborPricingMethod]);

  const myRole = isFC ? 'FC' : isTC ? 'TC' : null;
  const billableRows = useMemo(() => laborEntries.filter(entry => !entry.is_actual_cost), [laborEntries]);
  const allTcBillable = billableRows.filter(entry => entry.entered_by_role === 'TC');
  const allFcBillable = billableRows.filter(entry => entry.entered_by_role === 'FC');
  const ownTcBillable = allTcBillable.filter(entry => entry.org_id === orgId);
  const ownFcBillable = allFcBillable.filter(entry => entry.org_id === orgId);
  const visibleBillable = isGC ? allTcBillable : isFC ? ownFcBillable : ownTcBillable;
  const actualCosts = laborEntries.filter(entry => entry.is_actual_cost && entry.entered_by_role === myRole && entry.org_id === orgId);
  const actualTotal = actualCosts.reduce((sum, entry) => sum + actualEntryBaseCost(entry), 0);
  const importedIds = new Set(actualCosts.flatMap(entry => entry.source_fc_entry_ids ?? []));
  const fcCostForTC = isTC
    ? allFcBillable.filter(entry => !importedIds.has(entry.id)).reduce((sum, entry) => sum + Number(entry.line_total ?? 0), 0)
    : 0;
  const roleCostTotal = actualTotal + fcCostForTC;
  const billableTotal = visibleBillable.reduce((sum, entry) => sum + Number(entry.line_total ?? 0), 0);
  const margin = billableTotal - roleCostTotal;
  const marginPct = billableTotal > 0 ? (margin / billableTotal) * 100 : 0;
  const hideGCBreakdown = isGC && markupVisibility === 'hidden' && pricingType === 'fixed';
  const gcSummaryOnly = isGC && markupVisibility === 'summary';
  const enteredByRole = isFC ? 'FC' as const : 'TC' as const;
  const showGCApproval = isGC && (pricingType === 'tm' || pricingType === 'nte');
  const cleanDescription = (item.description ?? '').replace(/\*+/g, '').split(/\n\s*Scope\s*:/i)[0].trim();
  const friendlyUnit = item.unit?.toUpperCase() === 'EA' ? 'each' : item.unit?.toUpperCase() === 'LF' ? 'linear ft' : item.unit;

  function canEditEntry(entry: COLaborEntry) {
    return canRemoveLaborEntry({
      entryRole: entry.entered_by_role,
      entryOrgId: entry.org_id,
      isActualCost: entry.is_actual_cost,
      myRole,
      myOrgId: orgId,
      canEditExternal,
      canEditInternal,
      pricingType,
      billed: billedEntryIds.has(entry.id),
    });
  }

  async function deleteEntry(entry: COLaborEntry) {
    if (!canEditEntry(entry)) {
      toast.error(billedEntryIds.has(entry.id)
        ? 'This entry is already on an invoice — remove it from that invoice first.'
        : 'This entry is locked — it belongs to an agreed amount.');
      return;
    }
    const amount = entry.is_actual_cost ? actualEntryBaseCost(entry) : Number(entry.line_total ?? 0);
    if (!window.confirm(`Remove this ${entry.is_actual_cost ? 'private cost' : 'billing entry'}? ${money(amount)} will come off this scope item.`)) return;
    setDeletingEntryId(entry.id);
    try {
      const { error } = await supabase.from('co_labor_entries').delete().eq('id', entry.id);
      if (error) throw error;
      toast.success('Entry removed');
      setEditingEntry(null);
      onRefresh();
    } catch (error: any) {
      toast.error(error?.message ?? 'Failed to remove entry');
    } finally {
      setDeletingEntryId(null);
    }
  }

  async function handleGCApproval(entryId: string, approved: boolean) {
    const { error } = await supabase.from('co_labor_entries').update({ gc_approved: approved, gc_approved_at: approved ? new Date().toISOString() : null }).eq('id', entryId);
    if (error) toast.error(error.message);
    else onRefresh();
  }

  async function handleCrewReview(entryId: string, decision: 'approved' | 'rejected', note?: string) {
    const validation = crewReviewDecisionError(decision, note);
    if (validation) {
      toast.error(validation);
      throw new Error(validation);
    }
    const { error } = await supabase.rpc('review_fc_labor_entry', {
      _entry_id: entryId,
      _decision: decision,
      _note: note?.trim() || null,
    });
    if (error) {
      toast.error(error.message);
      throw error;
    }
    toast.success(decision === 'approved' ? 'Crew hours approved' : 'Crew hours rejected');
    onRefresh();
  }

  function renderRows(rows: COLaborEntry[], options: { privateEntry?: boolean; downstream?: boolean; hideRates?: boolean } = {}) {
    return (
      <div className="divide-y divide-border/60 rounded-xl border border-border bg-card">
        {rows.map(entry => (
          <EntryRow
            key={entry.id}
            entry={entry}
            {...options}
            editable={!options.downstream && canEditEntry(entry)}
            deleting={deletingEntryId === entry.id}
            onEdit={() => { setEditingEntry(entry); setFormMode(null); }}
            onDelete={() => void deleteEntry(entry)}
            showApproval={!options.privateEntry && !options.downstream && showGCApproval}
            onApproval={approved => void handleGCApproval(entry.id, approved)}
            showCrewReview={entry.entered_by_role === 'FC' && !entry.is_actual_cost && (isFC || (isTC && !!options.downstream))}
            onCrewReview={undefined}
          />
        ))}
      </div>
    );
  }

  const focusedEntry = editingEntry;
  const focusedActual = focusedEntry?.is_actual_cost ?? formMode === 'cost';

  async function changeLaborMethod(method: COLaborPricingMethod) {
    if (method === laborPricingMethod || !onLaborPricingMethodChange || !canChangeLaborPricingMethod) return;
    setChangingLaborMethod(true);
    try {
      await onLaborPricingMethodChange(method);
    } finally {
      setChangingLaborMethod(false);
    }
  }

  const methodButton = (method: COLaborPricingMethod) => {
    const selected = laborPricingMethod === method;
    const crew = method === 'crew';
    const methodBlocked = crew && !!crewMethodBlockedReason;
    return (
      <button
        key={method}
        type="button"
        aria-pressed={selected}
        aria-label={crew ? 'Use crew hours' : 'Set manually'}
        title={methodBlocked ? crewMethodBlockedReason ?? undefined : undefined}
        disabled={!canChangeLaborPricingMethod || changingLaborMethod || methodBlocked}
        onClick={() => void changeLaborMethod(method)}
        className={cn(
          'relative flex min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors',
          selected && crew && 'border-primary bg-primary/10',
          selected && !crew && 'border-foreground bg-muted/40',
          !selected && 'border-border bg-card hover:bg-muted/30',
          (!canChangeLaborPricingMethod || changingLaborMethod || methodBlocked) && 'cursor-not-allowed opacity-70',
        )}
      >
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', selected && crew ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
          {crew ? <Users className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-bold text-foreground">{crew ? 'Use crew hours' : 'Set manually'}</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{crew ? 'Calculate from this item’s approved crew hours' : 'Enter your own hours, rate, or lump sum'}</span>
        </span>
        {selected && <CheckCircle className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-2xl p-0">
        <DialogHeader className="shrink-0 border-b border-border bg-card px-5 py-4 pr-12 text-left">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="min-w-0 font-heading text-2xl text-foreground">{item.item_name}</DialogTitle>
            <span className={cn(
              'mt-1 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
              item.approval_status === 'approved' && 'bg-state-approved-bg text-state-approved-foreground',
              item.approval_status === 'rejected' && 'bg-destructive/10 text-destructive',
              item.approval_status === 'pending' && 'bg-muted text-muted-foreground',
            )}>
              {item.approval_status === 'approved' ? 'Approved' : item.approval_status === 'rejected' ? 'Rejected' : 'Pending review'}
            </span>
          </div>
          <DialogDescription className="whitespace-pre-line break-words text-sm text-muted-foreground">
            {cleanDescription || 'Review scope, pricing and private costs for this item.'}
          </DialogDescription>
          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
            {item.location_tag && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{item.location_tag}</span>}
            {item.qty != null && <span>Quantity: {item.qty} {friendlyUnit}</span>}
          </div>
        </DialogHeader>

        <COLineItemReview coId={coId} item={item} canReview={canReview} onRefresh={onRefresh} />

        {isTC && onLaborPricingMethodChange && (
          <section aria-label="Labor pricing method for this item" className="shrink-0 border-b border-border bg-muted/20 px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Labor pricing</p>
                <h3 className="mt-0.5 text-xs font-bold text-foreground">Pricing method for this item</h3>
              </div>
              <span className="rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">This item only</span>
            </div>
            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {methodButton('crew')}
              {methodButton('manual')}
            </div>
            <div className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {changingLaborMethod ? <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" /> : !canChangeLaborPricingMethod ? <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
              <p>
                {changingLaborMethod
                  ? 'Saving this item’s pricing method…'
                  : !canChangeLaborPricingMethod
                    ? 'Recall the upstream submission before changing this item’s billing.'
                    : crewMethodBlockedReason
                      ? crewMethodBlockedReason
                      : laborPricingMethod === 'crew'
                        ? 'Only this item uses approved crew hours × your billable rate. Crew pay stays private.'
                        : 'Only this item is set manually. Other items can still use crew hours; crew pay stays private.'}
              </p>
            </div>
          </section>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto bg-background">
          {focusedEntry || formMode ? (
            <div className="p-3 sm:p-5 [&>div]:shadow-none">
              <LaborEntryForm
                key={focusedEntry?.id ?? formMode}
                coId={coId}
                lineItemId={item.id}
                orgId={orgId}
                enteredByRole={enteredByRole}
                pricingType={pricingType}
                isTC={isTC}
                isFC={isFC}
                isActualCost={focusedActual}
                editingEntry={focusedEntry ?? undefined}
                nteCap={focusedActual ? null : nteCap}
                nteUsed={nteUsed}
                useCrewPricingBase={laborPricingMethod === 'crew'}
                onSaved={() => { setEditingEntry(null); setFormMode(null); onRefresh(); }}
                onCancel={() => { setEditingEntry(null); setFormMode(null); }}
                onDelete={focusedEntry ? () => deleteEntry(focusedEntry) : undefined}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border bg-muted/20 px-5 py-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{pricingType === 'fixed' ? 'Agreed item price' : 'Running item actuals'}</p>
                  <p className="mt-1 whitespace-nowrap font-mono text-3xl font-bold text-foreground sm:text-4xl">{money(billableTotal)}</p>
                </div>
                <p className="text-xs text-muted-foreground">{visibleBillable.length} billing entr{visibleBillable.length === 1 ? 'y' : 'ies'}</p>
              </div>

              {(isTC || isFC) ? (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid h-auto w-full grid-cols-2 rounded-none border-b border-border bg-card p-0">
                    <TabsTrigger value="billing" className="rounded-none border-b-2 border-transparent px-3 py-3 text-xs data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:shadow-none sm:text-sm">
                      Billing entries ({visibleBillable.length})
                    </TabsTrigger>
                    <TabsTrigger value="private" className="rounded-none border-b-2 border-transparent px-3 py-3 text-xs data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:shadow-none sm:text-sm">
                      Private costs &amp; margin
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="billing" className="m-0 p-3 sm:p-5">
                    {visibleBillable.length > 0 ? renderRows(visibleBillable) : (
                      <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center">
                        <p className="text-sm font-semibold text-foreground">{pricingType === 'fixed' ? 'No pricing entries yet' : 'No dated actuals yet'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{pricingType === 'fixed' ? "Add an entry to set this item's agreed price." : 'Log work dates, hours and rates as the work happens.'}</p>
                        {provisionalAmount > 0 && onConfirmCrewPrice && (
                          <Button type="button" className="mt-4 gap-2" onClick={onConfirmCrewPrice} disabled={confirmingCrewPrice}>
                            {confirmingCrewPrice ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                            Confirm crew-based price · {money(provisionalAmount)}
                          </Button>
                        )}
                      </div>
                    )}
                    {canAddLabor && !(isTC && laborPricingMethod === 'crew') && (
                      <Button type="button" className="mt-3 gap-2" onClick={() => setFormMode('billable')}>
                        <Plus className="h-4 w-4" /> {pricingType === 'fixed' ? 'Add pricing entry' : 'Log hours & actuals'}
                      </Button>
                    )}
                  </TabsContent>

                  <TabsContent value="private" className="m-0 space-y-4 p-3 sm:p-5">
                    {isTC && allFcBillable.length > 0 && (
                      <section>
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{rl.FC} charges · private</h3>
                        <p className="mb-2 text-xs leading-relaxed text-muted-foreground">Approved hours can feed new crew-based pricing. Review never changes a price already submitted or approved upstream.</p>
                        {renderRows(allFcBillable, { downstream: true })}
                      </section>
                    )}
                    <section>
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Your actual costs · no markup</h3>
                      {actualCosts.length > 0 ? renderRows(actualCosts, { privateEntry: true }) : (
                        <p className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">No private costs logged.</p>
                      )}
                    </section>
                    <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Private cost</p>
                        <p className="mt-1 font-mono text-xl font-bold text-foreground">{money(roleCostTotal)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Gross margin</p>
                        {roleCostTotal > 0 ? (
                          <p className={cn('mt-1 font-mono text-xl font-bold', margin >= 0 ? 'text-state-approved' : 'text-destructive')}>
                            {money(margin)} <span className="text-sm">· {marginPct.toFixed(1)}%</span>
                          </p>
                        ) : <p className="mt-1 text-sm text-muted-foreground">Add a private cost to calculate</p>}
                      </div>
                    </div>
                    {canEditInternal && (
                      <Button type="button" variant="outline" className="gap-2" onClick={() => setFormMode('cost')}>
                        <Lock className="h-3.5 w-3.5" /> Log private cost
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">Private costs are never shown to the other company.</p>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="p-3 sm:p-5">
                  {hideGCBreakdown || gcSummaryOnly ? (
                    <p className="rounded-xl border border-border bg-muted/20 px-4 py-4 text-sm text-muted-foreground">Detailed rates, markup and private costs are hidden by the project's privacy settings.</p>
                  ) : visibleBillable.length > 0 ? renderRows(visibleBillable) : (
                    <p className="text-sm text-muted-foreground">No pricing entries.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {(item.completed_at || canCompleteItem) && (
          <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p><span className="block text-xs font-semibold text-foreground">{item.completed_at ? 'Item completed' : 'Finish this item separately'}</span>{item.completed_at ? `Completed ${new Date(item.completed_at).toLocaleDateString()}` : 'Completed items become available for billing.'}</p>
            </div>
            {item.completed_at ? (
              <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-state-approved-bg px-2.5 py-1 text-[11px] font-semibold text-state-approved-foreground sm:self-auto"><CheckCircle className="h-3.5 w-3.5" />Available for billing</span>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={onCompleteItem} disabled={completingItem} aria-label={`Mark ${item.item_name} completed`} className="w-full gap-2 sm:w-auto">
                {completingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Mark item completed
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

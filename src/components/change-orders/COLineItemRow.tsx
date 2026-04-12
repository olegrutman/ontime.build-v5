import { useState, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, EyeOff, CheckCircle, MapPin, Plus } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LaborEntryForm } from './LaborEntryForm';
import { CO_REASON_LABELS, CO_REASON_COLORS } from '@/types/changeOrder';
import type { COLineItem, COLaborEntry, COCreatedByRole, COReasonCode } from '@/types/changeOrder';

interface COLineItemRowProps {
  item: COLineItem;
  laborEntries: COLaborEntry[];
  role: COCreatedByRole;
  isGC: boolean;
  isTC: boolean;
  isFC: boolean;
  coId: string;
  orgId: string;
  pricingType: 'fixed' | 'tm' | 'nte';
  nteCap?: number | null;
  nteUsed?: number;
  canAddLabor: boolean;
  onRefresh: () => void;
  isEven?: boolean;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type StatusColor = 'gray' | 'amber' | 'green';

function getStatusColor(entries: COLaborEntry[], showGCApproval: boolean): StatusColor {
  if (entries.length === 0) return 'gray';
  if (showGCApproval && entries.every(e => (e as any).gc_approved)) return 'green';
  if (showGCApproval && entries.some(e => (e as any).gc_approved)) return 'amber';
  if (entries.length > 0) return 'amber';
  return 'gray';
}

const STATUS_DOT_CLASSES: Record<StatusColor, string> = {
  gray: 'bg-muted-foreground/30',
  amber: 'bg-amber-400',
  green: 'bg-emerald-500',
};

export const COLineItemRow = forwardRef<HTMLDivElement, COLineItemRowProps>(function COLineItemRow({
  item, laborEntries, role, isGC, isTC, isFC,
  coId, orgId, pricingType, nteCap, nteUsed = 0,
  canAddLabor, onRefresh, isEven = true,
}, ref) {
  const [showActualForm, setShowActualForm] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const billable = laborEntries.filter(e => !e.is_actual_cost);
  const myRole = isFC ? 'FC' : isTC ? 'TC' : null;
  const actualCosts = laborEntries.filter(e => e.is_actual_cost && e.entered_by_role === myRole);

  const fcBillable = billable.filter(e => e.entered_by_role === 'FC');
  const tcBillable = billable.filter(e => e.entered_by_role === 'TC');

  const fcTotal = fcBillable.reduce((s, e) => s + (e.line_total ?? 0), 0);
  const tcTotal = tcBillable.reduce((s, e) => s + (e.line_total ?? 0), 0);
  const actualTotal = actualCosts.reduce((s, e) => s + (e.line_total ?? 0), 0);

  const visibleBillable = isGC ? tcBillable : isFC ? fcBillable : tcBillable;
  const tcDownstreamCosts = isTC ? fcBillable : [];
  const totalForRole = isGC ? tcTotal : isFC ? fcTotal : tcTotal;
  const entryCount = visibleBillable.length;

  const enteredByRole = isFC ? 'FC' as const : 'TC' as const;
  const showGCApproval = isGC && (pricingType === 'tm' || pricingType === 'nte');

  const statusColor = getStatusColor(visibleBillable, showGCApproval);
  const latestEntry = visibleBillable.length > 0 ? visibleBillable[visibleBillable.length - 1] : null;
  const autoExpand = canAddLabor && entryCount === 0 && !showActualForm;

  async function handleGCApproval(entryId: string, approved: boolean) {
    try {
      const { error } = await supabase
        .from('co_labor_entries')
        .update({
          gc_approved: approved,
          gc_approved_at: approved ? new Date().toISOString() : null,
        })
        .eq('id', entryId);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update approval');
    }
  }

  function renderEntry(entry: COLaborEntry, showApproval: boolean, muted = false) {
    const gcApproved = (entry as any).gc_approved;
    return (
      <div key={entry.id} className={cn(
        'flex items-center justify-between text-xs rounded-lg px-3 py-2',
        muted ? 'bg-muted/10' : 'bg-muted/20',
      )}>
        <div className="flex items-center gap-1.5 min-w-0">
          {showApproval && (
            <Checkbox
              checked={!!gcApproved}
              onCheckedChange={(checked) => handleGCApproval(entry.id, !!checked)}
              className="h-3.5 w-3.5"
            />
          )}
          {!showApproval && (isTC || isFC) && gcApproved !== undefined && (
            <span className={cn('shrink-0', gcApproved ? 'text-emerald-500' : 'text-muted-foreground/40')}>
              <CheckCircle className="h-3 w-3" />
            </span>
          )}
          <span className="inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
            {entry.entered_by_role}
          </span>
          <span className="text-muted-foreground truncate">
            {entry.entry_date} ·{' '}
            {entry.pricing_mode === 'lump_sum'
              ? 'lump sum'
              : `${entry.hours ?? 0} hrs${!isGC && entry.hourly_rate ? ` @ $${entry.hourly_rate}/hr` : ''}`}
            {entry.description ? ` · ${entry.description}` : ''}
          </span>
        </div>
        <span className={cn('font-medium shrink-0 ml-2', muted ? 'text-muted-foreground' : 'text-foreground')}>
          ${fmt(entry.line_total ?? 0)}
        </span>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn(
      'border-b border-border last:border-b-0',
      !isEven && 'bg-muted/[0.03]',
    )}>
      {/* Item header */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            {/* Status dot */}
            <div className={cn(
              'w-2.5 h-2.5 rounded-full shrink-0 mt-1',
              STATUS_DOT_CLASSES[statusColor],
            )} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{item.item_name}</p>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                {item.category_name && (
                  <span className="text-[10px] text-muted-foreground">{item.category_name}</span>
                )}
                {item.division && (
                  <span className="text-[10px] text-muted-foreground">· {item.division}</span>
                )}
                {item.unit && (
                  <span className="text-[10px] text-muted-foreground">· {item.unit}</span>
                )}
                {item.reason && (
                  <span
                    className="inline-block px-1.5 py-0 rounded text-[10px] font-semibold"
                    style={{
                      backgroundColor: CO_REASON_COLORS[item.reason as COReasonCode]?.bg,
                      color: CO_REASON_COLORS[item.reason as COReasonCode]?.text,
                    }}
                  >
                    {CO_REASON_LABELS[item.reason as COReasonCode]}
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
              )}
              {/* Location pill */}
              {item.location_tag && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-accent text-[10px] font-medium text-muted-foreground">
                  <MapPin className="h-2.5 w-2.5" />
                  {item.location_tag}
                </span>
              )}
            </div>
          </div>
          {/* Right side: entry count + total */}
          <div className="shrink-0 text-right">
            {totalForRole > 0 && (
              <span className="text-sm font-bold text-foreground">${fmt(totalForRole)}</span>
            )}
            {entryCount > 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {entryCount} entr{entryCount === 1 ? 'y' : 'ies'}
              </p>
            )}
            {entryCount === 0 && canAddLabor && (
              <span className="text-[10px] font-medium text-primary">Needs pricing</span>
            )}
          </div>
        </div>

        {/* Latest entry preview */}
        {latestEntry && !historyOpen && (
          <div className="mt-2 ml-5 flex items-center justify-between text-[11px] text-muted-foreground bg-muted/30 rounded px-2.5 py-1.5">
            <span className="truncate">
              Latest: {latestEntry.entry_date} · {latestEntry.pricing_mode === 'lump_sum' ? 'lump sum' : `${latestEntry.hours ?? 0} hrs`}
              {latestEntry.description ? ` · ${latestEntry.description}` : ''}
            </span>
            <span className="font-medium text-foreground shrink-0 ml-2">${fmt(latestEntry.line_total ?? 0)}</span>
          </div>
        )}
      </div>

      {/* Auto-expanded form when no entries */}
      {autoExpand && (
        <div className="px-4 pb-3 pt-0 border-t border-border/30">
          <div className="bg-primary/[0.03] rounded-lg p-3 mt-2">
            <p className="text-xs font-medium text-primary mb-2">Add pricing for this item</p>
            <LaborEntryForm
              coId={coId}
              lineItemId={item.id}
              orgId={orgId}
              enteredByRole={enteredByRole}
              pricingType={pricingType}
              isTC={isTC}
              isFC={isFC}
              nteCap={nteCap}
              nteUsed={nteUsed}
              onSaved={onRefresh}
            />
          </div>
        </div>
      )}

      {/* Add more button when entries already exist */}
      {canAddLabor && !autoExpand && !showActualForm && (
        <Collapsible open={formOpen} onOpenChange={setFormOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                'w-full flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors border-t border-border/30',
                formOpen
                  ? 'bg-primary/[0.05] text-primary'
                  : 'text-primary hover:bg-primary/[0.03]'
              )}
            >
              <Plus className="h-3 w-3" />
              {formOpen ? 'Hide form' : 'Add pricing entry'}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-3 pt-1">
              <LaborEntryForm
                coId={coId}
                lineItemId={item.id}
                orgId={orgId}
                enteredByRole={enteredByRole}
                pricingType={pricingType}
                isTC={isTC}
                isFC={isFC}
                nteCap={nteCap}
                nteUsed={nteUsed}
                onSaved={onRefresh}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Actual cost form (toggle) */}
      {showActualForm && (
        <div className="px-4 pb-3">
          <LaborEntryForm
            coId={coId}
            lineItemId={item.id}
            orgId={orgId}
            enteredByRole={enteredByRole}
            pricingType={pricingType}
            isTC={isTC}
            isFC={isFC}
            isActualCost
            onSaved={() => { setShowActualForm(false); onRefresh(); }}
            onCancel={() => setShowActualForm(false)}
          />
        </div>
      )}

      {/* Actual cost toggle button */}
      {canAddLabor && !showActualForm && (isFC || isTC) && (
        <div className="px-4 pb-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground"
            onClick={() => setShowActualForm(true)}
          >
            <EyeOff className="h-3 w-3" />
            Log actual cost (private)
          </Button>
        </div>
      )}

      {/* Entry history — collapsible */}
      {(entryCount > 0 || tcDownstreamCosts.length > 0) && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground hover:bg-muted/20 transition-colors border-t border-border/50"
            >
              <ChevronDown className={cn('h-3 w-3 transition-transform', historyOpen && 'rotate-180')} />
              <span className="font-medium">
                {historyOpen ? 'Hide' : 'Show'} {entryCount} entr{entryCount === 1 ? 'y' : 'ies'} — ${fmt(totalForRole)}
                {tcDownstreamCosts.length > 0 && (
                  <span className="text-muted-foreground/70"> + {tcDownstreamCosts.length} FC entr{tcDownstreamCosts.length === 1 ? 'y' : 'ies'} — ${fmt(fcTotal)}</span>
                )}
              </span>
              {showGCApproval && (() => {
                const approved = visibleBillable.filter(e => (e as any).gc_approved).length;
                return approved > 0 ? <span className="text-emerald-600">· {approved} approved</span> : null;
              })()}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-3 space-y-1.5">
              {visibleBillable.map(entry => renderEntry(entry, showGCApproval))}

              {isTC && tcDownstreamCosts.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-border pt-2">
                  <div className="flex items-center justify-between text-xs font-medium px-3">
                    <span className="text-muted-foreground">FC cost to TC</span>
                    <span className="text-muted-foreground">${fmt(fcTotal)}</span>
                  </div>
                  {tcDownstreamCosts.map(entry => renderEntry(entry, false, true))}
                </div>
              )}

              {/* FC actual costs */}
              {isFC && actualCosts.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-border pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <EyeOff className="h-3 w-3" /> Actual costs — private
                  </div>
                  {actualCosts.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between text-xs px-3 py-1">
                      <span className="text-muted-foreground truncate">
                        {entry.entry_date} · {entry.description ?? 'Cost entry'}
                      </span>
                      <span className="font-medium text-foreground shrink-0 ml-2">${fmt(entry.line_total ?? 0)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-xs font-medium px-3">
                    <span className="text-muted-foreground">Actual total</span>
                    <span className="text-foreground">${fmt(actualTotal)}</span>
                  </div>
                  {fcTotal > 0 && actualTotal > 0 && (
                    <div className="flex items-center justify-between text-xs px-3">
                      <span className="text-muted-foreground">Margin</span>
                      <span className={cn('font-medium', fcTotal - actualTotal > 0 ? 'text-emerald-600' : 'text-destructive')}>
                        ${fmt(fcTotal - actualTotal)} ({((fcTotal - actualTotal) / fcTotal * 100).toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* TC actual costs */}
              {isTC && actualCosts.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-border pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <EyeOff className="h-3 w-3" /> Actual costs — private
                  </div>
                  {actualCosts.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between text-xs px-3 py-1">
                      <span className="text-muted-foreground truncate">
                        {entry.entry_date} · {entry.description ?? 'Cost entry'}
                      </span>
                      <span className="font-medium text-foreground shrink-0 ml-2">${fmt(entry.line_total ?? 0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
});

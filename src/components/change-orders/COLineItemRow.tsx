import { useState, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, CheckCircle, MapPin, Plus, Lock, TrendingUp, DollarSign, Trash2 } from 'lucide-react';
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
  index?: number;
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
  coId, orgId, pricingType, nteCap, nteUsed = 0,
  canAddLabor, onRefresh, isEven = true, index,
}, ref) {
  const [showActualForm, setShowActualForm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const billable = laborEntries.filter(e => !e.is_actual_cost);
  const myRole = isFC ? 'FC' : isTC ? 'TC' : null;
  const actualCosts = laborEntries.filter(e => e.is_actual_cost && e.entered_by_role === myRole);

  const fcBillable = billable.filter(e => e.entered_by_role === 'FC');
  const tcBillable = billable.filter(e => e.entered_by_role === 'TC');

  const fcTotal = fcBillable.reduce((s, e) => s + (e.line_total ?? 0), 0);
  const tcTotal = tcBillable.reduce((s, e) => s + (e.line_total ?? 0), 0);
  const actualTotal = actualCosts.reduce((s, e) => s + (e.line_total ?? 0), 0);

  const hideGCBreakdown = isGC && pricingType === 'fixed';
  const visibleBillable = hideGCBreakdown ? [] : isGC ? tcBillable : isFC ? fcBillable : tcBillable;
  const tcDownstreamCosts = isTC ? fcBillable : [];
  const totalForRole = hideGCBreakdown ? 0 : isGC ? tcTotal : isFC ? fcTotal : tcTotal;
  const entryCount = hideGCBreakdown ? billable.length : visibleBillable.length;

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
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3.5 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Numbered index */}
            {index !== undefined && (
              <div className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 mt-0.5" style={{ background: 'hsl(var(--amber)/0.15)', color: 'hsl(var(--amber-d))' }}>
                <span className="text-xs font-bold">{index}</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground leading-tight">{item.item_name}</p>
              {cleanDescription && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{cleanDescription}</p>
              )}
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                {item.category_name && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground font-medium">{item.category_name}</span>
                )}
                {item.unit && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground font-medium">{item.unit}</span>
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
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="shrink-0 text-right flex flex-col items-end gap-1.5">
            {/* Status chip */}
            {!isFC && (entryCount > 0 ? (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                Priced
              </span>
            ) : canAddLabor ? (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                Needs Pricing
              </span>
            ) : null)}

            {!isFC && totalForRole > 0 && (
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

            <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform mt-0.5', expanded && 'rotate-180')} />
          </div>
        </div>
      </button>

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
                <span className="w-20 text-right">Billable</span>
                {(isTC || isFC) && (
                  <span className="w-24 text-right flex items-center justify-end gap-1">
                    <Lock className="h-2.5 w-2.5" /> Int. Cost
                  </span>
                )}
                <span className="w-8" />
              </div>

              {/* Entry rows */}
              {visibleBillable.map(entry => {
                const gcApproved = (entry as any).gc_approved;
                const matchingActual = actualCosts.find(a => a.entry_date === entry.entry_date);

                return (
                  <div key={entry.id} className="flex items-center text-xs px-5 py-2.5 border-b border-border/30 hover:bg-accent/40">
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
                    <span className="w-20 text-right font-mono font-semibold text-foreground">${fmt(entry.line_total ?? 0)}</span>
                    {(isTC || isFC) && (
                      <span className="w-24 text-right">
                        {matchingActual ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                            <Lock className="h-2.5 w-2.5" /> ${fmt(matchingActual.line_total ?? 0)}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setShowActualForm(true); }}
                            className="text-muted-foreground/50 hover:text-muted-foreground text-[10px]"
                          >
                            + add cost
                          </button>
                        )}
                      </span>
                    )}
                    <span className="w-8" />
                  </div>
                );
              })}

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

          {/* Auto-expand form for empty items */}
          {autoExpand && (
            <div className="px-5 pb-4 pt-2">
              <LaborEntryForm
                coId={coId} lineItemId={item.id} orgId={orgId}
                enteredByRole={enteredByRole} pricingType={pricingType}
                isTC={isTC} isFC={isFC}
                nteCap={nteCap} nteUsed={nteUsed}
                onSaved={onRefresh}
              />
            </div>
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

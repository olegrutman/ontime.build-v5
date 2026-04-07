import { useState, useCallback, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, EyeOff, CheckCircle } from 'lucide-react';
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
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const COLineItemRow = forwardRef<HTMLDivElement, COLineItemRowProps>(function COLineItemRow({
  item, laborEntries, role, isGC, isTC, isFC,
  coId, orgId, pricingType, nteCap, nteUsed = 0,
  canAddLabor, onRefresh,
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
    <div ref={ref} className="border-b border-border last:border-b-0">
      {/* Item header */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{item.item_name}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground">
                {item.category_name}
                {item.division ? ` · ${item.division}` : ''}
                {item.unit ? ` · ${item.unit}` : ''}
              </p>
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
            {item.location_tag && (
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                📍 {item.location_tag}
              </p>
            )}
          </div>
          {totalForRole > 0 && (
            <span className="text-sm font-semibold text-foreground shrink-0 ml-3">${fmt(totalForRole)}</span>
          )}
        </div>
      </div>

      {/* Collapsible labor entry form */}
      {canAddLabor && !showActualForm && (
        <Collapsible open={formOpen} onOpenChange={setFormOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                'w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors border-t border-border/50',
                formOpen
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'bg-muted/30 text-primary hover:bg-muted/50'
              )}
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', formOpen && 'rotate-180')} />
              {formOpen ? 'Hide entry form' : '+ Add pricing entry'}
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
                {entryCount} entr{entryCount === 1 ? 'y' : 'ies'} logged — ${fmt(totalForRole)}
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

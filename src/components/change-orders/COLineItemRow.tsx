import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronUp, Plus, EyeOff, CheckCircle } from 'lucide-react';
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

export function COLineItemRow({
  item, laborEntries, role, isGC, isTC, isFC,
  coId, orgId, pricingType, nteCap, nteUsed = 0,
  canAddLabor, onRefresh,
}: COLineItemRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [showLaborForm, setShowLaborForm] = useState(false);
  const [showActualForm, setShowActualForm] = useState(false);

  const billable = laborEntries.filter(e => !e.is_actual_cost);
  const actualCosts = laborEntries.filter(e => e.is_actual_cost);

  const fcBillable = billable.filter(e => e.entered_by_role === 'FC');
  const tcBillable = billable.filter(e => e.entered_by_role === 'TC');

  const fcTotal = fcBillable.reduce((s, e) => s + (e.line_total ?? 0), 0);
  const tcTotal = tcBillable.reduce((s, e) => s + (e.line_total ?? 0), 0);
  const actualTotal = actualCosts.reduce((s, e) => s + (e.line_total ?? 0), 0);

  const visibleBillable = isGC ? tcBillable : isFC ? fcBillable : tcBillable;
  const tcDownstreamCosts = isTC ? fcBillable : [];
  const totalForRole = isGC ? tcTotal : isFC ? fcTotal : tcTotal;
  const hasEntries = visibleBillable.length > 0 || tcDownstreamCosts.length > 0;

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
        'flex items-center justify-between text-xs rounded px-2.5 py-1.5',
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
            <span className={cn(
              'shrink-0',
              gcApproved ? 'text-emerald-500' : 'text-muted-foreground/40',
            )}>
              <CheckCircle className="h-3 w-3" />
            </span>
          )}
          <span className="inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
            {entry.entered_by_role}
          </span>
          <span className={cn('truncate', muted ? 'text-muted-foreground' : 'text-muted-foreground')}>
            {entry.entry_date} ·{' '}
            {entry.pricing_mode === 'lump_sum'
              ? 'lump sum'
              : `${entry.hours ?? 0} hrs${
                  !isGC && entry.hourly_rate ? ` @ $${entry.hourly_rate}/hr` : ''
                }`}
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
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
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
          {!expanded && hasEntries && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {visibleBillable.length + tcDownstreamCosts.length} entr{(visibleBillable.length + tcDownstreamCosts.length) === 1 ? 'y' : 'ies'}
              {showGCApproval && (() => {
                const approved = visibleBillable.filter(e => (e as any).gc_approved).length;
                return approved > 0 ? ` · ${approved} approved` : '';
              })()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {totalForRole > 0 && (
            <span className="text-sm font-medium text-foreground">${fmt(totalForRole)}</span>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {visibleBillable.length === 0 && tcDownstreamCosts.length === 0 && !showLaborForm && !showActualForm && (
            <p className="text-xs text-muted-foreground py-1">No labor entries yet</p>
          )}

          {visibleBillable.map(entry => renderEntry(entry, showGCApproval))}

          {/* TC sees FC downstream costs */}
          {isTC && tcDownstreamCosts.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-border pt-2">
              <div className="flex items-center justify-between text-xs font-medium px-2.5">
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
                <div key={entry.id} className="flex items-center justify-between text-xs px-2.5 py-1">
                  <span className="text-muted-foreground truncate">
                    {entry.entry_date} · {entry.description ?? 'Cost entry'}
                  </span>
                  <span className="font-medium text-foreground shrink-0 ml-2">${fmt(entry.line_total ?? 0)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs font-medium px-2.5">
                <span className="text-muted-foreground">Actual total</span>
                <span className="text-foreground">${fmt(actualTotal)}</span>
              </div>
              {fcTotal > 0 && actualTotal > 0 && (
                <div className="flex items-center justify-between text-xs px-2.5">
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
                <div key={entry.id} className="flex items-center justify-between text-xs px-2.5 py-1">
                  <span className="text-muted-foreground truncate">
                    {entry.entry_date} · {entry.description ?? 'Cost entry'}
                  </span>
                  <span className="font-medium text-foreground shrink-0 ml-2">${fmt(entry.line_total ?? 0)}</span>
                </div>
              ))}
            </div>
          )}

          {canAddLabor && !showLaborForm && !showActualForm && (
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={e => { e.stopPropagation(); setShowLaborForm(true); }}
              >
                <Plus className="h-3 w-3" />
                {pricingType === 'fixed' ? 'Add pricing' : 'Log hours'}
              </Button>
              {(isFC || isTC) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-muted-foreground"
                  onClick={e => { e.stopPropagation(); setShowActualForm(true); }}
                >
                  <EyeOff className="h-3 w-3" />
                  Actual cost
                </Button>
              )}
            </div>
          )}

          {showLaborForm && (
            <div onClick={e => e.stopPropagation()}>
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
                onSaved={() => { setShowLaborForm(false); onRefresh(); }}
                onCancel={() => setShowLaborForm(false)}
              />
            </div>
          )}

          {showActualForm && (
            <div onClick={e => e.stopPropagation()}>
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
        </div>
      )}
    </div>
  );
}

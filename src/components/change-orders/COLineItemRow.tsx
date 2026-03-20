import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Plus, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LaborEntryForm } from './LaborEntryForm';
import type { COLineItem, COLaborEntry, COCreatedByRole } from '@/types/changeOrder';

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
  item,
  laborEntries,
  role,
  isGC,
  isTC,
  isFC,
  coId,
  orgId,
  pricingType,
  nteCap,
  nteUsed = 0,
  canAddLabor,
  onRefresh,
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

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{item.item_name}</p>
          <p className="text-xs text-muted-foreground">
            {item.category_name}
            {item.division ? ` · ${item.division}` : ''}
            {item.unit ? ` · ${item.unit}` : ''}
          </p>
          {(item as any).location_tag && (
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5">📍</span>
              {(item as any).location_tag}
            </p>
          )}
          {!expanded && hasEntries && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {visibleBillable.length + tcDownstreamCosts.length} entr{visibleBillable.length + tcDownstreamCosts.length === 1 ? 'y' : 'ies'}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {totalForRole > 0 && (
            <span className="text-sm font-medium text-foreground">
              ${fmt(totalForRole)}
            </span>
          )}
          {expanded
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {visibleBillable.length === 0 && tcDownstreamCosts.length === 0 && !showLaborForm && !showActualForm && (
            <p className="text-xs text-muted-foreground py-1">No labor entries yet</p>
          )}

          {visibleBillable.map(entry => (
            <div key={entry.id} className="flex items-center justify-between text-xs bg-muted/20 rounded px-2.5 py-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
                  {entry.entered_by_role}
                </span>
                <span className="text-muted-foreground truncate">
                  {entry.entry_date} ·{' '}
                  {entry.pricing_mode === 'lump_sum'
                    ? 'lump sum'
                    : `${entry.hours ?? 0} hrs${
                        !isGC && entry.hourly_rate
                          ? ` @ $${entry.hourly_rate}/hr`
                          : ''
                      }`}
                  {entry.description ? ` · ${entry.description}` : ''}
                </span>
              </div>
              <span className="font-medium text-foreground shrink-0 ml-2">
                ${fmt(entry.line_total ?? 0)}
              </span>
            </div>
          ))}

          {isTC && tcDownstreamCosts.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-border pt-2">
              <div className="flex items-center justify-between text-xs font-medium px-2.5">
                <span className="text-muted-foreground">FC cost to TC</span>
                <span className="text-muted-foreground">${fmt(fcTotal)}</span>
              </div>
              {tcDownstreamCosts.map(entry => (
                <div key={entry.id} className="flex items-center justify-between text-xs bg-muted/10 rounded px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
                      {entry.entered_by_role}
                    </span>
                    <span className="text-muted-foreground truncate">
                      {entry.entry_date} ·{' '}
                      {entry.pricing_mode === 'lump_sum'
                        ? 'lump sum'
                        : `${entry.hours ?? 0} hrs${entry.hourly_rate ? ` @ $${entry.hourly_rate}/hr` : ''}`}
                      {entry.description ? ` · ${entry.description}` : ''}
                    </span>
                  </div>
                  <span className="font-medium text-muted-foreground shrink-0 ml-2">
                    ${fmt(entry.line_total ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {isFC && actualCosts.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-border pt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <EyeOff className="h-3 w-3" />
                Actual costs — private
              </div>
              {actualCosts.map(entry => (
                <div key={entry.id} className="flex items-center justify-between text-xs px-2.5 py-1">
                  <span className="text-muted-foreground truncate">
                    {entry.entry_date} · {entry.description ?? 'Cost entry'}
                  </span>
                  <span className="font-medium text-foreground shrink-0 ml-2">
                    ${fmt(entry.line_total ?? 0)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs font-medium px-2.5">
                <span className="text-muted-foreground">Actual total</span>
                <span className="text-foreground">${fmt(actualTotal)}</span>
              </div>
              {fcTotal > 0 && actualTotal > 0 && (
                <div className="flex items-center justify-between text-xs px-2.5">
                  <span className="text-muted-foreground">Margin</span>
                  <span className={cn(
                    'font-medium',
                    fcTotal - actualTotal > 0 ? 'co-light-success-text' : 'text-destructive'
                  )}>
                    ${fmt(fcTotal - actualTotal)}{' '}
                    ({fcTotal > 0
                      ? (((fcTotal - actualTotal) / fcTotal) * 100).toFixed(1)
                      : '0.0'}%)
                  </span>
                </div>
              )}
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
              {isFC && (
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
                nteCap={nteCap}
                nteUsed={nteUsed}
                onSaved={() => {
                  setShowLaborForm(false);
                  onRefresh();
                }}
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
                isActualCost
                onSaved={() => {
                  setShowActualForm(false);
                  onRefresh();
                }}
                onCancel={() => setShowActualForm(false)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

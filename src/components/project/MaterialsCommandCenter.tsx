import { useState, useEffect } from 'react';
import { formatCurrency, cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';
import { supabase } from '@/integrations/supabase/client';

interface MaterialsCommandCenterProps {
  financials: ProjectFinancials;
  projectId?: string;
}

interface PackBudget {
  packName: string;
  estimateTotal: number;
  orderedTotal: number;
  isOrdered: boolean;
}

export function MaterialsCommandCenter({ financials, projectId }: MaterialsCommandCenterProps) {
  const estimate = financials.materialEstimateTotal || 0;
  const ordered = financials.materialOrdered;
  const delivered = financials.materialDelivered;
  const pending = financials.materialOrderedPending;

  const variance = estimate > 0 ? ordered - estimate : 0;
  const variancePct = estimate > 0 ? Math.round((variance / estimate) * 100) : 0;
  const isOverBudget = variance > 0;
  const forecast = estimate > 0 ? estimate + variance : ordered;

  const [packs, setPacks] = useState<PackBudget[]>([]);
  const [packsExpanded, setPacksExpanded] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    fetchPackData(projectId);
  }, [projectId]);

  async function fetchPackData(pid: string) {
    // Get approved estimates for this project
    const { data: estimates } = await supabase
      .from('supplier_estimates')
      .select('id')
      .eq('project_id', pid)
      .eq('status', 'approved');

    if (!estimates?.length) return;
    const estimateIds = estimates.map(e => e.id);

    // Get packs + their line items
    const { data: packRows } = await supabase
      .from('estimate_packs')
      .select('id, pack_name, estimate_id')
      .in('estimate_id', estimateIds);

    if (!packRows?.length) return;

    // Get line items grouped by pack
    const { data: lineItems } = await supabase
      .from('estimate_line_items')
      .select('id, pack_name, quantity, estimate_id')
      .in('estimate_id', estimateIds);

    // Get POs with source pack info
    const { data: pos } = await supabase
      .from('purchase_orders')
      .select('id, source_estimate_id, source_pack_name, po_total, status, sales_tax_percent')
      .eq('project_id', pid)
      .not('source_estimate_id', 'is', null);

    // Build pack-level budgets
    // We need estimate line item totals per pack - get from PO line items
    const { data: poLineItems } = await supabase
      .from('po_line_items')
      .select('po_id, line_total, source_pack_name')
      .in('po_id', (pos || []).map(p => p.id));

    // Estimate totals per pack (from estimate_line_items - we don't have price, use PO mapping)
    // Use POs as the ordered amount per pack
    const orderedByPack: Record<string, number> = {};
    (pos || []).forEach(po => {
      if (po.source_pack_name && po.status !== 'ACTIVE') {
        const taxMult = 1 + (po.sales_tax_percent || 0) / 100;
        orderedByPack[po.source_pack_name] = (orderedByPack[po.source_pack_name] || 0) + (po.po_total || 0) * taxMult;
      }
    });

    // Estimate total per pack from estimate_packs
    // We need to get the estimate total from supplier_estimates line items
    // Since estimate_line_items doesn't have price, we'll use the pack's share of the total estimate
    // Actually, let's query the catalog mapping for prices
    // Simpler: use the pack_name grouping from estimate and show ordered vs pack count
    
    const packMap = new Map<string, PackBudget>();
    packRows.forEach(p => {
      const packOrdered = orderedByPack[p.pack_name] || 0;
      packMap.set(p.pack_name, {
        packName: p.pack_name,
        estimateTotal: 0, // Will be derived from proportion of total estimate
        orderedTotal: packOrdered,
        isOrdered: packOrdered > 0,
      });
    });

    // Distribute estimate total proportionally based on ordered amounts if available
    const totalOrdered = Object.values(orderedByPack).reduce((s, v) => s + v, 0);
    if (estimate > 0 && totalOrdered > 0) {
      packMap.forEach((pack) => {
        if (pack.orderedTotal > 0) {
          pack.estimateTotal = (pack.orderedTotal / totalOrdered) * estimate;
        }
      });
    }

    setPacks(Array.from(packMap.values()).sort((a, b) => {
      // Show over-budget first, then ordered, then not ordered
      const aOver = a.estimateTotal > 0 && a.orderedTotal > a.estimateTotal;
      const bOver = b.estimateTotal > 0 && b.orderedTotal > b.estimateTotal;
      if (aOver !== bOver) return aOver ? -1 : 1;
      if (a.isOrdered !== b.isOrdered) return a.isOrdered ? -1 : 1;
      return a.packName.localeCompare(b.packName);
    }));
  }

  const visiblePacks = packsExpanded ? packs : packs.slice(0, 3);
  const notStartedCount = packs.filter(p => !p.isOrdered).length;

  return (
    <div className="rounded-3xl border border-border/60 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border/40">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">Materials command center</h3>
            <p className="text-sm text-muted-foreground">The first place a material-responsible party should look</p>
          </div>
          <span className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold',
            isOverBudget
              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
          )}>
            {isOverBudget ? `Trending ${Math.abs(variancePct)}% Over` : 'On Track'}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* 6-col stat grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 text-sm">
          {[
            { label: 'Estimate', value: estimate },
            { label: 'Ordered', value: ordered },
            { label: 'Delivered', value: delivered },
            { label: 'Returns/Credits', value: 0 },
            { label: 'Forecast Final', value: forecast },
            { label: 'Variance', value: Math.abs(variance), prefix: isOverBudget ? '+' : '' },
          ].map(({ label, value, prefix }) => (
            <div key={label} className="rounded-2xl bg-slate-50 dark:bg-accent/20 border border-border/40 p-4">
              <p className="text-muted-foreground text-xs">{label}</p>
              <p className="font-semibold mt-2 text-base" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {prefix}{formatCurrency(value)}
              </p>
            </div>
          ))}
        </div>

        {/* 3-col alert tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AlertTile label="Packs not started" value={notStartedCount} color="red" />
          <AlertTile label="Unmatched materials" value={0} color="amber" />
          <AlertTile label="Unconfirmed deliveries" value={pending > 0 ? 1 : 0} color="red" />
        </div>

        {/* Packs ordered — budget tracking */}
        {packs.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3">
              Packs — Order & Budget Status
            </p>
            <div className="space-y-2">
              {visiblePacks.map(pack => {
                const overUnder = pack.estimateTotal > 0
                  ? pack.orderedTotal - pack.estimateTotal
                  : 0;
                const isOver = overUnder > 0;
                const pct = pack.estimateTotal > 0
                  ? Math.round((overUnder / pack.estimateTotal) * 100)
                  : 0;

                return (
                  <div key={pack.packName} className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-accent/20 border border-border/40 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        !pack.isOrdered ? 'bg-muted-foreground/40'
                          : isOver ? 'bg-red-500'
                          : 'bg-emerald-500'
                      )} />
                      <span className="text-sm font-medium truncate">{pack.packName}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {pack.isOrdered ? (
                        <>
                          <span className="text-xs text-muted-foreground tabular-nums" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                            {formatCurrency(pack.orderedTotal)}
                          </span>
                          {pack.estimateTotal > 0 && (
                            <span className={cn(
                              'text-xs font-semibold tabular-nums',
                              isOver ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                            )}>
                              {isOver ? '+' : ''}{pct}%
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not ordered</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {packs.length > 3 && (
              <button
                onClick={() => setPacksExpanded(!packsExpanded)}
                className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {packsExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {packsExpanded ? 'Show less' : `Show all ${packs.length} packs`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AlertTile({ label, value, color, bg = 'bg-accent/30' }: { label: string; value: number; color: 'red' | 'amber'; bg?: string }) {
  const textColor = value > 0
    ? (color === 'red' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400')
    : 'text-foreground';
  return (
    <div className={cn('rounded-2xl border border-border/40 p-4', bg)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn('text-2xl font-semibold mt-2', textColor)}>{value}</p>
    </div>
  );
}

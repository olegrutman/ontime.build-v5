import { useState, useEffect } from 'react';
import { formatCurrency, cn } from '@/lib/utils';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';
import { supabase } from '@/integrations/supabase/client';
import { SurfaceCard, SurfaceCardHeader, SurfaceCardBody, SurfaceCardFooter } from '@/components/ui/surface-card';
import { StatusPill } from '@/components/ui/status-pill';
import { CollapseToggle } from '@/components/ui/collapse-toggle';

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
    const { data: estimates } = await supabase
      .from('supplier_estimates')
      .select('id')
      .eq('project_id', pid)
      .eq('status', 'approved');

    if (!estimates?.length) return;
    const estimateIds = estimates.map(e => e.id);

    const { data: packRows } = await supabase
      .from('estimate_packs')
      .select('id, pack_name, estimate_id')
      .in('estimate_id', estimateIds);

    if (!packRows?.length) return;

    const { data: pos } = await supabase
      .from('purchase_orders')
      .select('id, source_estimate_id, source_pack_name, po_total, status, sales_tax_percent')
      .eq('project_id', pid)
      .not('source_estimate_id', 'is', null);

    const orderedByPack: Record<string, number> = {};
    (pos || []).forEach(po => {
      if (po.source_pack_name && po.status !== 'ACTIVE') {
        const taxMult = 1 + (po.sales_tax_percent || 0) / 100;
        orderedByPack[po.source_pack_name] = (orderedByPack[po.source_pack_name] || 0) + (po.po_total || 0) * taxMult;
      }
    });

    const packMap = new Map<string, PackBudget>();
    packRows.forEach(p => {
      const packOrdered = orderedByPack[p.pack_name] || 0;
      packMap.set(p.pack_name, {
        packName: p.pack_name,
        estimateTotal: 0,
        orderedTotal: packOrdered,
        isOrdered: packOrdered > 0,
      });
    });

    const totalOrdered = Object.values(orderedByPack).reduce((s, v) => s + v, 0);
    if (estimate > 0 && totalOrdered > 0) {
      packMap.forEach((pack) => {
        if (pack.orderedTotal > 0) {
          pack.estimateTotal = (pack.orderedTotal / totalOrdered) * estimate;
        }
      });
    }

    setPacks(Array.from(packMap.values()).sort((a, b) => {
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
    <SurfaceCard>
      <SurfaceCardHeader
        title="Materials command center"
        subtitle="The first place a material-responsible party should look"
        action={
          <StatusPill variant={isOverBudget ? 'watch' : 'healthy'}>
            {isOverBudget ? `Trending ${Math.abs(variancePct)}% Over` : 'On Track'}
          </StatusPill>
        }
      />

      <SurfaceCardBody className="space-y-4">
        {/* 6-col stat grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 text-sm">
          {[
            { label: 'Estimate', value: estimate },
            { label: 'Ordered', value: ordered },
            { label: 'Delivered', value: delivered },
            { label: 'Returns/Credits', value: 0 },
            { label: 'Forecast Final', value: forecast },
            { label: 'Variance', value: Math.abs(variance), prefix: isOverBudget ? '+' : '' },
          ].map(({ label, value, prefix }) => (
            <div key={label} className="rounded-xl bg-slate-50 dark:bg-accent/20 border border-border/40 p-3">
              <p className="text-muted-foreground text-[0.7rem]">{label}</p>
              <p className="font-semibold mt-1.5 text-[0.85rem] tabular-nums" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {prefix}{formatCurrency(value)}
              </p>
            </div>
          ))}
        </div>

        {/* 3-col alert tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <AlertTile label="Packs not started" value={notStartedCount} color="red" />
          <AlertTile label="Unmatched materials" value={0} color="amber" />
          <AlertTile label="Unconfirmed deliveries" value={pending > 0 ? 1 : 0} color="red" />
        </div>

        {/* Packs ordered — budget tracking */}
        {packs.length > 0 && (
          <div>
            <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-medium mb-2">
              Packs — Order & Budget Status
            </p>
            <div className="space-y-1.5">
              {visiblePacks.map(pack => {
                const overUnder = pack.estimateTotal > 0
                  ? pack.orderedTotal - pack.estimateTotal
                  : 0;
                const isOver = overUnder > 0;
                const pct = pack.estimateTotal > 0
                  ? Math.round((overUnder / pack.estimateTotal) * 100)
                  : 0;

                return (
                  <div key={pack.packName} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-accent/20 border border-border/40 px-4 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        !pack.isOrdered ? 'bg-muted-foreground/40'
                          : isOver ? 'bg-red-500'
                          : 'bg-emerald-500'
                      )} />
                      <span className="text-[0.85rem] font-medium truncate">{pack.packName}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {pack.isOrdered ? (
                        <>
                          <span className="text-[0.75rem] text-muted-foreground tabular-nums" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                            {formatCurrency(pack.orderedTotal)}
                          </span>
                          {pack.estimateTotal > 0 && (
                            <span className={cn(
                              'text-[0.75rem] font-semibold tabular-nums',
                              isOver ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                            )}>
                              {isOver ? '+' : ''}{pct}%
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[0.75rem] text-muted-foreground">Not ordered</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {packs.length > 3 && (
              <div className="mt-2">
                <CollapseToggle
                  expanded={packsExpanded}
                  totalCount={packs.length}
                  onToggle={() => setPacksExpanded(!packsExpanded)}
                  className="w-auto px-0 justify-start"
                />
              </div>
            )}
          </div>
        )}
      </SurfaceCardBody>
    </SurfaceCard>
  );
}

function AlertTile({ label, value, color }: { label: string; value: number; color: 'red' | 'amber' }) {
  const textColor = value > 0
    ? (color === 'red' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400')
    : 'text-foreground';
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-accent/20 border border-border/40 p-3">
      <p className="text-[0.8rem] text-muted-foreground">{label}</p>
      <p className={cn('text-xl font-semibold mt-1.5', textColor)}>{value}</p>
    </div>
  );
}

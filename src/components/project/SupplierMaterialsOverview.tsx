import { useState } from 'react';
import { AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useSupplierMaterialsOverview } from '@/hooks/useSupplierMaterialsOverview';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ReferenceLine, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SupplierEstimateCatalog } from '@/components/dashboard/supplier/SupplierEstimateCatalog';
import type { EstimateRow } from '@/hooks/useSupplierDashboardData';

interface Props {
  projectId: string;
  supplierOrgId: string;
  onNavigate: (tab: string) => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function fmtPct(n: number, showSign = true) {
  const sign = showSign && n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

const chartConfig = {
  ordered: { label: 'Materials Ordered', color: 'hsl(var(--primary))' },
  delivered: { label: 'Materials Delivered (Net)', color: 'hsl(142 71% 45%)' },
  budget: { label: 'Budget (Estimate)', color: 'hsl(var(--muted-foreground))' },
};

export function SupplierMaterialsOverview({ projectId, supplierOrgId, onNavigate }: Props) {
  const data = useSupplierMaterialsOverview(projectId, supplierOrgId);
  const { data: estimateRows = [] } = useQuery<EstimateRow[]>({
    queryKey: ['supplier-estimate-rows', projectId, supplierOrgId],
    queryFn: async () => {
      const { data: estimates } = await supabase
        .from('supplier_estimates')
        .select('id, name, status, total_amount, supplier_estimate_items(pack_name)')
        .eq('project_id', projectId)
        .eq('supplier_org_id', supplierOrgId);

      if (!estimates?.length) return [];

      const estimateIds = estimates.map(e => e.id);
      const { data: pos } = await supabase
        .from('purchase_orders')
        .select('id, status, source_estimate_id, source_pack_name')
        .eq('project_id', projectId)
        .in('source_estimate_id', estimateIds);

      const orderedPacksByEst: Record<string, Set<string>> = {};
      const orderedAmountByEst: Record<string, number> = {};
      (pos || []).forEach(po => {
        if (po.source_estimate_id && po.status !== 'ACTIVE') {
          if (po.source_pack_name) {
            if (!orderedPacksByEst[po.source_estimate_id]) orderedPacksByEst[po.source_estimate_id] = new Set();
            orderedPacksByEst[po.source_estimate_id].add(po.source_pack_name);
          }
        }
      });

      // Get ordered amounts
      const activePOIds = (pos || []).filter(p => ['PRICED','ORDERED','DELIVERED'].includes(p.status)).map(p => p.id);
      if (activePOIds.length > 0) {
        const { data: lineItems } = await supabase
          .from('po_line_items')
          .select('po_id, line_total, source_estimate_item_id')
          .in('po_id', activePOIds)
          .not('source_estimate_item_id', 'is', null);
        (lineItems || []).forEach(li => {
          const po = (pos || []).find(p => p.id === li.po_id);
          if (po?.source_estimate_id) {
            orderedAmountByEst[po.source_estimate_id] = (orderedAmountByEst[po.source_estimate_id] || 0) + (li.line_total || 0);
          }
        });
      }

      const { data: project } = await supabase.from('projects').select('name').eq('id', projectId).maybeSingle();

      return estimates.map(est => {
        const items = (est.supplier_estimate_items as any[]) || [];
        const packNames = [...new Set(items.map(i => i.pack_name).filter(Boolean))] as string[];
        const orderedPacks = [...(orderedPacksByEst[est.id] || [])];
        const orderedAmt = orderedAmountByEst[est.id] || 0;
        return {
          id: est.id,
          name: est.name,
          projectName: project?.name || '',
          projectId,
          totalAmount: est.total_amount || 0,
          lineItemCount: items.length,
          packNames,
          orderedPackNames: orderedPacks,
          orderedAmount: orderedAmt,
          orderedPercent: packNames.length > 0 ? Math.round((orderedPacks.length / packNames.length) * 100) : 0,
          status: est.status,
        } as EstimateRow;
      });
    },
    enabled: !!projectId && !!supplierOrgId,
  });

  const [unmatchedView, setUnmatchedView] = useState<'ordered' | 'delivered'>('ordered');

  if (data.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const isOverBudget = data.forecastVariance > 0;
  const isCurrentlyOver = data.orderedVariance > 0;

  return (
    <div className="space-y-4">
      {/* SECTION 1 — Material Status Banner */}
      <div className={cn(
        'rounded-2xl p-5 shadow-sm',
        isOverBudget
          ? 'bg-amber-50 dark:bg-amber-950/30'
          : 'bg-green-50 dark:bg-green-950/30',
      )}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-start gap-3">
            {isOverBudget ? (
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className={cn(
                'text-lg font-bold',
                isOverBudget ? 'text-amber-900 dark:text-amber-200' : 'text-green-900 dark:text-green-200',
              )}>
                Projected {fmt(Math.abs(data.forecastVariance))} ({fmtPct(Math.abs(data.forecastVariancePct), false)}) {isOverBudget ? 'Over' : 'Under'} Budget
              </p>
              <p className={cn(
                'text-sm mt-1',
                isOverBudget ? 'text-amber-700 dark:text-amber-300' : 'text-green-700 dark:text-green-300',
              )}>
                Based on how the first {data.forecastOrderedPacks} packs were ordered, the project is trending {fmtPct(Math.abs(data.forecastVariancePct), false)} {isOverBudget ? 'over' : 'under'} budget.
                {data.forecastConfidence === 'low' && (
                  <span className="ml-1 font-medium">Forecast confidence is low — fewer than 3 packs ordered.</span>
                )}
              </p>
            </div>
          </div>
          <div className={cn(
            'text-right shrink-0 px-4 py-2 rounded-xl',
            isCurrentlyOver
              ? 'bg-amber-100/60 dark:bg-amber-900/20'
              : 'bg-green-100/60 dark:bg-green-900/20',
          )}>
            <p className={cn(
              'text-xs uppercase tracking-wide font-medium',
              isCurrentlyOver ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400',
            )}>
              Currently
            </p>
            <p className={cn(
              'text-sm font-bold',
              isCurrentlyOver ? 'text-amber-800 dark:text-amber-300' : 'text-green-800 dark:text-green-300',
            )}>
              {isCurrentlyOver ? '+' : ''}{fmt(data.orderedVariance)} ({fmtPct(data.orderedVariancePct)}) {isCurrentlyOver ? 'over budget' : 'under budget'}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2 — KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Budget */}
        <div className="bg-card rounded-2xl shadow-sm p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Budget (Estimate)</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{fmt(data.estimateTotal)}</p>
          {data.salesTaxPercent > 0 && (
            <p className="text-xs text-muted-foreground mt-1">Includes {data.salesTaxPercent}% tax</p>
          )}
        </div>

        {/* Materials Ordered */}
        <div className="bg-card rounded-2xl shadow-sm p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Materials Ordered</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{fmt(data.materialsOrdered)}</p>
          <div className="flex items-center gap-1 mt-1">
            {data.orderedVariance > 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-destructive" />
            ) : data.orderedVariance < 0 ? (
              <TrendingDown className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            ) : null}
            <span className={cn(
              'text-xs font-semibold',
              data.orderedVariance > 0 ? 'text-destructive' : data.orderedVariance < 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
            )}>
              {data.orderedVariance >= 0 ? '+' : ''}{fmt(data.orderedVariance)} ({fmtPct(data.orderedVariancePct)})
            </span>
          </div>
        </div>

        {/* Materials Delivered (Net) */}
        <div className="bg-card rounded-2xl shadow-sm p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Materials Delivered (Net)</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{fmt(data.deliveredNet)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Delivered {fmt(data.deliveredTotal)} – Credits {fmt(data.creditsTotal)}
          </p>
        </div>
      </div>


      {/* SECTION 4 & 5 — Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Materials Not in Estimate */}
        <div className="bg-card rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Materials Not in Estimate</h3>
            <div className="flex rounded-lg bg-muted p-0.5">
              <button
                onClick={() => setUnmatchedView('ordered')}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors',
                  unmatchedView === 'ordered' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Ordered
              </button>
              <button
                onClick={() => setUnmatchedView('delivered')}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors',
                  unmatchedView === 'delivered' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Delivered
              </button>
            </div>
          </div>
          {data.unmatchedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">All items match the estimate</p>
          ) : (
            <div className="overflow-auto max-h-64">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b">
                    <th className="text-left py-2 font-medium">Item</th>
                    <th className="text-right py-2 font-medium">{unmatchedView === 'ordered' ? 'Ordered Cost' : 'Delivered Cost'}</th>
                    <th className="text-right py-2 font-medium"># POs</th>
                    <th className="text-right py-2 font-medium">First Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {data.unmatchedItems.map((item, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-2 truncate max-w-[180px]">{item.description}</td>
                      <td className="py-2 text-right tabular-nums font-medium">
                        {fmt(unmatchedView === 'ordered' ? item.orderedCost : item.deliveredCost)}
                      </td>
                      <td className="py-2 text-right tabular-nums">{item.poCount}</td>
                      <td className="py-2 text-right text-muted-foreground text-xs">
                        {item.firstSeen ? format(new Date(item.firstSeen), 'MMM d') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Packs Over Budget */}
        <div className="bg-card rounded-2xl shadow-sm p-5">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">Packs Over Budget</h3>
          {data.packsOverBudget.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">All packs within budget</p>
          ) : (
            <div className="overflow-auto max-h-64">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b">
                    <th className="text-left py-2 font-medium">Pack</th>
                    <th className="text-right py-2 font-medium">Budget</th>
                    <th className="text-right py-2 font-medium">Ordered</th>
                    <th className="text-right py-2 font-medium">Over Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {data.packsOverBudget.map((pack, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-2 truncate max-w-[140px]">{pack.packName}</td>
                      <td className="py-2 text-right tabular-nums">{fmt(pack.estimateTotal)}</td>
                      <td className="py-2 text-right tabular-nums">{fmt(pack.orderedTotal)}</td>
                      <td className="py-2 text-right tabular-nums font-semibold text-destructive">
                        +{fmt(pack.overBudget)} (+{pack.overBudgetPct.toFixed(0)}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 6 — Risk Factors */}
      <div className="bg-card rounded-2xl shadow-sm p-5">
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">Risk Factors</h3>
        <div className="space-y-2.5">
          {data.riskFactors.unpricedItems > 0 && (
            <div className="flex items-center gap-2.5 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <span>
                <strong>{data.riskFactors.unpricedItems}</strong> unpriced items pending across <strong>{data.riskFactors.unpricedPOs}</strong> POs
              </span>
            </div>
          )}
          {data.riskFactors.packsNotStarted > 0 && (
            <div className="flex items-center gap-2.5 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <span>
                <strong>{data.riskFactors.packsNotStarted}</strong> of {data.riskFactors.totalPacks} packs not started
              </span>
            </div>
          )}
          {data.riskFactors.biggestUpcomingPack && (
            <div className="flex items-center gap-2.5 text-sm">
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>
                Biggest upcoming pack: <strong>{data.riskFactors.biggestUpcomingPack.name}</strong> ({fmt(data.riskFactors.biggestUpcomingPack.amount)})
              </span>
            </div>
          )}
          {data.riskFactors.unpricedItems === 0 && data.riskFactors.packsNotStarted === 0 && !data.riskFactors.biggestUpcomingPack && (
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              <span>No outstanding risk factors</span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 7 — Estimates → Orders */}
      {estimateRows.length > 0 && (
        <SupplierEstimateCatalog estimates={estimateRows} />
      )}
    </div>
  );
}

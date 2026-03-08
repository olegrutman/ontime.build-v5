import { useState } from 'react';
import { Package, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSupplierMaterialsOverview } from '@/hooks/useSupplierMaterialsOverview';
import { MaterialsBudgetDrawer } from './MaterialsBudgetDrawer';
import { cn, formatCurrency as fmt } from '@/lib/utils';
import type { ProjectFinancials } from '@/hooks/useProjectFinancials';

function pctLabel(value: number, base: number): string {
  if (base <= 0) return '';
  const pct = ((value - base) / base) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

interface Props {
  projectId: string;
  supplierOrgId: string;
  financials: ProjectFinancials;
}

export function MaterialsBudgetStatusCard({ projectId, supplierOrgId, financials }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const data = useSupplierMaterialsOverview(projectId, supplierOrgId);

  const { isTCMaterialResponsible, isGCMaterialResponsible } = financials;
  const isResponsible = isTCMaterialResponsible || isGCMaterialResponsible;

  // Not responsible — show minimal line
  if (!isResponsible) {
    const responsibleParty = financials.viewerRole === 'General Contractor'
      ? 'Trade Contractor'
      : 'General Contractor';
    return (
      <div className="bg-card rounded-2xl shadow-sm p-4">
        <p className="text-sm text-muted-foreground">
          Materials controlled by the {responsibleParty}
        </p>
      </div>
    );
  }

  if (data.loading) return null;

  const { estimateTotal, materialsOrdered, deliveredNet, forecastFinal, forecastVariancePct, packsOverBudget, unmatchedItems } = data;

  // Status
  const variancePct = estimateTotal > 0 ? ((forecastFinal - estimateTotal) / estimateTotal) * 100 : 0;
  const statusLabel = variancePct <= 0 ? 'On Budget' : variancePct <= 5 ? 'Trending Over Budget' : 'Trending Over Budget';
  const statusColor = variancePct <= 0
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    : variancePct <= 5
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';

  // Micro-highlight: largest driver
  const topPack = packsOverBudget[0];
  const totalUnmatched = unmatchedItems.reduce((s, i) => s + i.orderedCost, 0);
  let microHighlight = '';
  if (topPack && topPack.overBudget >= totalUnmatched) {
    microHighlight = `Top driver: ${topPack.packName} +${fmt(topPack.overBudget)}`;
  } else if (totalUnmatched > 0) {
    microHighlight = `Not in estimate: +${fmt(totalUnmatched)}`;
  }

  return (
    <>
      <button
        onClick={() => setDrawerOpen(true)}
        className="w-full text-left bg-card rounded-2xl shadow-sm p-5 space-y-2.5 hover:bg-accent/30 transition-colors group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Materials Budget Status</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </div>

        <div className="space-y-1.5">
          <Row label="Budget (Estimate)" value={fmt(estimateTotal)} />
          <Row label="Materials Ordered" value={fmt(materialsOrdered)} sub={pctLabel(materialsOrdered, estimateTotal)} over={materialsOrdered > estimateTotal} />
          <Row label="Materials Delivered (Net)" value={fmt(deliveredNet)} sub={pctLabel(deliveredNet, estimateTotal)} over={deliveredNet > estimateTotal} />
          <Row label="Projected Final Cost" value={fmt(forecastFinal)} sub={pctLabel(forecastFinal, estimateTotal)} over={forecastFinal > estimateTotal} />
        </div>

        <div className="flex items-center justify-between pt-1 border-t">
          <Badge className={cn('text-xs font-medium border-0', statusColor)}>
            {statusLabel}
          </Badge>
          {microHighlight && (
            <span className="text-xs text-muted-foreground">{microHighlight}</span>
          )}
        </div>
      </button>

      <MaterialsBudgetDrawer open={drawerOpen} onOpenChange={setDrawerOpen} data={data} />
    </>
  );
}

function Row({ label, value, sub, over }: { label: string; value: string; sub?: string; over?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {sub && (
          <span className={cn("text-xs font-medium w-14 text-right", over ? 'text-destructive' : 'text-green-600 dark:text-green-400')}>
            {sub}
          </span>
        )}
        <span className="text-sm font-semibold tabular-nums text-right min-w-[90px]">{value}</span>
      </div>
    </div>
  );
}

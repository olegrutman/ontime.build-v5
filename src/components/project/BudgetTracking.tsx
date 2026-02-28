import { useState } from 'react';
import { ChevronDown, Package, Users, Pencil, Check, X, TrendingUp, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';
import { cn } from '@/lib/utils';

function fmt(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 1, notation: 'compact' }).format(amount);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

function pct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

interface BudgetTrackingProps {
  financials: ProjectFinancials;
  projectId: string;
}

export function BudgetTracking({ financials, projectId }: BudgetTrackingProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(true);

  const {
    loading, viewerRole,
    materialEstimate, materialDelivered, materialOrderedPending,
    isTCMaterialResponsible, isGCMaterialResponsible,
    materialEstimateTotal, approvedEstimateSum, isDesignatedSupplier,
    upstreamContract, updateMaterialEstimate,
    laborBudget, actualLaborCost, updateLaborBudget,
  } = financials;

  if (loading) return null;

  // Material budget visible to responsible party or designated supplier
  const showMaterial =
    (viewerRole === 'Trade Contractor' && isTCMaterialResponsible) ||
    (viewerRole === 'General Contractor' && isGCMaterialResponsible) ||
    (viewerRole === 'Supplier' && isDesignatedSupplier);

  // Labor budget visible to GC and TC
  const showLabor = viewerRole === 'General Contractor' || viewerRole === 'Trade Contractor';

  if (!showMaterial && !showLabor) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border bg-card">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
              Budget Tracking
            </span>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3">
            <div className={cn("grid gap-3", showMaterial && showLabor ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-md")}>
              {showMaterial && (
                <MaterialBudgetCard
                  materialEstimate={materialEstimate}
                  materialDelivered={materialDelivered}
                  materialOrderedPending={materialOrderedPending}
                  materialEstimateTotal={materialEstimateTotal}
                  approvedEstimateSum={approvedEstimateSum}
                  upstreamContract={upstreamContract}
                  updateMaterialEstimate={updateMaterialEstimate}
                />
              )}
              {showLabor && (
                <LaborBudgetCard
                  laborBudget={laborBudget}
                  actualLaborCost={actualLaborCost}
                  upstreamContract={upstreamContract}
                  updateLaborBudget={updateLaborBudget}
                />
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Material Budget sub-card
function MaterialBudgetCard({ materialEstimate, materialDelivered, materialOrderedPending, materialEstimateTotal, approvedEstimateSum, upstreamContract, updateMaterialEstimate }: {
  materialEstimate: number;
  materialDelivered: number;
  materialOrderedPending: number;
  materialEstimateTotal: number | null;
  approvedEstimateSum: number;
  upstreamContract: any;
  updateMaterialEstimate: (contractId: string, amount: number) => Promise<boolean>;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!upstreamContract) return;
    setSaving(true);
    const ok = await updateMaterialEstimate(upstreamContract.id, editValue);
    setSaving(false);
    if (ok) { toast({ title: 'Material budget updated' }); setEditing(false); }
    else toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
  };

  if (editing) {
    return (
      <div className="border bg-accent/20 rounded p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase">Set Material Budget</p>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="relative flex-1 min-w-[100px]">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input type="number" min="0" step="1000" className="pl-6 h-8 text-sm" value={editValue || ''} onChange={e => setEditValue(parseFloat(e.target.value) || 0)} autoFocus />
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-8"><Check className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving} className="h-8"><X className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    );
  }

  const budgetValue = materialEstimateTotal ?? approvedEstimateSum;
  const hasBudget = materialEstimate > 0;

  if (!hasBudget && budgetValue <= 0) {
    return (
      <div className="border bg-accent/20 rounded p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Package className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium uppercase text-muted-foreground">Material Budget</span>
        </div>
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { setEditValue(0); setEditing(true); }}>
          Set Material Budget
        </Button>
      </div>
    );
  }

  const remaining = materialEstimate - materialDelivered;
  const isOver = materialDelivered > materialEstimate;
  const diffDollar = Math.abs(remaining);
  const diffPct = materialEstimate > 0 ? (diffDollar / materialEstimate) * 100 : 0;

  const totalCommitted = materialDelivered + materialOrderedPending;
  const projectedOver = totalCommitted > materialEstimate;
  const projectedDiff = totalCommitted - materialEstimate;
  const projectedPctDiff = materialEstimate > 0 ? (projectedDiff / materialEstimate) * 100 : 0;

  return (
    <div className="border bg-accent/20 rounded p-3 space-y-1.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Package className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium uppercase text-muted-foreground">Material Budget</span>
      </div>

      <div className="group flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Budget</span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold tabular-nums">{fmt(materialEstimate)}</span>
          <button onClick={() => { setEditValue(materialEstimate); setEditing(true); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded">
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Delivered</span>
        <span className="text-sm font-semibold tabular-nums">{fmt(materialDelivered)}</span>
      </div>
      {materialOrderedPending > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Ordered (pending)</span>
          <span className="text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400">{fmt(materialOrderedPending)}</span>
        </div>
      )}
      <div className="border-t pt-1.5 flex items-center justify-between">
        <span className="text-xs font-medium">Remaining</span>
        <span className={cn("text-lg font-bold tabular-nums", isOver ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')}>
          {isOver ? `-${fmt(diffDollar)}` : fmt(remaining)}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {isOver ? <TrendingUp className="h-3.5 w-3.5 text-red-500" /> : <TrendingDown className="h-3.5 w-3.5 text-green-500" />}
        <span className={cn("text-[11px] font-medium", isOver ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')}>
          {isOver ? `Over: ${fmt(diffDollar)} (${pct(diffPct)})` : `Under: ${fmt(diffDollar)} (${diffPct.toFixed(1)}% left)`}
        </span>
      </div>

      {materialOrderedPending > 0 && projectedOver && (
        <p className="text-[11px] text-red-600 dark:text-red-400 italic">
          Projected overage: {fmt(projectedDiff)} ({pct(projectedPctDiff)})
        </p>
      )}
    </div>
  );
}

// Labor Budget sub-card
function LaborBudgetCard({ laborBudget, actualLaborCost, upstreamContract, updateLaborBudget }: {
  laborBudget: number | null;
  actualLaborCost: number;
  upstreamContract: any;
  updateLaborBudget: (contractId: string, amount: number) => Promise<boolean>;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!upstreamContract) return;
    setSaving(true);
    const ok = await updateLaborBudget(upstreamContract.id, editValue);
    setSaving(false);
    if (ok) { toast({ title: 'Labor budget updated' }); setEditing(false); }
    else toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
  };

  if (editing) {
    return (
      <div className="border bg-accent/20 rounded p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase">Set Labor Budget</p>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="relative flex-1 min-w-[100px]">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input type="number" min="0" step="1000" className="pl-6 h-8 text-sm" value={editValue || ''} onChange={e => setEditValue(parseFloat(e.target.value) || 0)} autoFocus />
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-8"><Check className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving} className="h-8"><X className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    );
  }

  const hasBudget = laborBudget != null && laborBudget > 0;
  const variance = hasBudget ? laborBudget - actualLaborCost : 0;
  const pctUsed = hasBudget ? (actualLaborCost / laborBudget) * 100 : 0;
  const isOver = hasBudget && actualLaborCost > laborBudget;

  return (
    <div className="border bg-accent/20 rounded p-3 space-y-1.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium uppercase text-muted-foreground">Labor Budget</span>
      </div>

      <div className="group flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Budget</span>
        <div className="flex items-center gap-1">
          <span className={cn("text-sm font-semibold tabular-nums", !hasBudget && 'text-amber-600 dark:text-amber-400')}>
            {hasBudget ? fmt(laborBudget) : 'Not set'}
          </span>
          <button onClick={() => { setEditValue(laborBudget || 0); setEditing(true); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded">
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Actual</span>
        <span className="text-sm font-semibold tabular-nums">{fmt(actualLaborCost)}</span>
      </div>

      {hasBudget && (
        <>
          <div className="border-t pt-1.5 flex items-center justify-between">
            <span className="text-xs font-medium">Variance</span>
            <span className={cn("text-lg font-bold tabular-nums", isOver ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')}>
              {isOver ? `-${fmt(Math.abs(variance))}` : fmt(variance)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">% Used</span>
            <span className={cn("text-xs font-semibold", pctUsed > 100 ? 'text-red-600 dark:text-red-400' : pctUsed > 80 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400')}>
              {pctUsed.toFixed(1)}%
            </span>
          </div>
        </>
      )}
    </div>
  );
}

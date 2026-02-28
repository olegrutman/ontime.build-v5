import { useState } from 'react';
import { Package, Users, Pencil, Check, X, TrendingUp, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  onNavigate?: (tab: string) => void;
}

export function BudgetTracking({ financials, projectId, onNavigate }: BudgetTrackingProps) {
  const {
    loading, viewerRole,
    materialEstimate, materialDelivered, materialOrderedPending,
    materialEstimateTotal, approvedEstimateSum, isDesignatedSupplier,
    upstreamContract, updateMaterialEstimate,
    laborBudget, actualLaborCost, updateLaborBudget,
    isTCMaterialResponsible, isGCMaterialResponsible,
  } = financials;

  if (loading) return null;

  const showMaterial =
    (viewerRole === 'Trade Contractor' && isTCMaterialResponsible) ||
    (viewerRole === 'General Contractor' && isGCMaterialResponsible) ||
    (viewerRole === 'Supplier' && isDesignatedSupplier);

  const showLabor = viewerRole === 'General Contractor' || viewerRole === 'Field Crew';

  if (!showMaterial && !showLabor) return null;

  return (
    <div className={cn("grid gap-4", showMaterial && showLabor ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
      {showMaterial && (
        <MaterialBudgetCard
          materialEstimate={materialEstimate}
          materialDelivered={materialDelivered}
          materialOrderedPending={materialOrderedPending}
          materialEstimateTotal={materialEstimateTotal}
          approvedEstimateSum={approvedEstimateSum}
          upstreamContract={upstreamContract}
          updateMaterialEstimate={updateMaterialEstimate}
          onNavigate={onNavigate}
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
  );
}

function MaterialBudgetCard({ materialEstimate, materialDelivered, materialOrderedPending, materialEstimateTotal, approvedEstimateSum, upstreamContract, updateMaterialEstimate, onNavigate }: {
  materialEstimate: number;
  materialDelivered: number;
  materialOrderedPending: number;
  materialEstimateTotal: number | null;
  approvedEstimateSum: number;
  upstreamContract: any;
  updateMaterialEstimate: (contractId: string, amount: number) => Promise<boolean>;
  onNavigate?: (tab: string) => void;
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
      <div className="bg-white dark:bg-card rounded-2xl shadow-sm p-5 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Set Material Budget</p>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="relative flex-1 min-w-[100px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input type="number" min="0" step="1000" className="pl-7 h-9 text-sm" value={editValue || ''} onChange={e => setEditValue(parseFloat(e.target.value) || 0)} autoFocus />
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-9"><Check className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving} className="h-9"><X className="h-4 w-4" /></Button>
        </div>
      </div>
    );
  }

  const hasBudget = materialEstimate > 0;

  if (!hasBudget && (materialEstimateTotal ?? approvedEstimateSum) <= 0) {
    return (
      <div className="bg-white dark:bg-card rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-1.5 mb-3">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Material Budget</span>
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
    <div className="bg-white dark:bg-card rounded-2xl shadow-sm p-5 space-y-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Package className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Material Budget Control</span>
      </div>

      <div className="group flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Estimated Materials</span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold tabular-nums">{fmt(materialEstimate)}</span>
          <button onClick={() => { setEditValue(materialEstimate); setEditing(true); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded">
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Delivered POs</span>
        <span className="text-sm font-semibold tabular-nums">{fmt(materialDelivered)}</span>
      </div>
      {materialOrderedPending > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Ordered (pending)</span>
          <span className="text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400">{fmt(materialOrderedPending)}</span>
        </div>
      )}

      <div className="border-t pt-2.5 flex items-center justify-between">
        <span className="text-sm font-medium">Variance</span>
        <span className={cn("text-lg font-bold tabular-nums", isOver ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')}>
          {isOver ? `-${fmt(diffDollar)}` : `+${fmt(remaining)}`}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {isOver ? <TrendingUp className="h-3.5 w-3.5 text-red-500" /> : <TrendingDown className="h-3.5 w-3.5 text-green-500" />}
        <span className={cn("text-xs font-medium", isOver ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')}>
          {isOver ? `Over budget by ${pct(diffPct)}` : `${diffPct.toFixed(1)}% under budget`}
        </span>
      </div>

      {materialOrderedPending > 0 && projectedOver && (
        <p className="text-xs text-amber-600 dark:text-amber-400 italic">
          ⚠ Projected overage: {fmt(projectedDiff)} ({pct(projectedPctDiff)})
        </p>
      )}

      {onNavigate && (
        <button onClick={() => onNavigate('purchase-orders')} className="text-xs text-primary hover:underline mt-1">
          View Delivered PO Breakdown →
        </button>
      )}
    </div>
  );
}

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
      <div className="bg-white dark:bg-card rounded-2xl shadow-sm p-5 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Set Labor Budget</p>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="relative flex-1 min-w-[100px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input type="number" min="0" step="1000" className="pl-7 h-9 text-sm" value={editValue || ''} onChange={e => setEditValue(parseFloat(e.target.value) || 0)} autoFocus />
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-9"><Check className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving} className="h-9"><X className="h-4 w-4" /></Button>
        </div>
      </div>
    );
  }

  const hasBudget = laborBudget != null && laborBudget > 0;
  const variance = hasBudget ? laborBudget - actualLaborCost : 0;
  const pctUsed = hasBudget ? (actualLaborCost / laborBudget) * 100 : 0;
  const isOver = hasBudget && actualLaborCost > laborBudget;

  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-sm p-5 space-y-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Labor Budget</span>
      </div>

      <div className="group flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Budget</span>
        <div className="flex items-center gap-1.5">
          <span className={cn("text-sm font-semibold tabular-nums", !hasBudget && 'text-amber-600 dark:text-amber-400')}>
            {hasBudget ? fmt(laborBudget) : 'Not set'}
          </span>
          <button onClick={() => { setEditValue(laborBudget || 0); setEditing(true); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded">
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Actual</span>
        <span className="text-sm font-semibold tabular-nums">{fmt(actualLaborCost)}</span>
      </div>

      {hasBudget && (
        <>
          <div className="border-t pt-2.5 flex items-center justify-between">
            <span className="text-sm font-medium">Remaining</span>
            <span className={cn("text-lg font-bold tabular-nums", isOver ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')}>
              {isOver ? `-${fmt(Math.abs(variance))}` : fmt(variance)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">% Used</span>
            <span className={cn("text-xs font-semibold", pctUsed > 100 ? 'text-red-600 dark:text-red-400' : pctUsed > 80 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400')}>
              {pctUsed.toFixed(1)}%
            </span>
          </div>
        </>
      )}
    </div>
  );
}

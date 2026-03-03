import { useState } from 'react';
import { Users, Pencil, Check, X } from 'lucide-react';
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

interface BudgetTrackingProps {
  financials: ProjectFinancials;
  projectId: string;
  onNavigate?: (tab: string) => void;
}

export function BudgetTracking({ financials, projectId, onNavigate }: BudgetTrackingProps) {
  const { loading, viewerRole, laborBudget, actualLaborCost, upstreamContract, downstreamContract, updateLaborBudget } = financials;

  if (loading) return null;

  const showLabor = viewerRole === 'Field Crew';

  if (!showLabor) return null;

  // FC updates labor budget on TC↔FC contract; GC on GC↔TC contract
  const budgetContract = viewerRole === 'Field Crew' ? downstreamContract : upstreamContract;

  return (
    <LaborBudgetCard
      laborBudget={laborBudget}
      actualLaborCost={actualLaborCost}
      upstreamContract={budgetContract}
      updateLaborBudget={updateLaborBudget}
    />
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
      <div className="bg-card rounded-2xl shadow-sm p-5 space-y-3">
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
    <div className="bg-card rounded-2xl shadow-sm p-5 space-y-2.5">
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
            <span className={cn("text-lg font-bold tabular-nums", isOver ? 'text-destructive' : 'text-green-600 dark:text-green-400')}>
              {isOver ? `-${fmt(Math.abs(variance))}` : fmt(variance)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">% Used</span>
            <span className={cn("text-xs font-semibold", pctUsed > 100 ? 'text-destructive' : pctUsed > 80 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400')}>
              {pctUsed.toFixed(1)}%
            </span>
          </div>
        </>
      )}
    </div>
  );
}

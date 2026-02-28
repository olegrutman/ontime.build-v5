import { useState } from 'react';
import { Users, Pencil, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';

function fmt(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

interface LaborBudgetTileProps {
  financials: ProjectFinancials;
  projectId: string;
}

export function LaborBudgetTile({ financials }: LaborBudgetTileProps) {
  const { toast } = useToast();
  const {
    viewerRole, laborBudget, actualLaborCost, upstreamContract, updateLaborBudget,
  } = financials;

  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(0);
  const [saving, setSaving] = useState(false);

  if (viewerRole !== 'General Contractor' && viewerRole !== 'Trade Contractor') return null;

  const handleStartEdit = () => {
    setEditValue(laborBudget || 0);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!upstreamContract) return;
    setSaving(true);
    const ok = await updateLaborBudget(upstreamContract.id, editValue);
    setSaving(false);
    if (ok) {
      toast({ title: 'Labor budget updated' });
      setEditing(false);
    } else {
      toast({ title: 'Error', description: 'Failed to update labor budget', variant: 'destructive' });
    }
  };

  if (editing) {
    return (
      <div className="border bg-card p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase">Set Labor Budget</p>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="relative flex-1 min-w-[120px]">
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
    <div className="border bg-card p-3 space-y-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
          Labor Budget
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="group flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Budgeted Labor</span>
          <div className="flex items-center gap-1">
            <span className={`text-sm font-semibold tabular-nums ${!hasBudget ? 'text-amber-600 dark:text-amber-400' : ''}`}>
              {hasBudget ? fmt(laborBudget) : 'Not set'}
            </span>
            <button onClick={handleStartEdit} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded">
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Actual Labor Cost</span>
          <span className="text-sm font-semibold tabular-nums">{fmt(actualLaborCost)}</span>
        </div>

        {hasBudget && (
          <>
            <div className="border-t pt-1.5 flex items-center justify-between">
              <span className="text-xs font-medium">Variance</span>
              <span className={`text-lg font-bold tabular-nums ${isOver ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {isOver ? `-${fmt(Math.abs(variance))}` : fmt(variance)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">% Used</span>
              <span className={`text-xs font-semibold ${pctUsed > 100 ? 'text-red-600 dark:text-red-400' : pctUsed > 80 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                {pctUsed.toFixed(1)}%
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

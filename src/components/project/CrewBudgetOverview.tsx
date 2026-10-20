import { useState } from 'react';
import { Pencil, Plus, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CREW_BUDGET_GROUPS, crewBudgetComparison, type CrewBudget } from '@/lib/crewTracker';
import type { useCrewTracker } from '@/hooks/useCrewTracker';
import { formatCurrency } from '@/lib/utils';

export function CrewBudgetOverview({ tracker, onNavigate }: { tracker: ReturnType<typeof useCrewTracker>; onNavigate: (tab: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string,string>>({});
  const comparison = crewBudgetComparison(tracker.entries, tracker.budget);
  if (tracker.loading) return <p role="status" className="py-4 text-muted-foreground">Loading spending and budget…</p>;
  if (tracker.error) return <p role="alert" className="text-destructive">Could not load spending and budget: {tracker.error.message}</p>;
  if (!tracker.orgId) return null;
  const startEditing = () => {
    setDraft(Object.fromEntries(CREW_BUDGET_GROUPS.map(g=>[g.key,String(tracker.budget[g.key])])));
    setEditing(true);
  };
  return <section aria-label="Crew budget and spending" className="min-w-0 space-y-4 border-y py-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><h2 className="font-heading text-2xl font-semibold">Your budget & spending</h2><p className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0"/>Private to your crew company</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={startEditing}><Pencil className="h-4 w-4"/>{tracker.hasBudget?'Edit budget':'Set budget'}</Button><Button onClick={()=>onNavigate('crew-tracker')}><Plus className="h-4 w-4"/>Log spending</Button></div>
    </div>
    {editing && <form className="space-y-3 border-b pb-4" onSubmit={async e=>{
      e.preventDefault();
      const values = Object.fromEntries(CREW_BUDGET_GROUPS.map(g=>[g.key,Number(draft[g.key]||0)])) as CrewBudget;
      try { await tracker.saveBudget.mutateAsync(values); setEditing(false); } catch { /* Preserve edits on failure. */ }
    }}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{CREW_BUDGET_GROUPS.map(g=><div key={g.key} className="min-w-0 space-y-1"><Label htmlFor={`crew-budget-${g.key}`}>{g.label}</Label><Input id={`crew-budget-${g.key}`} type="number" inputMode="decimal" min="0" step="0.01" required value={draft[g.key]??''} onChange={e=>setDraft({...draft,[g.key]:e.target.value})}/></div>)}</div>
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={tracker.saveBudget.isPending}>Save budget</Button><Button type="button" variant="ghost" onClick={()=>setEditing(false)}>Cancel</Button></div>
    </form>}
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">{[
      ['Total budget',tracker.hasBudget?formatCurrency(comparison.totalBudget):'Not set'],
      ['Actual spending',formatCurrency(comparison.totalActual)],
      [comparison.remaining<0?'Over budget':'Budget remaining',tracker.hasBudget?formatCurrency(Math.abs(comparison.remaining)):'Not set'],
    ].map(([label,value])=><div key={label} className="min-w-0"><dt className="text-sm text-muted-foreground">{label}</dt><dd className={`break-words font-mono text-2xl font-semibold ${label==='Over budget'?'text-destructive':''}`}>{value}</dd></div>)}</dl>
    <div className="divide-y">{CREW_BUDGET_GROUPS.map(g=><div key={g.key} className="grid min-w-0 grid-cols-1 gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"><h3 className="break-words font-medium">{g.label}</h3><dl className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:grid-cols-3">{[
      ['Budget',tracker.hasBudget?formatCurrency(tracker.budget[g.key]):'Not set'],
      ['Spent',formatCurrency(comparison.actual[g.key])],
      ['Remaining',tracker.hasBudget?formatCurrency(tracker.budget[g.key]-comparison.actual[g.key]):'Not set'],
    ].map(([label,value])=><div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words font-mono text-sm">{value}</dd></div>)}</dl></div>)}</div>
  </section>;
}
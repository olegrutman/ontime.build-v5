import { useState } from 'react';
import { HardHat, Package, Wrench, ClipboardList, Pencil, Plus, ShieldCheck, Wallet, TrendingUp, PiggyBank } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CREW_BUDGET_GROUPS, crewBudgetComparison, type CrewBudget } from '@/lib/crewTracker';
import type { useCrewTracker } from '@/hooks/useCrewTracker';
import { formatCurrency, cn } from '@/lib/utils';

const ICONS = { labor: HardHat, materials: Package, tools_equipment: Wrench, other: ClipboardList } as const;
const SEGMENT = { labor: 'bg-primary', materials: 'bg-accent-foreground', tools_equipment: 'bg-budget-tight', other: 'bg-muted-foreground' } as const;

type Health = 'none' | 'healthy' | 'tight' | 'over';
function health(budget: number, spent: number): Health {
  if (budget <= 0) return spent > 0 ? 'over' : 'none';
  if (spent > budget) return 'over';
  return (budget - spent) / budget < 0.15 ? 'tight' : 'healthy';
}
const HEALTH_TEXT: Record<Health, string> = { none: 'No budget', healthy: 'On track', tight: 'Tight', over: 'Over' };
const HEALTH_PILL: Record<Health, string> = {
  none: 'bg-muted text-muted-foreground',
  healthy: 'bg-budget-healthy/15 text-budget-healthy',
  tight: 'bg-budget-tight/15 text-budget-tight',
  over: 'bg-destructive/15 text-destructive',
};
const HEALTH_BAR: Record<Health, string> = { none: 'bg-muted-foreground', healthy: 'bg-budget-healthy', tight: 'bg-budget-tight', over: 'bg-destructive' };

export function CrewBudgetOverview({ tracker, onNavigate }: { tracker: ReturnType<typeof useCrewTracker>; onNavigate: (tab: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const comparison = crewBudgetComparison(tracker.entries, tracker.budget);
  if (tracker.loading) return <div role="status" className="h-48 animate-pulse rounded-2xl border bg-muted/40" aria-label="Loading spending and budget" />;
  if (tracker.error) return <p role="alert" className="rounded-2xl border border-destructive/30 p-4 text-destructive">Could not load spending and budget: {tracker.error.message}</p>;
  if (!tracker.orgId) return null;

  const startEditing = () => {
    setDraft(Object.fromEntries(CREW_BUDGET_GROUPS.map(g => [g.key, tracker.budget[g.key] ? String(tracker.budget[g.key]) : ''])));
    setEditing(true);
  };
  const draftTotal = CREW_BUDGET_GROUPS.reduce((s, g) => s + (Number(draft[g.key]) || 0), 0);
  const total = health(comparison.totalBudget, comparison.totalActual);
  const burn = comparison.totalBudget > 0 ? Math.round((comparison.totalActual / comparison.totalBudget) * 100) : null;
  const scale = Math.max(comparison.totalBudget, comparison.totalActual, 1);

  return <section aria-label="Crew budget and spending" className="min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 p-4 sm:p-5">
      <div className="min-w-0">
        <h2 className="font-heading text-2xl font-semibold leading-tight">Your budget & spending</h2>
        <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-budget-healthy/10 px-2.5 py-1 text-xs font-medium text-budget-healthy">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />Private to your crew · never shared
        </p>
      </div>
      <div className="flex w-full flex-wrap gap-2 sm:w-auto">
        <Button variant="outline" className="min-h-11 flex-1 sm:flex-none" onClick={startEditing}><Pencil className="h-4 w-4 shrink-0" />{tracker.hasBudget ? 'Edit budget' : 'Set budget'}</Button>
        <Button className="min-h-11 flex-1 sm:flex-none" onClick={() => onNavigate('crew-tracker')}><Plus className="h-4 w-4 shrink-0" />Log spending</Button>
      </div>
    </header>

    <div className="space-y-5 p-4 sm:p-5">
      {!tracker.hasBudget && <button type="button" onClick={startEditing} className="w-full rounded-xl border border-dashed p-4 text-left transition-colors hover:bg-muted/40">
        <p className="font-medium">Set a budget to see if you're on track</p>
        <p className="text-sm text-muted-foreground">Enter what you plan to spend on labor, materials, tools and other costs. Takes 30 seconds.</p>
      </button>}

      <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <Stat icon={Wallet} label="Total budget" value={tracker.hasBudget ? formatCurrency(comparison.totalBudget) : 'Not set'} />
        <Stat icon={TrendingUp} label="Spent to date" value={formatCurrency(comparison.totalActual)}
          pill={burn !== null ? <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', HEALTH_PILL[total])}>{burn}% used</span> : undefined} />
        <Stat icon={PiggyBank} label={tracker.hasBudget && comparison.remaining < 0 ? 'Over budget by' : 'Remaining'}
          value={tracker.hasBudget ? formatCurrency(Math.abs(comparison.remaining)) : 'Not set'}
          tone={tracker.hasBudget ? total : 'none'} />
      </dl>

      {(tracker.hasBudget || comparison.totalActual > 0) && <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
          <span className="font-medium uppercase tracking-wide">Where the money went</span>
          {tracker.hasBudget && <span className="font-mono">{formatCurrency(comparison.totalActual)} of {formatCurrency(comparison.totalBudget)}</span>}
        </div>
        <div className="relative flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label="Spending by category">
          {CREW_BUDGET_GROUPS.map(g => comparison.actual[g.key] > 0 && <div key={g.key} className={SEGMENT[g.key]} style={{ width: `${(comparison.actual[g.key] / scale) * 100}%` }} />)}
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {CREW_BUDGET_GROUPS.map(g => <li key={g.key} className="flex items-center gap-1.5"><span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', SEGMENT[g.key])} />{g.label}</li>)}
        </ul>
      </div>}

      <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {CREW_BUDGET_GROUPS.map(g => {
          const Icon = ICONS[g.key];
          const b = tracker.budget[g.key], s = comparison.actual[g.key];
          const h = health(b, s);
          const pct = b > 0 ? Math.min(100, (s / b) * 100) : s > 0 ? 100 : 0;
          return <li key={g.key} className="min-w-0 rounded-xl border p-3.5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted"><Icon className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="break-words font-medium">{g.label}</h3>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold', HEALTH_PILL[h])}>{HEALTH_TEXT[h]}</span>
                </div>
                <p className="mt-0.5 break-words font-mono text-sm">
                  {formatCurrency(s)}<span className="text-muted-foreground"> / {b > 0 ? formatCurrency(b) : 'no budget'}</span>
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={`Log ${g.label} spending`} onClick={() => onNavigate('crew-tracker')}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full transition-all', HEALTH_BAR[h])} style={{ width: `${pct}%` }} /></div>
            {b > 0 && <p className={cn('mt-1.5 text-xs', s > b ? 'text-destructive' : 'text-muted-foreground')}>
              {s > b ? `${formatCurrency(s - b)} over` : `${formatCurrency(b - s)} left`}
            </p>}
          </li>;
        })}
      </ul>
    </div>

    <Dialog open={editing} onOpenChange={setEditing}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tracker.hasBudget ? 'Edit budget' : 'Set your budget'}</DialogTitle>
          <DialogDescription>What do you plan to spend on this job? Only your crew can see this.</DialogDescription>
        </DialogHeader>
        <form id="crew-budget-form" className="space-y-3" onSubmit={async e => {
          e.preventDefault();
          const values = Object.fromEntries(CREW_BUDGET_GROUPS.map(g => [g.key, Number(draft[g.key] || 0)])) as CrewBudget;
          try { await tracker.saveBudget.mutateAsync(values); setEditing(false); } catch { /* keep edits */ }
        }}>
          {CREW_BUDGET_GROUPS.map(g => {
            const Icon = ICONS[g.key];
            return <div key={g.key} className="space-y-1">
              <Label htmlFor={`crew-budget-${g.key}`} className="flex items-center gap-2"><Icon className="h-4 w-4 shrink-0" />{g.label}</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input id={`crew-budget-${g.key}`} className="h-11 pl-7 font-mono" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0"
                  value={draft[g.key] ?? ''} onChange={e => setDraft({ ...draft, [g.key]: e.target.value })} />
              </div>
            </div>;
          })}
          <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5">
            <span className="text-sm font-medium">Total budget</span>
            <span className="font-mono font-semibold">{formatCurrency(draftTotal)}</span>
          </div>
        </form>
        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" className="min-h-11" onClick={() => setEditing(false)}>Cancel</Button>
          <Button type="submit" form="crew-budget-form" className="min-h-11" disabled={tracker.saveBudget.isPending}>{tracker.saveBudget.isPending ? 'Saving…' : 'Save budget'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}

function Stat({ icon: Icon, label, value, pill, tone = 'none' }: { icon: typeof Wallet; label: string; value: string; pill?: React.ReactNode; tone?: Health }) {
  return <div className={cn('min-w-0 rounded-xl border p-3.5', tone === 'over' && 'border-destructive/40 bg-destructive/5', tone === 'tight' && 'border-budget-tight/40 bg-budget-tight/5', tone === 'healthy' && 'border-budget-healthy/30 bg-budget-healthy/5')}>
    <dt className="flex flex-wrap items-center justify-between gap-2 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
      <span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 shrink-0" />{label}</span>{pill}
    </dt>
    <dd className={cn('mt-1 break-words font-mono text-2xl font-semibold', tone === 'over' && 'text-destructive', tone === 'tight' && 'text-budget-tight', tone === 'healthy' && 'text-budget-healthy')}>{value}</dd>
  </div>;
}

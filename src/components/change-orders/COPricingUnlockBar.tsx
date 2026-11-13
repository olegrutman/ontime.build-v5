import { Lock, LockOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChangeOrder } from '@/types/changeOrder';

const money = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

/** Lets the owning subcontractor reopen pricing on an approved order for a revision. */
export function COPricingUnlockBar({ co, canUnlock, unlocked, onToggle }: {
  co: ChangeOrder; canUnlock: boolean; unlocked: boolean; onToggle: (next: boolean) => void;
}) {
  if (!canUnlock) return null;
  const approved = Number(co.approved_amount ?? co.tc_submitted_price ?? 0);
  return (
    <section className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 space-y-1 sm:flex-1">
        <p className="flex items-center gap-2 font-heading text-base font-bold uppercase">
          {unlocked ? <LockOpen className="h-4 w-4 shrink-0 text-primary" /> : <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />}
          {unlocked ? 'Pricing unlocked for revision' : 'Pricing locked'}
        </p>
        <p className="break-words text-xs text-muted-foreground">
          {unlocked
            ? `Edit labor, materials or equipment, then submit the revised price. The approved ${money(approved)} stays in effect until the contractor accepts it.`
            : `Approved at ${money(approved)}. Unlock to correct the price — the change needs the contractor's approval.`}
        </p>
      </div>
      <Button variant={unlocked ? 'outline' : 'default'} className="w-full shrink-0 sm:w-auto" onClick={() => onToggle(!unlocked)}>
        {unlocked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
        {unlocked ? 'Lock pricing' : 'Unlock pricing'}
      </Button>
    </section>
  );
}

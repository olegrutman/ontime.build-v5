import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { milestoneAmount, type MilestoneInput } from '@/hooks/useCOProposals';

const money = (v: number) =>
  `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PRESETS: { label: string; rows: MilestoneInput[] }[] = [
  {
    label: '50 / 50',
    rows: [
      { label: 'Deposit', due_trigger: 'On acceptance', basis: 'percent', percent: 50, amount: 0 },
      { label: 'Final payment', due_trigger: 'On completion', basis: 'percent', percent: 50, amount: 0 },
    ],
  },
  {
    label: '30 / 40 / 30',
    rows: [
      { label: 'Deposit', due_trigger: 'On acceptance', basis: 'percent', percent: 30, amount: 0 },
      { label: 'Progress payment', due_trigger: 'At rough-in / 50% complete', basis: 'percent', percent: 40, amount: 0 },
      { label: 'Final payment', due_trigger: 'On substantial completion', basis: 'percent', percent: 30, amount: 0 },
    ],
  },
  {
    label: 'Net 30',
    rows: [
      { label: 'Full payment', due_trigger: 'Net 30 from invoice', basis: 'percent', percent: 100, amount: 0 },
    ],
  },
];

interface Props {
  milestones: MilestoneInput[];
  onChange: (next: MilestoneInput[]) => void;
  total: number;
}

export function PaymentScheduleEditor({ milestones, onChange, total }: Props) {
  const scheduled = milestones.reduce((s, m) => s + milestoneAmount(m, total), 0);
  const delta = total - scheduled;
  const balanced = Math.abs(delta) < 0.01;

  function update(index: number, patch: Partial<MilestoneInput>) {
    onChange(milestones.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Payment schedule
        </h2>
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map(p => (
            <Button
              key={p.label}
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 font-mono text-[0.65rem]"
              onClick={() => onChange(p.rows.map(r => ({ ...r })))}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No schedule yet — pick a preset above or add a milestone. Without one the quote falls back to the payment terms line.
        </p>
      ) : (
        <ul className="space-y-2">
          {milestones.map((m, i) => (
            <li key={i} className="rounded-xl border border-border bg-background/60 p-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6rem] font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <Input
                  value={m.label}
                  onChange={e => update(i, { label: e.target.value })}
                  placeholder="Deposit"
                  className="h-9 flex-1"
                  aria-label={`Milestone ${i + 1} label`}
                />
                <button
                  type="button"
                  onClick={() => onChange(milestones.filter((_, x) => x !== i))}
                  className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
                  aria-label={`Remove milestone ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_7rem_auto]">
                <Input
                  value={m.due_trigger ?? ''}
                  onChange={e => update(i, { due_trigger: e.target.value })}
                  placeholder="On acceptance"
                  className="h-9"
                  aria-label={`Milestone ${i + 1} trigger`}
                />
                <div className="flex overflow-hidden rounded-lg border border-border">
                  {(['percent', 'amount'] as const).map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => update(i, { basis: b })}
                      className={cn(
                        'px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider',
                        m.basis === b ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {b === 'percent' ? '%' : '$'}
                    </button>
                  ))}
                </div>
                {m.basis === 'percent' ? (
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={m.percent === 0 ? '' : String(m.percent)}
                    onChange={e => update(i, { percent: Number(e.target.value) || 0 })}
                    placeholder="50"
                    className="h-9 font-mono tabular-nums"
                    aria-label={`Milestone ${i + 1} percent`}
                  />
                ) : (
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={m.amount === 0 ? '' : String(m.amount)}
                    onChange={e => update(i, { amount: Number(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="h-9 font-mono tabular-nums"
                    aria-label={`Milestone ${i + 1} amount`}
                  />
                )}
                <span className="self-center font-mono tabular-nums text-sm font-semibold text-foreground sm:text-right">
                  {money(milestoneAmount(m, total))}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() =>
            onChange([
              ...milestones,
              { label: '', due_trigger: '', basis: 'percent', percent: 0, amount: 0 },
            ])
          }
        >
          <Plus className="h-3.5 w-3.5" />
          Add milestone
        </Button>
        <div className="text-right">
          <p className="font-mono tabular-nums text-sm font-semibold text-foreground">
            {money(scheduled)} <span className="text-muted-foreground">/ {money(total)}</span>
          </p>
          {milestones.length > 0 && !balanced && (
            <p className="mt-0.5 flex items-center justify-end gap-1 text-[0.65rem] font-semibold uppercase tracking-wider text-destructive">
              <AlertTriangle className="h-3 w-3" />
              {delta > 0 ? `${money(delta)} unscheduled` : `${money(-delta)} over total`}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

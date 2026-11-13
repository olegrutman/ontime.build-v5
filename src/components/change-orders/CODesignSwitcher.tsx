import { Columns2, FileText, ListChecks, Package, Paperclip, ClipboardList, WalletCards } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CODetailDesign = 'focus' | 'guided' | 'document';
export type COGuidedSection = 'scope' | 'procurement' | 'records' | 'summary';

const DESIGNS = [
  {
    id: 'focus' as const,
    label: 'Focus',
    title: 'Focus workspace',
    description: 'Scope on the left, actions and money in a quiet side rail.',
    icon: Columns2,
  },
  {
    id: 'guided' as const,
    label: 'Step by step',
    title: 'Step-by-step workspace',
    description: 'One task at a time: scope, materials, records, then summary.',
    icon: ListChecks,
  },
  {
    id: 'document' as const,
    label: 'Document',
    title: 'Clean document',
    description: 'A calm single column for reading the order from top to bottom.',
    icon: FileText,
  },
];

export function CODesignSwitcher({ value, onChange }: { value: CODetailDesign; onChange: (value: CODetailDesign) => void }) {
  const selected = DESIGNS.find(design => design.id === value) ?? DESIGNS[0];

  return (
    <section aria-label="Choose a page design" className="rounded-2xl border border-border bg-card p-2.5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <p className="px-2 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground shrink-0">
          Try 3 layouts
        </p>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted/50 p-1 flex-1" role="group" aria-label="Order page layout">
          {DESIGNS.map(design => {
            const Icon = design.icon;
            const active = design.id === value;
            return (
              <button
                key={design.id}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(design.id)}
                className={cn(
                  'min-w-0 min-h-10 rounded-lg px-2 py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5',
                  active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{design.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="px-2 pt-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{selected.title}.</span> {selected.description}
      </p>
    </section>
  );
}

const GUIDED_SECTIONS = [
  { id: 'scope' as const, label: 'Scope & pricing', icon: ClipboardList },
  { id: 'procurement' as const, label: 'Materials & photos', icon: Package },
  { id: 'records' as const, label: 'Notes & records', icon: Paperclip },
  { id: 'summary' as const, label: 'Money & actions', icon: WalletCards },
];

export function COGuidedNav({ value, onChange }: { value: COGuidedSection; onChange: (value: COGuidedSection) => void }) {
  return (
    <nav aria-label="Order sections" className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-2 md:grid-cols-4">
      {GUIDED_SECTIONS.map((section, index) => {
        const Icon = section.icon;
        const active = section.id === value;
        return (
          <button
            key={section.id}
            type="button"
            aria-current={active ? 'step' : undefined}
            onClick={() => onChange(section.id)}
            className={cn(
              'min-h-12 rounded-xl px-3 py-2 text-left flex items-center gap-2.5 transition-colors',
              active ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', active ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[9px] font-bold uppercase tracking-wider opacity-70">Step {index + 1}</span>
              <span className="block text-xs font-semibold leading-tight">{section.label}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export function COCompactSummary({
  total,
  statusLabel,
  pricedCount,
  itemCount,
}: {
  total: number;
  statusLabel: string;
  pricedCount: number;
  itemCount: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Order total</p>
        <p className="mt-0.5 truncate font-mono text-lg font-semibold text-foreground">
          ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
      <div className="min-w-0 border-l border-border pl-3">
        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Status</p>
        <p className="mt-1 truncate text-sm font-semibold text-foreground">{statusLabel}</p>
      </div>
      <div className="min-w-0 border-l border-border pl-3">
        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Pricing</p>
        <p className="mt-1 truncate text-sm font-semibold text-foreground">{pricedCount}/{itemCount} items</p>
      </div>
    </div>
  );
}

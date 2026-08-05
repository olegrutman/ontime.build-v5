import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import type { CORoutingTarget } from '@/hooks/useCORoutingTargets';

interface AssignToCardProps {
  targets: CORoutingTarget[];
  value: string | null;
  onChange: (orgId: string) => void;
  /** e.g. "Trade Contractor" */
  roleLabel?: string;
  disabled?: boolean;
  className?: string;
}

const AVATAR_COLORS: Record<string, string> = {
  GC: 'bg-blue-600',
  TC: 'bg-emerald-600',
  FC: 'bg-amber-500',
};

export function AssignToCard({
  targets,
  value,
  onChange,
  roleLabel,
  disabled,
  className,
}: AssignToCardProps) {
  return (
    <Card className={cn('mb-4 rounded-2xl p-4', disabled && 'opacity-70', className)}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Assign to {roleLabel ?? 'party'}
        </p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          Required
        </span>
      </div>

      {targets.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted-foreground">
          No eligible party on this project yet — invite them first, then set this on the draft.
        </p>
      ) : (
        <div className="space-y-1.5">
          {targets.map(t => {
            const active = value === t.id;
            return (
              <button
                key={t.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(t.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-xl border-2 p-2.5 text-left transition-all',
                  active ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40',
                  disabled && 'cursor-default',
                )}
              >
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white',
                    AVATAR_COLORS[t.type] ?? 'bg-muted-foreground',
                  )}
                >
                  {t.initials}
                </span>
                <span className="flex-1 text-sm font-semibold text-foreground">{t.name}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {t.type}
                </span>
                <span
                  className={cn(
                    'size-4 shrink-0 rounded-full border-2',
                    active ? 'border-primary bg-primary' : 'border-muted-foreground/40',
                  )}
                />
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">
        This is who receives the {roleLabel ? '' : ''}order for pricing or approval. You can change it on the draft later.
      </p>
    </Card>
  );
}

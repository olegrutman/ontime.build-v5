import { cn } from '@/lib/utils';
import type { ReasonCategory } from '@/hooks/useFieldCaptures';

const REASONS: { value: ReasonCategory; label: string }[] = [
  { value: 'owner_request', label: 'Owner Request' },
  { value: 'blueprint_change', label: 'Blueprint Change' },
  { value: 'field_conflict', label: 'Field Conflict' },
  { value: 'damage_by_others', label: 'Damage by Others' },
  { value: 'scope_gap', label: 'Scope Gap' },
  { value: 'safety_issue', label: 'Safety Issue' },
  { value: 'other', label: 'Other' },
];

interface CaptureReasonChipsProps {
  value: ReasonCategory | null;
  onChange: (v: ReasonCategory) => void;
  disabled?: boolean;
}

export function CaptureReasonChips({ value, onChange, disabled }: CaptureReasonChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {REASONS.map((r) => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          disabled={disabled}
          className={cn(
            'px-3 min-h-[44px] rounded-full text-sm font-medium border transition-colors',
            value === r.value
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-foreground border-border hover:bg-muted',
            disabled && 'opacity-50'
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

export const REASON_LABELS: Record<ReasonCategory, string> = Object.fromEntries(
  REASONS.map((r) => [r.value, r.label])
) as Record<ReasonCategory, string>;

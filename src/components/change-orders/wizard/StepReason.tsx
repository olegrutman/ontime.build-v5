import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { CO_REASON_LABELS, CO_REASON_COLORS } from '@/types/changeOrder';
import type { COReasonCode } from '@/types/changeOrder';
import type { COWizardData } from './COWizard';

interface StepReasonProps {
  data:     COWizardData;
  onChange: (patch: Partial<COWizardData>) => void;
}

const REASONS: { code: COReasonCode; description: string }[] = [
  { code: 'addition',          description: 'New scope not in the original contract' },
  { code: 'rework',            description: 'Something built wrong that needs to be redone' },
  { code: 'design_change',     description: 'Plans or drawings changed after work started' },
  { code: 'owner_request',     description: 'Owner asked for something different' },
  { code: 'gc_request',        description: 'GC directed the change' },
  { code: 'damaged_by_others', description: 'Another trade or party caused the damage' },
  { code: 'other',             description: 'Anything else' },
];

export function StepReason({ data, onChange }: StepReasonProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select the reason for this change order. This is required and will appear on the CO for all parties.
      </p>

      <div className="space-y-2">
        {REASONS.map(({ code, description }) => {
          const isSelected = data.reason === code;
          const colors     = CO_REASON_COLORS[code];
          return (
            <button
              key={code}
              onClick={() => onChange({ reason: code, reasonNote: data.reasonNote })}
              className={cn(
                'flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all w-full',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/30 hover:bg-muted/40'
              )}
            >
              <span
                className="inline-block px-2 py-0.5 rounded text-xs font-semibold shrink-0 mt-0.5"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                {CO_REASON_LABELS[code]}
              </span>
              <span className="text-sm text-muted-foreground">
                {description}
              </span>
            </button>
          );
        })}
      </div>

      {data.reason === 'other' && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Describe the reason *
          </label>
          <Textarea
            value={data.reasonNote}
            onChange={(e) => onChange({ reasonNote: e.target.value })}
            placeholder="Explain the reason for this change order…"
            rows={3}
            className="resize-none"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}

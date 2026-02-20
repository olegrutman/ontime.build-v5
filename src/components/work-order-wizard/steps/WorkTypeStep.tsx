import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Wrench, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChangeOrderWorkType, WORK_TYPE_LABELS } from '@/types/changeOrderProject';
import { WorkOrderWizardData, FIXING_REASON_OPTIONS } from '@/types/workOrderWizard';

interface WorkTypeStepProps {
  data: WorkOrderWizardData;
  onChange: (updates: Partial<WorkOrderWizardData>) => void;
}

const WORK_TYPES: ChangeOrderWorkType[] = ['reframe', 'reinstall', 'addition', 'adjust', 'fixing'];

function WorkTypeButton({
  type,
  selected,
  onClick,
}: {
  type: ChangeOrderWorkType;
  selected: boolean;
  onClick: () => void;
}) {
  const isFixing = type === 'fixing';
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-3 rounded-lg border-2 font-medium transition-all text-sm flex items-center gap-2 justify-center',
        selected
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background border-border hover:border-primary/50',
        isFixing && selected && 'bg-amber-600 border-amber-600'
      )}
    >
      {isFixing && <AlertTriangle className="w-4 h-4" />}
      {WORK_TYPE_LABELS[type]}
    </button>
  );
}

export function WorkTypeStep({ data, onChange }: WorkTypeStepProps) {
  const isFixing = data.work_type === 'fixing';
  const isOtherTrade = data.reason === 'other_trade';

  return (
    <div className="space-y-6">
      {/* Work Type Buttons */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">
          Select work type
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {WORK_TYPES.map((type) => (
            <WorkTypeButton
              key={type}
              type={type}
              selected={data.work_type === type}
              onClick={() => onChange({ work_type: type })}
            />
          ))}
        </div>
      </div>

      {/* Fixing Reason - Only shown when Fixing is selected */}
      {isFixing && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Fixing Work</span>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Please specify the reason for this fix to help track issues and
              responsibility.
            </p>
          </div>

          <div>
            <Label className="mb-2 block">Reason for Fix</Label>
            <Select
              value={data.reason || ''}
              onValueChange={(value) => onChange({ reason: value })}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {FIXING_REASON_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Other Trade Notes - Only shown when "Other Trade's Mistake" is selected */}
          {isOtherTrade && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <Label className="mb-2 block">Which trade caused the issue?</Label>
              <Textarea
                placeholder="e.g., Plumber damaged framing while running pipes, Electrician cut through studs incorrectly..."
                value={data.fixing_trade_notes || ''}
                onChange={(e) => onChange({ fixing_trade_notes: e.target.value })}
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                This information helps document responsibility for the damage.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

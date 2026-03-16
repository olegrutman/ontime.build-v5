import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { UnifiedWizardData } from '@/types/unifiedWizard';

interface LaborStepProps {
  data: UnifiedWizardData;
  onChange: (updates: Partial<UnifiedWizardData>) => void;
  isTC: boolean;
  projectRate: number | null;
}

export function LaborStep({ data, onChange, isTC, projectRate }: LaborStepProps) {
  const isHourly = data.labor_mode === 'hourly';

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/50 w-fit">
        <button
          onClick={() => onChange({ labor_mode: 'hourly' })}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isHourly ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
          }`}
        >
          Hourly
        </button>
        <button
          onClick={() => onChange({ labor_mode: 'lump_sum' })}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            !isHourly ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
          }`}
        >
          Lump Sum
        </button>
      </div>

      {isHourly ? (
        <div className="space-y-5">
          {/* Rate */}
          <div>
            <Label className="text-sm font-medium">
              {projectRate ? 'Your rate for this project' : 'Your hourly rate $'}
            </Label>
            {!projectRate && (
              <p className="text-xs text-muted-foreground mt-0.5">
                This will become your going rate for this project.
              </p>
            )}
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={data.hourly_rate ?? ''}
                onChange={(e) => onChange({ hourly_rate: e.target.value ? Number(e.target.value) : null })}
                placeholder={projectRate ? String(projectRate) : '0.00'}
                className="pl-7"
              />
            </div>
          </div>

          {/* Hours */}
          <div>
            <Label className="text-sm font-medium">Hours (this entry)</Label>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={data.hours ?? ''}
              onChange={(e) => onChange({ hours: e.target.value ? Number(e.target.value) : null })}
              placeholder="0"
              className="mt-1.5"
            />
          </div>

          {/* TC-only toggle */}
          {isTC && (
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Bill FC hours at my rate</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  GC will see FC work billed at your rate.
                </p>
              </div>
              <Switch
                checked={data.use_fc_hours_at_tc_rate}
                onCheckedChange={(checked) => onChange({ use_fc_hours_at_tc_rate: checked })}
              />
            </div>
          )}
        </div>
      ) : (
        <div>
          <Label className="text-sm font-medium">Total labor amount $</Label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={data.lump_sum_amount ?? ''}
              onChange={(e) => onChange({ lump_sum_amount: e.target.value ? Number(e.target.value) : null })}
              placeholder="0.00"
              className="pl-7"
            />
          </div>
        </div>
      )}
    </div>
  );
}

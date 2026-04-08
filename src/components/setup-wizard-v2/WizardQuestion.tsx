import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { WizardQuestion as WQ, InputType } from '@/hooks/useSetupWizardV2';

interface Props {
  question: WQ;
  value: any;
  onChange: (value: any) => void;
  answers?: Record<string, any>;
}

export function WizardQuestion({ question, value, onChange }: Props) {
  const { label, inputType, options, tag } = question;
  const isGate = tag === 'scope_gate';

  return (
    <div
      className={cn(
        'p-4 rounded-lg border transition-all animate-in fade-in slide-in-from-top-2 duration-300',
        isGate
          ? 'border-primary/30 bg-primary/5'
          : 'border-border bg-card',
      )}
    >
      <Label className="text-sm font-medium block mb-2">
        {label}
        {isGate && (
          <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary uppercase">
            Scope Gate
          </span>
        )}
      </Label>
      {renderInput(inputType, value, options, onChange)}
    </div>
  );
}

function renderInput(type: InputType, value: any, options: string[] | undefined, onChange: (v: any) => void) {
  switch (type) {
    case 'yes_no':
      return (
        <div className="flex gap-2">
          {['yes', 'no'].map((v) => (
            <Button
              key={v}
              type="button"
              variant={value === v ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange(value === v ? null : v)}
              className="min-w-[60px]"
            >
              {v === 'yes' ? 'Yes' : 'No'}
            </Button>
          ))}
        </div>
      );

    case 'number':
      return (
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          className="w-28"
          min={0}
          max={99}
        />
      );

    case 'dropdown':
      if (!options?.length) return null;
      return (
        <Select value={value ?? ''} onValueChange={onChange}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'yes_no_percent': {
      const enabled = typeof value === 'object' ? value?.enabled : value === 'yes';
      const pct = typeof value === 'object' ? value?.percent : '';
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            {['yes', 'no'].map((v) => (
              <Button
                key={v}
                type="button"
                variant={(v === 'yes' && enabled) || (v === 'no' && !enabled && value !== null) ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  if (v === 'yes') onChange({ enabled: true, percent: pct || '' });
                  else onChange('no');
                }}
                className="min-w-[60px]"
              >
                {v === 'yes' ? 'Yes' : 'No'}
              </Button>
            ))}
          </div>
          {enabled && (
            <div className="flex items-center gap-2 animate-in fade-in duration-200">
              <span className="text-xs text-muted-foreground">% of contract:</span>
              <div className="relative w-24">
                <Input
                  type="number"
                  value={pct}
                  onChange={(e) => onChange({ enabled: true, percent: e.target.value ? Number(e.target.value) : '' })}
                  className="pr-6"
                  min={0}
                  max={100}
                  step={0.5}
                  placeholder="3-5"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
          )}
        </div>
      );
    }

    case 'yes_no_floors': {
      const enabled = typeof value === 'object' ? value?.enabled : value === 'yes';
      const floors: string[] = typeof value === 'object' ? value?.floors || [] : [];
      const floorOptions = ['Basement', 'L1', 'L2', 'L3', 'Roof'];
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            {['yes', 'no'].map((v) => (
              <Button
                key={v}
                type="button"
                variant={(v === 'yes' && enabled) || (v === 'no' && !enabled && value !== null) ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  if (v === 'yes') onChange({ enabled: true, floors });
                  else onChange('no');
                }}
                className="min-w-[60px]"
              >
                {v === 'yes' ? 'Yes' : 'No'}
              </Button>
            ))}
          </div>
          {enabled && (
            <div className="flex flex-wrap gap-2 animate-in fade-in duration-200">
              {floorOptions.map((f) => {
                const checked = floors.includes(f);
                return (
                  <label
                    key={f}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs cursor-pointer transition-all',
                      checked ? 'bg-primary/10 border-primary text-primary font-medium' : 'bg-card border-border hover:border-primary/40',
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => {
                        const next = c ? [...floors, f] : floors.filter((x: string) => x !== f);
                        onChange({ enabled: true, floors: next });
                      }}
                      className="h-3.5 w-3.5"
                    />
                    {f}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    case 'yes_no_subtype': {
      const enabled = typeof value === 'object' ? value?.enabled : value === 'yes';
      const subtype = typeof value === 'object' ? value?.subtype : '';
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            {['yes', 'no'].map((v) => (
              <Button
                key={v}
                type="button"
                variant={(v === 'yes' && enabled) || (v === 'no' && !enabled && value !== null) ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  if (v === 'yes') onChange({ enabled: true, subtype });
                  else onChange('no');
                }}
                className="min-w-[60px]"
              >
                {v === 'yes' ? 'Yes' : 'No'}
              </Button>
            ))}
          </div>
          {enabled && options?.length && (
            <Select value={subtype} onValueChange={(v) => onChange({ enabled: true, subtype: v })}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { SetupQuestion } from '@/hooks/useSetupQuestions';

interface QuestionFieldProps {
  question: SetupQuestion;
  value: any;
  options: string[] | null;
  onChange: (value: any) => void;
}

export function QuestionField({ question, value, options, onChange }: QuestionFieldProps) {
  const { input_type, label, field_key, notes } = question;

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {notes && <p className="text-[11px] text-muted-foreground">{notes}</p>}
      {renderInput(input_type, value, options, onChange, field_key)}
    </div>
  );
}

function renderInput(
  type: string,
  value: any,
  options: string[] | null,
  onChange: (v: any) => void,
  fieldKey: string,
) {
  switch (type) {
    case 'text':
      return (
        <Input
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter value..."
        />
      );

    case 'textarea':
      return (
        <Textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder="Enter description..."
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          className="w-32"
          min={0}
        />
      );

    case 'currency':
      return (
        <div className="relative w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
          <Input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            className="pl-7"
            min={0}
            step={100}
          />
        </div>
      );

    case 'percentage':
      return (
        <div className="relative w-32">
          <Input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            className="pr-7"
            min={0}
            max={100}
            step={0.5}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
        </div>
      );

    case 'date':
      return (
        <Input
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-44"
        />
      );

    case 'dropdown':
      if (!options || options.length === 0) return null;
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

    case 'multi_select':
      if (!options || options.length === 0) return null;
      const selected: string[] = Array.isArray(value) ? value : [];
      return (
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const checked = selected.includes(opt);
            return (
              <label
                key={opt}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm cursor-pointer transition-all',
                  checked
                    ? 'bg-primary/10 border-primary text-primary font-medium'
                    : 'bg-card border-border text-foreground hover:border-primary/40',
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) => {
                    if (c) onChange([...selected, opt]);
                    else onChange(selected.filter((s) => s !== opt));
                  }}
                  className="h-3.5 w-3.5"
                />
                {opt}
              </label>
            );
          })}
        </div>
      );

    case 'toggle':
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={value === true || value === 'on'}
            onCheckedChange={(c) => onChange(c ? 'on' : 'off')}
          />
          <span className="text-sm text-muted-foreground">
            {value === true || value === 'on' ? 'On' : 'Off'}
          </span>
        </div>
      );

    case 'address':
      const addr = (typeof value === 'object' && value) ? value : { street: '', city: '', state: '', zip: '' };
      const updateAddr = (key: string, val: string) => onChange({ ...addr, [key]: val });
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            placeholder="Street"
            value={addr.street ?? ''}
            onChange={(e) => updateAddr('street', e.target.value)}
            className="sm:col-span-2"
          />
          <Input placeholder="City" value={addr.city ?? ''} onChange={(e) => updateAddr('city', e.target.value)} />
          <div className="flex gap-2">
            <Input placeholder="State" value={addr.state ?? ''} onChange={(e) => updateAddr('state', e.target.value)} className="w-20" />
            <Input placeholder="ZIP" value={addr.zip ?? ''} onChange={(e) => updateAddr('zip', e.target.value)} className="flex-1" />
          </div>
        </div>
      );

    case 'lookup':
      return (
        <Input
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search..."
        />
      );

    default:
      return (
        <Input
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

import { Ruler, AlertTriangle, Layers, Eye, Crosshair } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  WorkOrderWizardData,
  STRUCTURAL_ELEMENT_OPTIONS,
  SCOPE_SIZE_OPTIONS,
  URGENCY_OPTIONS,
  ACCESS_CONDITIONS_OPTIONS,
  EXISTING_CONDITIONS_OPTIONS,
} from '@/types/workOrderWizard';

interface ScopeDetailsStepProps {
  data: WorkOrderWizardData;
  onChange: (updates: Partial<WorkOrderWizardData>) => void;
}

function ScopeSelect({
  icon: Icon,
  label,
  placeholder,
  value,
  options,
  onValueChange,
}: {
  icon: React.ElementType;
  label: string;
  placeholder: string;
  value?: string;
  options: string[];
  onValueChange: (val: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm">
        <Icon className="w-4 h-4 text-muted-foreground" />
        {label}
      </Label>
      <Select value={value || ''} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ScopeDetailsStep({ data, onChange }: ScopeDetailsStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <Crosshair className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Scope Details</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Optional details to help generate a precise description
        </p>
      </div>

      <ScopeSelect
        icon={Layers}
        label="Structural Element"
        placeholder="What is being worked on?"
        value={data.structural_element}
        options={STRUCTURAL_ELEMENT_OPTIONS}
        onValueChange={(val) => onChange({ structural_element: val })}
      />

      <ScopeSelect
        icon={Ruler}
        label="Scope Size"
        placeholder="How much work is involved?"
        value={data.scope_size}
        options={SCOPE_SIZE_OPTIONS}
        onValueChange={(val) => onChange({ scope_size: val })}
      />

      <ScopeSelect
        icon={AlertTriangle}
        label="Urgency"
        placeholder="How urgent is this work?"
        value={data.urgency}
        options={URGENCY_OPTIONS}
        onValueChange={(val) => onChange({ urgency: val })}
      />

      <ScopeSelect
        icon={Eye}
        label="Access Conditions"
        placeholder="Any special access needed?"
        value={data.access_conditions}
        options={ACCESS_CONDITIONS_OPTIONS}
        onValueChange={(val) => onChange({ access_conditions: val })}
      />

      <ScopeSelect
        icon={Crosshair}
        label="Existing Conditions"
        placeholder="What is the current state?"
        value={data.existing_conditions}
        options={EXISTING_CONDITIONS_OPTIONS}
        onValueChange={(val) => onChange({ existing_conditions: val })}
      />
    </div>
  );
}

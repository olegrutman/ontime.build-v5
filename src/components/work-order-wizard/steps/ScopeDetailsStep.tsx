import { useMemo } from 'react';
import { Ruler, AlertTriangle, Layers, Eye, Crosshair, LayoutList } from 'lucide-react';
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
  INTERIOR_ARCHITECTURAL_ELEMENTS,
  EXTERIOR_ARCHITECTURAL_ELEMENTS,
  INTERIOR_SCOPE_SIZE_OPTIONS,
  EXTERIOR_SCOPE_SIZE_OPTIONS,
  ELEMENT_SUB_TYPE_MAP,
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
  const isOutside = data.location_data?.inside_outside === 'outside';

  const elementOptions = useMemo(
    () => (isOutside ? EXTERIOR_ARCHITECTURAL_ELEMENTS : INTERIOR_ARCHITECTURAL_ELEMENTS),
    [isOutside],
  );

  const scopeSizeOptions = useMemo(
    () => (isOutside ? EXTERIOR_SCOPE_SIZE_OPTIONS : INTERIOR_SCOPE_SIZE_OPTIONS),
    [isOutside],
  );

  const subTypeOptions = useMemo(
    () => (data.structural_element ? ELEMENT_SUB_TYPE_MAP[data.structural_element] : null),
    [data.structural_element],
  );

  const handleElementChange = (val: string) => {
    const updates: Partial<WorkOrderWizardData> = { structural_element: val };
    // Clear sub-type when element changes
    if (!ELEMENT_SUB_TYPE_MAP[val]) {
      updates.architectural_element_sub_type = undefined;
    }
    onChange(updates);
  };

  return (
    <div className="space-y-6">
      <ScopeSelect
        icon={Layers}
        label="Architectural Element"
        placeholder="What is being worked on?"
        value={data.structural_element}
        options={elementOptions}
        onValueChange={handleElementChange}
      />

      {subTypeOptions && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <ScopeSelect
            icon={LayoutList}
            label={`${data.structural_element} Type`}
            placeholder={`What type of ${data.structural_element?.toLowerCase()}?`}
            value={data.architectural_element_sub_type}
            options={subTypeOptions}
            onValueChange={(val) => onChange({ architectural_element_sub_type: val })}
          />
        </div>
      )}

      <ScopeSelect
        icon={Ruler}
        label="Scope Size"
        placeholder="How much work is involved?"
        value={data.scope_size}
        options={scopeSizeOptions}
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

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { COMMON_EXCLUSIONS } from '@/types/contractScope';

interface ExclusionStepProps {
  exclusions: { label: string; isCustom: boolean }[];
  onToggle: (label: string) => void;
  onAddCustom: (label: string) => void;
  onRemoveCustom: (label: string) => void;
}

export function ExclusionStep({ exclusions, onToggle, onAddCustom, onRemoveCustom }: ExclusionStepProps) {
  const [customInput, setCustomInput] = useState('');
  const selectedLabels = new Set(exclusions.map(e => e.label));

  const handleAdd = () => {
    const trimmed = customInput.trim();
    if (trimmed && !selectedLabels.has(trimmed)) {
      onAddCustom(trimmed);
      setCustomInput('');
    }
  };

  const customExclusions = exclusions.filter(e => e.isCustom);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold font-heading">Exclusions</h2>
        <p className="text-sm text-muted-foreground mt-1">
          What is NOT included in this contract?
        </p>
      </div>

      <div className="rounded-lg border bg-card divide-y">
        {COMMON_EXCLUSIONS.map(label => (
          <div key={label} className="flex items-center justify-between px-4 py-3.5 min-h-[52px]">
            <span className="text-sm font-medium">{label}</span>
            <Switch
              checked={selectedLabels.has(label)}
              onCheckedChange={() => onToggle(label)}
            />
          </div>
        ))}
      </div>

      {/* Custom exclusions */}
      {customExclusions.length > 0 && (
        <div className="rounded-lg border bg-card divide-y">
          {customExclusions.map(e => (
            <div key={e.label} className="flex items-center justify-between px-4 py-3 min-h-[48px]">
              <span className="text-sm font-medium">{e.label}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemoveCustom(e.label)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Add custom exclusion..."
          value={customInput}
          onChange={e => setCustomInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="flex-1"
        />
        <Button variant="outline" size="icon" onClick={handleAdd} disabled={!customInput.trim()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

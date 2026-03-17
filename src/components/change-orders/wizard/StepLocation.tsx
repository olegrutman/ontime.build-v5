import { useMemo } from 'react';
import { useProjectScope } from '@/hooks/useProjectScope';
import type { COWizardData } from './COWizard';

interface StepLocationProps {
  data:      COWizardData;
  onChange:  (patch: Partial<COWizardData>) => void;
  projectId: string;
}

const EXTERIOR_DIVISIONS = new Set(['exterior', 'roofing', 'waterproofing']);

interface ChipGroup {
  label: string;
  chips: string[];
}

export function StepLocation({ data, onChange, projectId }: StepLocationProps) {
  const { data: scope } = useProjectScope(projectId);

  const selected = useMemo(
    () => new Set(data.locationTag ? data.locationTag.split(',').map(s => s.trim()).filter(Boolean) : []),
    [data.locationTag]
  );

  const hasExterior = data.selectedItems.some(i => EXTERIOR_DIVISIONS.has(i.division));

  const groups: ChipGroup[] = useMemo(() => {
    const result: ChipGroup[] = [];

    const numBuildings = scope?.num_buildings ?? 1;
    if (numBuildings > 1) {
      result.push({
        label: 'Buildings',
        chips: Array.from({ length: numBuildings }, (_, i) =>
          `Bldg ${String.fromCharCode(65 + i)}`
        ),
      });
    }

    const floorCount = scope?.floors ?? 3;
    const levelChips: string[] = [];
    if (scope?.foundation_type?.toLowerCase().includes('basement')) {
      levelChips.push('Basement');
    }
    for (let i = 1; i <= floorCount; i++) {
      levelChips.push(`Level ${i}`);
    }
    result.push({ label: 'Levels', chips: levelChips });

    const numUnits = scope?.num_units ?? 0;
    if (numUnits > 1) {
      result.push({
        label: 'Units',
        chips: Array.from(
          { length: Math.min(numUnits, 24) },
          (_, i) => `Unit ${i + 1}`
        ),
      });
    }

    if (hasExterior) {
      result.push({
        label: 'Elevations',
        chips: ['East elev.', 'West elev.', 'North elev.', 'South elev.'],
      });
    }

    result.push({
      label: 'Other',
      chips: ['Roof deck', 'Garage', 'Common area', 'Mechanical room'],
    });

    return result;
  }, [scope, hasExterior]);

  function toggle(chip: string) {
    const next = new Set(selected);
    if (next.has(chip)) {
      next.delete(chip);
    } else {
      next.add(chip);
    }
    onChange({ locationTag: Array.from(next).join(', ') });
  }

  return (
    <div className="space-y-5">
      {groups.map(group => (
        <div key={group.label} className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {group.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.chips.map(chip => {
              const isSelected = selected.has(chip);
              return (
                <button
                  key={chip}
                  onClick={() => toggle(chip)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border hover:border-primary/40 hover:bg-muted/40'
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {selected.size > 0 && (
        <p className="text-sm text-muted-foreground">
          Selected: {Array.from(selected).join(', ')}
        </p>
      )}
    </div>
  );
}

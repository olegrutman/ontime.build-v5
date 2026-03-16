import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { useProjectScope } from '@/hooks/useProjectScope';
import type { UnifiedWizardData } from '@/types/unifiedWizard';

interface LocationStepProps {
  data: UnifiedWizardData;
  onChange: (updates: Partial<UnifiedWizardData>) => void;
  projectId: string;
}

export function LocationStep({ data, onChange, projectId }: LocationStepProps) {
  const { data: scope } = useProjectScope(projectId);

  const chipGroups = useMemo(() => {
    const groups: { label: string; chips: string[] }[] = [];

    // Buildings
    const numBuildings = scope?.num_buildings || 1;
    if (numBuildings > 1) {
      groups.push({
        label: 'Buildings',
        chips: Array.from({ length: numBuildings }, (_, i) =>
          `Bldg ${String.fromCharCode(65 + i)}`
        ),
      });
    }

    // Levels / Floors
    const floorCount = scope?.floors || scope?.stories || 2;
    const levelChips: string[] = [];
    if (scope?.foundation_type?.toLowerCase() === 'basement') {
      levelChips.push('Basement');
    }
    for (let i = 1; i <= floorCount; i++) {
      levelChips.push(`Level ${i}`);
    }
    if (levelChips.length > 0) {
      groups.push({ label: 'Levels / Floors', chips: levelChips });
    }

    // Units
    if (scope?.num_units && scope.num_units > 1) {
      groups.push({
        label: 'Units',
        chips: Array.from({ length: Math.min(scope.num_units, 20) }, (_, i) =>
          `Unit ${i + 1}`
        ),
      });
    }

    // Elevations — show for exterior/roofing/waterproofing items
    const exteriorDivisions = new Set(['exterior', 'roofing', 'waterproofing']);
    const hasExteriorItems = data.selectedCatalogItems.some(
      item => exteriorDivisions.has(item.division)
    );
    if (hasExteriorItems || data.selectedCatalogItems.length === 0) {
      groups.push({
        label: 'Elevations',
        chips: ['East elev.', 'West elev.', 'North elev.', 'South elev.'],
      });
    }

    // Other — always show
    groups.push({
      label: 'Other',
      chips: ['Roof deck', 'Garage', 'Common area', 'Mechanical room'],
    });

    return groups;
  }, [scope, data.selectedCatalogItems]);

  const toggleChip = (chip: string) => {
    const current = data.location_tags;
    const updated = current.includes(chip)
      ? current.filter(c => c !== chip)
      : [...current, chip];
    onChange({ location_tags: updated });
  };

  return (
    <div className="space-y-5">
      {chipGroups.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {group.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.chips.map((chip) => {
              const isSelected = data.location_tags.includes(chip);
              return (
                <button
                  key={chip}
                  onClick={() => toggleChip(chip)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border hover:border-primary/40'
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Quick Capture auto-save banner */}
      {data.wo_mode === 'quick_capture' &&
        data.selectedCatalogItems.length > 0 &&
        data.location_tags.length > 0 && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            ✓ Draft saved. You can exit and return to this work order at any time.
          </p>
        </div>
      )}
    </div>
  );
}

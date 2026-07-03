import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Plus } from 'lucide-react';
import { BUILDING_TYPES, type BuildingType } from '@/hooks/useSetupWizardV2';
import { OTHER_PROJECT_GROUPS } from '@/lib/otherProjectTypes';

interface Props {
  selected: BuildingType | null;
  onSelect: (bt: BuildingType) => void;
  /** Called when user picks an "Other" subtype (or free-text). Framing
   *  logic still runs under `custom_home`, but this label is what gets
   *  saved to `projects.project_type`. */
  otherLabel?: string | null;
  onOtherLabelChange?: (label: string | null) => void;
}

export function BuildingTypeSelector({ selected, onSelect, otherLabel, onOtherLabelChange }: Props) {
  const [otherOpen, setOtherOpen] = useState<boolean>(!!otherLabel);
  const [customText, setCustomText] = useState('');

  const pickOther = (label: string) => {
    onOtherLabelChange?.(label);
    onSelect('custom_home');
  };

  const clearOther = () => {
    onOtherLabelChange?.(null);
    setOtherOpen(false);
  };

  if (otherOpen) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={clearOther} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Back to building types
          </Button>
          {otherLabel && (
            <span className="text-xs text-muted-foreground">
              Selected: <span className="font-medium text-foreground">{otherLabel}</span>
            </span>
          )}
        </div>

        <div className="text-center">
          <h2 className="font-heading text-xl font-bold text-foreground">
            What kind of project?
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pick the closest match — framing scope will use custom-home logic as a base.
          </p>
        </div>

        <div className="space-y-5 max-w-2xl mx-auto">
          {OTHER_PROJECT_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.options.map((opt) => {
                  const active = otherLabel === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => pickOther(opt)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm font-medium border min-h-[40px] transition-all',
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-foreground border-border hover:border-primary/50',
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="border-t pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Something else
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Firehouse, Winery, Boat House…"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customText.trim()) {
                    pickOther(customText.trim());
                  }
                }}
              />
              <Button
                type="button"
                disabled={!customText.trim()}
                onClick={() => customText.trim() && pickOther(customText.trim())}
                className="gap-1"
              >
                <Plus className="h-4 w-4" /> Use
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-heading text-xl font-bold text-foreground">
          What are you building?
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          This determines which questions you'll answer and how your SOV is structured.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
        {BUILDING_TYPES.map((bt) => {
          const active = selected === bt.slug && !otherLabel;
          return (
            <button
              key={bt.slug}
              onClick={() => {
                onOtherLabelChange?.(null);
                onSelect(bt.slug);
              }}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-center',
                'hover:border-primary/60 hover:bg-primary/5',
                active ? 'border-primary bg-primary/10 shadow-sm' : 'border-border bg-card',
              )}
            >
              <span className="text-2xl">{bt.icon}</span>
              <span className="font-heading text-xs font-bold leading-tight">{bt.label}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{bt.description}</span>
            </button>
          );
        })}

        {/* Other tile */}
        <button
          onClick={() => setOtherOpen(true)}
          className={cn(
            'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-center',
            'hover:border-primary/60 hover:bg-primary/5',
            otherLabel ? 'border-primary bg-primary/10 shadow-sm' : 'border-dashed border-border bg-card',
          )}
        >
          <span className="text-2xl">➕</span>
          <span className="font-heading text-xs font-bold leading-tight">
            {otherLabel ? otherLabel : 'Other'}
          </span>
          <span className="text-[10px] text-muted-foreground leading-tight">
            Restaurant, barn, office, school, shed…
          </span>
        </button>
      </div>
    </div>
  );
}

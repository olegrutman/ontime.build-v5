import { cn } from '@/lib/utils';
import { BUILDING_TYPES, type BuildingType } from '@/hooks/useSetupWizardV2';

interface Props {
  selected: BuildingType | null;
  onSelect: (bt: BuildingType) => void;
}

export function BuildingTypeSelector({ selected, onSelect }: Props) {
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
        {BUILDING_TYPES.map((bt) => (
          <button
            key={bt.slug}
            onClick={() => onSelect(bt.slug)}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-center',
              'hover:border-primary/60 hover:bg-primary/5',
              selected === bt.slug
                ? 'border-primary bg-primary/10 shadow-sm'
                : 'border-border bg-card',
            )}
          >
            <span className="text-2xl">{bt.icon}</span>
            <span className="font-heading text-xs font-bold leading-tight">{bt.label}</span>
            <span className="text-[10px] text-muted-foreground leading-tight">{bt.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

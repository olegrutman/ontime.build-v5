import { Button } from '@/components/ui/button';

interface SashaQuickActionsProps {
  actions: string[];
  onSelect: (label: string) => void;
  disabled?: boolean;
}

export function SashaQuickActions({ actions, onSelect, disabled }: SashaQuickActionsProps) {
  if (!actions.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {actions.map((label) => (
        <Button
          key={label}
          variant="outline"
          size="sm"
          className="text-xs border-primary/40 text-primary hover:bg-primary/10 h-auto py-1.5 px-3"
          onClick={() => onSelect(label)}
          disabled={disabled}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}

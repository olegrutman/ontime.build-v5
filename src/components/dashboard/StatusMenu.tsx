import { cn } from '@/lib/utils';

export type ProjectStatusFilter = 'active' | 'on_hold' | 'completed' | 'archived';

interface StatusMenuProps {
  currentFilter: ProjectStatusFilter;
  onFilterChange: (filter: ProjectStatusFilter) => void;
  counts: { active: number; on_hold: number; completed: number; archived: number };
}

const STATUS_CONFIG = [
  { key: 'active', label: 'Active', color: 'bg-green-500' },
  { key: 'on_hold', label: 'On Hold', color: 'bg-amber-500' },
  { key: 'completed', label: 'Completed', color: 'bg-blue-500' },
  { key: 'archived', label: 'Archived', color: 'bg-muted-foreground' },
] as const;

export function StatusMenu({ currentFilter, onFilterChange, counts }: StatusMenuProps) {
  return (
    <div className="sticky top-14 z-30 bg-background/95 backdrop-blur border-b">
      <div className="flex items-center gap-1 p-2 overflow-x-auto">
        {STATUS_CONFIG.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => onFilterChange(key as ProjectStatusFilter)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
              currentFilter === key 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-muted"
            )}
          >
            <span className={cn("w-2 h-2 rounded-full", color)} />
            {label}
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs",
              currentFilter === key 
                ? "bg-primary-foreground/20 text-primary-foreground" 
                : "bg-muted-foreground/10"
            )}>
              {counts[key as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

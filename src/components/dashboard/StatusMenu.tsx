import { cn } from '@/lib/utils';

export type ProjectStatusFilter = 'setup' | 'active' | 'on_hold' | 'completed' | 'archived';

interface StatusMenuProps {
  currentFilter: ProjectStatusFilter;
  onFilterChange: (filter: ProjectStatusFilter) => void;
  counts: {setup: number; active: number; on_hold: number; completed: number; archived: number;};
}

const STATUS_CONFIG = [
{ key: 'setup', label: 'Setup', color: 'bg-violet-500' },
{ key: 'active', label: 'Active', color: 'bg-green-500' },
{ key: 'on_hold', label: 'On Hold', color: 'bg-amber-500' },
{ key: 'completed', label: 'Completed', color: 'bg-blue-500' },
{ key: 'archived', label: 'Archived', color: 'bg-muted-foreground' }] as
const;

export function StatusMenu({ currentFilter, onFilterChange, counts }: StatusMenuProps) {
  return (
    <div className="relative bg-background">
      <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto my-3 sm:my-[22px] scrollbar-hide">
        {STATUS_CONFIG.map(({ key, label, color }) =>
        <button
          key={key}
          onClick={() => onFilterChange(key as ProjectStatusFilter)}
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base font-medium transition-colors whitespace-nowrap min-h-[40px] sm:min-h-[44px]",
            currentFilter === key ?
            "bg-primary text-primary-foreground" :
            "hover:bg-muted"
          )}>

            <span className={cn("w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full", color)} />
            {label}
            <span className={cn(
            "px-1.5 sm:px-2 py-0.5 rounded-full text-xs sm:text-sm",
            currentFilter === key ?
            "bg-primary-foreground/20 text-primary-foreground" :
            "bg-muted-foreground/10"
          )}>
              {counts[key as keyof typeof counts]}
            </span>
          </button>
        )}
      </div>
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent sm:hidden" />
    </div>);

}
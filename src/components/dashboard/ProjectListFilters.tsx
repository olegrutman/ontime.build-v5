import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type ProjectStatusFilter = 'active' | 'on_hold' | 'completed' | 'archived';

interface ProjectListFiltersProps {
  currentFilter: ProjectStatusFilter;
  onFilterChange: (filter: ProjectStatusFilter) => void;
  counts: {
    active: number;
    on_hold: number;
    completed: number;
    archived: number;
  };
}

export function ProjectListFilters({ currentFilter, onFilterChange, counts }: ProjectListFiltersProps) {
  return (
    <Tabs value={currentFilter} onValueChange={(v) => onFilterChange(v as ProjectStatusFilter)}>
      <TabsList>
        <TabsTrigger value="active" className="gap-1.5">
          Active
          {counts.active > 0 && (
            <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">
              {counts.active}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="on_hold" className="gap-1.5">
          On Hold
          {counts.on_hold > 0 && (
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {counts.on_hold}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="completed" className="gap-1.5">
          Completed
          {counts.completed > 0 && (
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {counts.completed}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="archived" className="gap-1.5">
          Archived
          {counts.archived > 0 && (
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {counts.archived}
            </span>
          )}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

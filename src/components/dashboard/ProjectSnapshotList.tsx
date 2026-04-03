import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, cn } from '@/lib/utils';
import { ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusMenu, type ProjectStatusFilter } from './StatusMenu';

interface Project {
  id: string;
  name: string;
  project_type: string;
  status: string;
  updated_at: string;
  userRole: string | null;
  contractValue: number | null;
  pendingActions: number;
}

const STATUS_DOT: Record<string, string> = {
  setup: 'bg-violet-500',
  draft: 'bg-violet-500',
  active: 'bg-emerald-500',
  on_hold: 'bg-amber-500',
  completed: 'bg-blue-500',
  archived: 'bg-muted-foreground',
};

interface ProjectSnapshotListProps {
  projects: Project[];
  statusFilter: ProjectStatusFilter;
  onStatusFilterChange: (f: ProjectStatusFilter) => void;
  statusCounts: { setup: number; active: number; on_hold: number; completed: number; archived: number };
  loading: boolean;
  canCreate: boolean;
  onCreateProject: () => void;
  orgType: string | null;
  orgId?: string;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onStatusChange?: (id: string, status: 'active' | 'on_hold' | 'completed') => void;
}

export function ProjectSnapshotList({
  projects,
  statusFilter,
  onStatusFilterChange,
  statusCounts,
  loading,
  canCreate,
  onCreateProject,
}: ProjectSnapshotListProps) {
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter === 'setup') return p.status === 'setup' || p.status === 'draft';
      return p.status === statusFilter;
    });
  }, [projects, statusFilter]);

  return (
    <div className="rounded-3xl bg-card border border-border/60 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-border/40">
        <h3 className="text-lg font-semibold tracking-tight">Projects</h3>
        <div className="flex items-center gap-2">
          <StatusMenu
            currentFilter={statusFilter}
            onFilterChange={onStatusFilterChange}
            counts={statusCounts}
          />
          {canCreate && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onCreateProject}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              New
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-5 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-accent/30 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No {statusFilter} projects
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {filtered.map((project) => (
            <button
              key={project.id}
              onClick={() => navigate(`/project/${project.id}/overview`)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-accent/40 transition-colors text-left group"
            >
              <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', STATUS_DOT[project.status] || 'bg-muted-foreground')} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{project.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {project.project_type}
                  {project.pendingActions > 0 && (
                    <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                      · {project.pendingActions} pending
                    </span>
                  )}
                </p>
              </div>
              {project.contractValue != null && project.contractValue > 0 && (
                <span className="text-sm font-semibold text-foreground shrink-0" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {formatCurrency(project.contractValue)}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

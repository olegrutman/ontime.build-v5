import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Plus, MoreVertical, HardHat, Truck, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency } from '@/lib/utils';
import type { ProjectStatusFilter } from './StatusMenu';

const STATUS_LABELS: Record<ProjectStatusFilter, string> = {
  setup: 'Setup',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  archived: 'Archived',
};

const STATUS_DOT_COLORS: Record<string, string> = {
  setup: 'bg-violet-500',
  draft: 'bg-violet-500',
  active: 'bg-green-500',
  on_hold: 'bg-amber-500',
  completed: 'bg-blue-500',
  archived: 'bg-muted-foreground',
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  setup: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  draft: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  on_hold: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  archived: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

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

interface DashboardProjectListProps {
  projects: Project[];
  statusFilter: ProjectStatusFilter;
  onStatusFilterChange: (filter: ProjectStatusFilter) => void;
  statusCounts: { setup: number; active: number; on_hold: number; completed: number; archived: number };
  loading: boolean;
  orgType: string | null;
  orgId?: string;
  onArchive: (projectId: string) => void;
  onUnarchive: (projectId: string) => void;
  onStatusChange: (projectId: string, status: 'active' | 'on_hold' | 'completed') => void;
}

const filters: { key: ProjectStatusFilter; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'setup', label: 'Setup' },
  { key: 'on_hold', label: 'On Hold' },
  { key: 'completed', label: 'Completed' },
  { key: 'archived', label: 'Archived' },
];

export function DashboardProjectList({
  projects,
  statusFilter,
  onStatusFilterChange,
  statusCounts,
  loading,
  orgType,
  orgId,
  onArchive,
  onUnarchive,
  onStatusChange,
}: DashboardProjectListProps) {
  const navigate = useNavigate();

  const filteredProjects = useMemo(() => {
    if (statusFilter === 'setup') {
      return projects.filter((p) => p.status === 'setup' || p.status === 'draft');
    }
    return projects.filter((p) => p.status === statusFilter);
  }, [projects, statusFilter]);

  const canCreateProject = orgType === 'GC' || orgType === 'TC';

  const emptyIcons: Record<string, React.ReactNode> = {
    GC: <Briefcase className="h-8 w-8 text-muted-foreground" />,
    TC: <Briefcase className="h-8 w-8 text-muted-foreground" />,
    FC: <HardHat className="h-8 w-8 text-muted-foreground" />,
    SUPPLIER: <Truck className="h-8 w-8 text-muted-foreground" />,
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="font-heading text-[1rem] font-bold text-foreground">Projects</h3>
        <span className="text-[0.72rem] text-muted-foreground">{filteredProjects.length} items</span>
      </div>

      {/* Status Filter Tabs */}
      <div className="px-4 pb-2.5 flex gap-1 overflow-x-auto scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => onStatusFilterChange(f.key)}
            className={cn(
              'text-[0.75rem] md:text-[0.7rem] font-medium px-3 py-1.5 md:px-2.5 md:py-1 rounded transition-colors whitespace-nowrap min-h-[36px] md:min-h-0 flex items-center gap-1.5',
              statusFilter === f.key
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:bg-accent'
            )}
          >
            <span className={cn('w-2 h-2 rounded-full shrink-0', STATUS_DOT_COLORS[f.key])} />
            {f.label}
            {statusCounts[f.key] > 0 && (
              <span className="text-[0.62rem] text-muted-foreground bg-muted px-1.5 py-0 rounded-full">
                {statusCounts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="px-4 pb-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <span className="text-[1.8rem]">📋</span>
          <p className="text-[0.82rem] text-muted-foreground mt-1">
            {statusFilter === 'active'
              ? 'No active projects yet'
              : `No ${STATUS_LABELS[statusFilter].toLowerCase()} projects`}
          </p>
          {statusFilter === 'active' && canCreateProject && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/create-project')}
              className="mt-3 h-9 text-xs"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create Project
            </Button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="px-4 py-3.5 border-l-[3px] border-l-transparent hover:border-l-primary hover:bg-accent/60 transition-all cursor-pointer flex items-center gap-3 group"
              style={{ minHeight: '56px' }}
              onClick={() => navigate(`/project/${project.id}`)}
            >
              {/* Status dot */}
              <span
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  STATUS_DOT_COLORS[project.status] || 'bg-muted-foreground'
                )}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[0.82rem] font-semibold text-foreground truncate">
                    {project.name}
                  </span>
                  {project.pendingActions > 0 && (
                    <Badge className="text-[0.58rem] px-1.5 py-0 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 shrink-0">
                      {project.pendingActions} pending
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[0.68rem] text-muted-foreground truncate">
                    {project.project_type}
                  </span>
                  {project.userRole && (
                    <Badge className="text-[0.58rem] px-1.5 py-0 bg-secondary text-secondary-foreground shrink-0">
                      {project.userRole}
                    </Badge>
                  )}
                  <Badge
                    className={cn(
                      'text-[0.58rem] px-1.5 py-0 capitalize shrink-0',
                      STATUS_BADGE_STYLES[project.status] || STATUS_BADGE_STYLES.active
                    )}
                  >
                    {project.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>

              {/* Contract value */}
              <span className="text-[0.82rem] font-semibold text-foreground shrink-0">
              {project.contractValue != null ? formatCurrency(project.contractValue) : '—'}
              </span>

              {/* Chevron indicator */}
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
              </span>

              {/* Actions menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-1.5 rounded hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  {project.status === 'archived' ? (
                    <DropdownMenuItem onClick={() => onUnarchive(project.id)}>
                      Unarchive
                    </DropdownMenuItem>
                  ) : (
                    <>
                      {project.status !== 'active' && (
                        <DropdownMenuItem onClick={() => onStatusChange(project.id, 'active')}>
                          Set Active
                        </DropdownMenuItem>
                      )}
                      {project.status !== 'on_hold' && (
                        <DropdownMenuItem onClick={() => onStatusChange(project.id, 'on_hold')}>
                          Put On Hold
                        </DropdownMenuItem>
                      )}
                      {project.status !== 'completed' && (
                        <DropdownMenuItem onClick={() => onStatusChange(project.id, 'completed')}>
                          Mark Completed
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => onArchive(project.id)}
                        className="text-destructive"
                      >
                        Archive
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

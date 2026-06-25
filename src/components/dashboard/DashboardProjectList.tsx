import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency } from '@/lib/utils';
import type { ProjectStatusFilter } from './StatusMenu';

const STATUS_DOT_COLORS: Record<string, string> = {
  setup: 'bg-violet-500',
  draft: 'bg-violet-500',
  active: 'bg-green-500',
  on_hold: 'bg-amber-500',
  completed: 'bg-blue-500',
  archived: 'bg-muted-foreground',
};

const STATUS_LABELS: Record<ProjectStatusFilter, string> = {
  setup: 'Setup',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  archived: 'Archived',
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

function ProjectAccordionCard({
  project,
  index,
  onNavigate,
  onArchive,
  onUnarchive,
  onStatusChange,
}: {
  project: Project;
  index: number;
  onNavigate: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onStatusChange: (id: string, status: 'active' | 'on_hold' | 'completed') => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [barWidth, setBarWidth] = useState(0);
  const mounted = useRef(false);

  const percent = project.pendingActions > 0 ? Math.min(project.pendingActions * 20, 100) : 0;

  useEffect(() => {
    const t = setTimeout(() => {
      mounted.current = true;
      setBarWidth(percent);
    }, 200 + index * 60);
    return () => clearTimeout(t);
  }, [percent, index]);

  const dotColor = STATUS_DOT_COLORS[project.status] || 'bg-muted-foreground';

  return (
    <div
      className="bg-card border border-border rounded-lg overflow-hidden opacity-0 animate-[fadeUp_400ms_ease-out_forwards]"
      style={{ animationDelay: `${200 + index * 50}ms` }}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-accent/50 transition-colors"
      >
        <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', dotColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-foreground text-sm font-semibold truncate">
              {project.name}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
              {project.project_type}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-muted-foreground text-xs">
              {project.contractValue != null ? formatCurrency(project.contractValue) : '—'}
            </span>
            <span className="text-muted-foreground/60 text-xs capitalize">{project.status.replace(/_/g, ' ')}</span>
          </div>
        </div>
        <ChevronDown
          className={cn('w-4 h-4 text-muted-foreground transition-transform duration-300', expanded && 'rotate-180')}
        />
      </button>

      {/* Progress bar */}
      <div className="h-[2px] bg-border mx-3.5">
        <div
          className="h-full rounded-full transition-all duration-[1200ms] ease-out bg-primary"
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Expanded content */}
      <div
        className="overflow-hidden transition-all duration-[380ms]"
        style={{
          maxHeight: expanded ? '260px' : '0',
          transitionTimingFunction: 'cubic-bezier(.22,1,.36,1)',
        }}
      >
        <div className="p-3.5 pt-3">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label: 'Contract', value: project.contractValue != null ? formatCurrency(project.contractValue) : '—' },
              { label: 'Type', value: project.project_type },
              { label: 'Pending', value: `${project.pendingActions} items` },
              { label: 'Status', value: project.status.replace(/_/g, ' ') },
            ].map((tile, i) => (
              <div key={i} className="bg-accent/50 rounded px-2.5 py-2">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{tile.label}</p>
                <p className="text-foreground text-sm font-medium mt-0.5 capitalize">
                  {tile.value}
                </p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onNavigate(project.id); }}
              className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              View Project
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="px-3 py-2 rounded-md bg-accent text-muted-foreground text-xs font-medium hover:bg-accent/80 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {project.status === 'archived' ? (
                  <DropdownMenuItem onClick={() => onUnarchive(project.id)}>Unarchive</DropdownMenuItem>
                ) : (
                  <>
                    {project.status !== 'active' && (
                      <DropdownMenuItem onClick={() => onStatusChange(project.id, 'active')}>Set Active</DropdownMenuItem>
                    )}
                    {project.status !== 'on_hold' && (
                      <DropdownMenuItem onClick={() => onStatusChange(project.id, 'on_hold')}>Put On Hold</DropdownMenuItem>
                    )}
                    {project.status !== 'completed' && (
                      <DropdownMenuItem onClick={() => onStatusChange(project.id, 'completed')}>Mark Completed</DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onArchive(project.id)} className="text-destructive">Archive</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

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

  const canCreateProject = orgType === 'GC' || orgType === 'TC' || orgType === 'SUPPLIER';

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="card-section-title">Projects</h3>
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
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <span className="text-[1.8rem]">📋</span>
          <p className="text-[0.82rem] text-muted-foreground mt-1">
            {statusFilter === 'active' ? 'No active projects yet' : `No ${STATUS_LABELS[statusFilter].toLowerCase()} projects`}
          </p>
          {statusFilter === 'active' && canCreateProject && (
            <Button variant="outline" size="sm" onClick={() => navigate('/create-project')} className="mt-3 h-9 text-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create Project
            </Button>
          )}
        </div>
      ) : (
        <div className="px-3.5 pb-3.5 space-y-2">
          {filteredProjects.map((project, index) => (
            <ProjectAccordionCard
              key={project.id}
              project={project}
              index={index}
              onNavigate={(id) => navigate(`/project/${id}`)}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Plus, HardHat, Truck, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { StatusMenu, type ProjectStatusFilter } from './StatusMenu';
import { ProjectRow } from './ProjectRow';

const STATUS_LABELS: Record<ProjectStatusFilter, string> = {
  setup: 'Setup',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  archived: 'Archived',
};

const STATUS_COLORS: Record<ProjectStatusFilter, string> = {
  setup: 'bg-violet-500',
  active: 'bg-green-500',
  on_hold: 'bg-amber-500',
  completed: 'bg-blue-500',
  archived: 'bg-muted-foreground',
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
  onArchive: (projectId: string) => void;
  onUnarchive: (projectId: string) => void;
  onStatusChange: (projectId: string, status: 'active' | 'on_hold' | 'completed') => void;
}

export function DashboardProjectList({
  projects,
  statusFilter,
  onStatusFilterChange,
  statusCounts,
  loading,
  orgType,
  onArchive,
  onUnarchive,
  onStatusChange,
}: DashboardProjectListProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [statusOpen, setStatusOpen] = useState(false);

  const filteredProjects = useMemo(() => {
    if (statusFilter === 'setup') {
      return projects.filter((p) => p.status === 'setup' || p.status === 'draft');
    }
    return projects.filter((p) => p.status === statusFilter);
  }, [projects, statusFilter]);

  const canCreateProject = orgType === 'GC' || orgType === 'TC';

  // Check if any non-current status has items (hint dot)
  const hasOtherItems = useMemo(() => {
    return Object.entries(statusCounts).some(
      ([key, count]) => key !== statusFilter && count > 0
    );
  }, [statusCounts, statusFilter]);

  const handleMobileFilterChange = (filter: ProjectStatusFilter) => {
    onStatusFilterChange(filter);
    setStatusOpen(false);
  };

  const emptyStateConfig = {
    GC: {
      icon: <Briefcase className="h-8 w-8 text-muted-foreground" />,
      title: 'No Projects Yet',
      description: 'Create your first project to start managing work orders, invoices, and your team.',
      showCTA: true,
    },
    TC: {
      icon: <Briefcase className="h-8 w-8 text-muted-foreground" />,
      title: 'No Projects Yet',
      description: 'Create a project or wait for a general contractor to invite you.',
      showCTA: true,
    },
    FC: {
      icon: <HardHat className="h-8 w-8 text-muted-foreground" />,
      title: 'No Projects Yet',
      description: "You'll see projects here once a contractor invites you to their team.",
      showCTA: false,
    },
    SUPPLIER: {
      icon: <Truck className="h-8 w-8 text-muted-foreground" />,
      title: 'No Projects Yet',
      description: "Projects will appear once you're added to a contractor's team.",
      showCTA: false,
    },
  };

  const emptyState = emptyStateConfig[orgType as keyof typeof emptyStateConfig] || emptyStateConfig.FC;

  return (
    <div className="space-y-0">
      {/* Status Tabs - Collapsible on mobile */}
      {isMobile ? (
        <Collapsible open={statusOpen} onOpenChange={setStatusOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2.5 px-1">
            <div className="flex items-center gap-2">
              <span className={cn('w-2.5 h-2.5 rounded-full', STATUS_COLORS[statusFilter])} />
              <span className="text-sm font-medium">{STATUS_LABELS[statusFilter]}</span>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                {statusCounts[statusFilter]}
              </span>
              {hasOtherItems && !statusOpen && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </div>
            <ChevronDown className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              statusOpen && 'rotate-180'
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <StatusMenu
              currentFilter={statusFilter}
              onFilterChange={handleMobileFilterChange}
              counts={statusCounts}
            />
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <StatusMenu
          currentFilter={statusFilter}
          onFilterChange={onStatusFilterChange}
          counts={statusCounts}
        />
      )}

      {/* Project List */}
      <div className="mt-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  {statusFilter !== 'active' ? (
                    <Briefcase className="h-8 w-8 text-muted-foreground" />
                  ) : (
                    emptyState.icon
                  )}
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {statusFilter === 'archived'
                  ? 'No Archived Projects'
                  : statusFilter !== 'active'
                  ? 'No Projects Found'
                  : emptyState.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                {statusFilter === 'active'
                  ? emptyState.description
                  : statusFilter === 'archived'
                  ? 'Archived projects will appear here.'
                  : 'No projects match this filter.'}
              </p>
              {statusFilter === 'active' && canCreateProject && emptyState.showCTA && (
                <Button onClick={() => navigate('/create-project')} className="h-11">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Project
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredProjects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                userRole={project.userRole}
                contractValue={project.contractValue}
                pendingActions={project.pendingActions}
                orgType={orgType}
                onArchive={onArchive}
                onUnarchive={onUnarchive}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

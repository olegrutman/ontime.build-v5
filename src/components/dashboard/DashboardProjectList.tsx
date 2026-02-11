import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Plus, HardHat, Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusMenu, type ProjectStatusFilter } from './StatusMenu';
import { ProjectRow } from './ProjectRow';

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
  statusCounts: { active: number; on_hold: number; completed: number; archived: number };
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

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => p.status === statusFilter);
  }, [projects, statusFilter]);

  const canCreateProject = orgType === 'GC' || orgType === 'TC';

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
      {/* Inline Status Tabs */}
      <StatusMenu
        currentFilter={statusFilter}
        onFilterChange={onStatusFilterChange}
        counts={statusCounts}
      />

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

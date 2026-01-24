import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Briefcase, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  QuickActions,
  SummaryCards,
  ProjectListFilters,
  ProjectRow,
  NeedsAttentionPanel,
  ArchiveProjectDialog,
  type ProjectStatusFilter,
} from '@/components/dashboard';

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userOrgRoles, loading: authLoading, needsOrgSetup } = useAuth();
  const {
    projects,
    statusCounts,
    needsAttention,
    attentionItems,
    billing,
    thisMonth,
    loading: dataLoading,
    refetch,
  } = useDashboardData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>('active');
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [projectToArchive, setProjectToArchive] = useState<{ id: string; name: string } | null>(null);

  const currentOrg = userOrgRoles[0]?.organization;

  // Filter projects by search and status
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => p.status === statusFilter)
      .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [projects, statusFilter, searchQuery]);

  const handleArchive = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setProjectToArchive({ id: project.id, name: project.name });
      setArchiveDialogOpen(true);
    }
  };

  const handleUnarchive = async (projectId: string) => {
    const { error } = await supabase
      .from('projects')
      .update({ status: 'active' })
      .eq('id', projectId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to unarchive project', variant: 'destructive' });
    } else {
      toast({ title: 'Project Unarchived', description: 'The project has been restored to Active.' });
      refetch();
    }
  };

  const confirmArchive = async () => {
    if (!projectToArchive) return;

    const { error } = await supabase
      .from('projects')
      .update({ status: 'archived' })
      .eq('id', projectToArchive.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to archive project', variant: 'destructive' });
    } else {
      toast({ title: 'Project Archived', description: 'The project has been moved to Archived.' });
      refetch();
    }
    setArchiveDialogOpen(false);
    setProjectToArchive(null);
  };

  const handleActiveClick = () => setStatusFilter('active');
  const handleAttentionClick = () => {
    if (attentionItems.length > 0) {
      const firstItem = attentionItems[0];
      if (firstItem.type === 'change_order') {
        navigate(`/change-orders?project=${firstItem.projectId}`);
      } else if (firstItem.type === 'invoice') {
        navigate(`/project/${firstItem.projectId}?tab=invoices`);
      } else {
        navigate(`/project/${firstItem.projectId}?tab=team`);
      }
    }
  };

  const loading = authLoading || dataLoading;

  if (authLoading) {
    return (
      <AppLayout title="Dashboard">
        <div className="p-4 sm:p-6 space-y-6">
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout title="Dashboard">
        <div className="p-6">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <h2 className="text-lg font-semibold mb-2">Welcome to Ontime.Build</h2>
              <p className="text-muted-foreground mb-4">
                Please sign in to access your projects and work items.
              </p>
              <Button onClick={() => navigate('/auth')}>Sign In</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!currentOrg) {
    return (
      <AppLayout title="Dashboard">
        <div className="p-6">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <h2 className="text-lg font-semibold mb-2">No Organization</h2>
              <p className="text-muted-foreground mb-4">
                You need to create an organization to get started.
              </p>
              <Button onClick={() => navigate('/#auth')}>Create Organization</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      <div className="p-4 sm:p-6 space-y-6">
        {/* Quick Actions */}
        <QuickActions onViewArchived={() => setStatusFilter('archived')} />

        {/* Summary Cards */}
        <SummaryCards
          activeProjects={statusCounts.active}
          needsAttention={needsAttention}
          billing={billing}
          thisMonth={thisMonth}
          onActiveClick={handleActiveClick}
          onAttentionClick={handleAttentionClick}
        />

        {/* Main Content: Projects + Attention Panel */}
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Projects Section */}
          <div className="space-y-4">
            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <ProjectListFilters
                currentFilter={statusFilter}
                onFilterChange={setStatusFilter}
                counts={statusCounts}
              />
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Projects List */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <Briefcase className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {statusFilter === 'archived' ? 'No Archived Projects' : 'No Projects Found'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {statusFilter === 'active' && (currentOrg.type === 'GC' || currentOrg.type === 'TC')
                      ? 'Create your first project to get started.'
                      : statusFilter === 'archived'
                      ? 'Archived projects will appear here.'
                      : 'No projects match your current filters.'}
                  </p>
                  {statusFilter === 'active' && (currentOrg.type === 'GC' || currentOrg.type === 'TC') && (
                    <Button onClick={() => navigate('/create-project')}>
                      <Plus className="mr-2 h-4 w-4" />
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
                    onArchive={handleArchive}
                    onUnarchive={handleUnarchive}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Needs Attention Sidebar */}
          <div className="hidden lg:block">
            <NeedsAttentionPanel items={attentionItems} />
          </div>
        </div>

        {/* Mobile Needs Attention (shown below projects) */}
        <div className="lg:hidden">
          <NeedsAttentionPanel items={attentionItems} />
        </div>
      </div>

      {/* Archive Dialog */}
      <ArchiveProjectDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        projectName={projectToArchive?.name || ''}
        onConfirm={confirmArchive}
      />
    </AppLayout>
  );
}

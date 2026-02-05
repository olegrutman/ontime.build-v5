import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  StatusMenu,
  FinancialSnapshotTile,
  NeedsAttentionTile,
  RemindersTile,
  AddReminderDialog,
  ProjectRow,
  PendingInvitesPanel,
  ArchiveProjectDialog,
  CompleteProjectDialog,
  type ProjectStatusFilter,
} from '@/components/dashboard';

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userOrgRoles, loading: authLoading, signOut } = useAuth();
  const {
    projects,
    statusCounts,
    attentionItems,
    pendingInvites,
    billing,
    financials,
    reminders,
    loading: dataLoading,
    refetch,
  } = useDashboardData();

  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>('active');
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [projectToArchive, setProjectToArchive] = useState<{ id: string; name: string } | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [projectToComplete, setProjectToComplete] = useState<{ id: string; name: string } | null>(null);
  const [addReminderOpen, setAddReminderOpen] = useState(false);

  const currentOrg = userOrgRoles[0]?.organization;

  // Filter projects by status
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => p.status === statusFilter);
  }, [projects, statusFilter]);

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

  const handleStatusChange = (projectId: string, status: 'active' | 'on_hold' | 'completed') => {
    if (status === 'completed') {
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        setProjectToComplete({ id: project.id, name: project.name });
        setCompleteDialogOpen(true);
      }
      return;
    }
    updateProjectStatus(projectId, status);
  };

  const updateProjectStatus = async (projectId: string, status: 'active' | 'on_hold' | 'completed') => {
    const statusLabels = { active: 'Active', on_hold: 'On Hold', completed: 'Completed' };
    const { error } = await supabase.from('projects').update({ status }).eq('id', projectId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update project status', variant: 'destructive' });
    } else {
      toast({ title: 'Status Updated', description: `Project is now ${statusLabels[status]}.` });
      refetch();
    }
  };

  const confirmComplete = async () => {
    if (!projectToComplete) return;
    await updateProjectStatus(projectToComplete.id, 'completed');
    setCompleteDialogOpen(false);
    setProjectToComplete(null);
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

  const handleCompleteReminder = async (reminderId: string) => {
    const { error } = await supabase
      .from('reminders')
      .update({ completed: true })
      .eq('id', reminderId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to complete reminder', variant: 'destructive' });
    } else {
      refetch();
    }
  };

  const handleAddReminder = async (reminder: { title: string; due_date: string; project_id?: string }) => {
    if (!user || !currentOrg) return;
    
    const { error } = await supabase.from('reminders').insert({
      user_id: user.id,
      org_id: currentOrg.id,
      title: reminder.title,
      due_date: reminder.due_date,
      project_id: reminder.project_id === 'none' ? null : reminder.project_id,
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to add reminder', variant: 'destructive' });
    } else {
      toast({ title: 'Reminder Added', description: 'Your reminder has been saved.' });
      refetch();
    }
  };

  const loading = authLoading || dataLoading;

  if (authLoading) {
    return (
      <AppLayout title="Dashboard">
        <div className="p-4 sm:p-6 space-y-6">
          <Skeleton className="h-12 w-full max-w-lg" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
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
              <h2 className="text-lg font-semibold mb-2">Account Setup Incomplete</h2>
              <p className="text-muted-foreground mb-4">
                Your account is not linked to an organization. Please sign out and create a new account.
              </p>
              <Button variant="outline" onClick={() => signOut()}>Sign Out</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      {/* Sticky Status Menu */}
      <StatusMenu
        currentFilter={statusFilter}
        onFilterChange={setStatusFilter}
        counts={statusCounts}
      />
      
      <div className="p-4 sm:p-6 space-y-6">
        {/* Dashboard Tiles - 3 columns on desktop */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FinancialSnapshotTile
            role={billing.role}
            totalContractValue={financials.totalContracts}
            outstandingToPay={billing.outstandingToPay}
            outstandingToCollect={billing.outstandingToCollect}
            profitMargin={financials.profitMargin}
            totalRevenue={financials.totalRevenue}
            totalCosts={financials.totalCosts}
          />
          
          <NeedsAttentionTile
            items={attentionItems}
            pendingInvitesCount={pendingInvites.length}
          />
          
          <RemindersTile
            reminders={reminders}
            onComplete={handleCompleteReminder}
            onAdd={() => setAddReminderOpen(true)}
          />
        </div>
        
        {/* Pending Invites */}
        <div id="pending-invites">
          <PendingInvitesPanel invites={pendingInvites} onRefresh={refetch} />
        </div>
        
        {/* Project List */}
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
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ArchiveProjectDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        projectName={projectToArchive?.name || ''}
        onConfirm={confirmArchive}
      />

      <CompleteProjectDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        projectName={projectToComplete?.name || ''}
        onConfirm={confirmComplete}
      />

      <AddReminderDialog
        open={addReminderOpen}
        onOpenChange={setAddReminderOpen}
        onAdd={handleAddReminder}
        projects={projects.filter(p => p.status === 'active').map(p => ({ id: p.id, name: p.name }))}
      />
    </AppLayout>
  );
}

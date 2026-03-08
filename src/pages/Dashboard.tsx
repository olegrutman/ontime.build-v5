import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  ArchiveProjectDialog,
  CompleteProjectDialog,
  type ProjectStatusFilter,
} from '@/components/dashboard';
import { DashboardAttentionBanner } from '@/components/dashboard/DashboardAttentionBanner';
import { DashboardProjectList } from '@/components/dashboard/DashboardProjectList';
import { OrgInviteBanner } from '@/components/dashboard/OrgInviteBanner';
import { DashboardQuickStats } from '@/components/dashboard/DashboardQuickStats';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { useProfile } from '@/hooks/useProfile';

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userOrgRoles, loading: authLoading, signOut } = useAuth();
  const {
    projects,
    statusCounts,
    attentionItems,
    pendingInvites,
    reminders,
    loading: dataLoading,
    refetch,
  } = useDashboardData();

  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>('active');
  const hasAutoSwitched = useRef(false);

  useEffect(() => {
    if (!hasAutoSwitched.current && !dataLoading && statusCounts.setup > 0) {
      setStatusFilter('setup');
      hasAutoSwitched.current = true;
    }
  }, [dataLoading, statusCounts.setup]);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [projectToArchive, setProjectToArchive] = useState<{ id: string; name: string } | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [projectToComplete, setProjectToComplete] = useState<{ id: string; name: string } | null>(null);

  const { profile, organization, userSettings, updateUserSettings } = useProfile();
  const currentOrg = userOrgRoles[0]?.organization;
  const orgType = currentOrg?.type || null;
  const orgId = currentOrg?.id;
  const [soleMember, setSoleMember] = useState(() =>
    orgId ? localStorage.getItem(`ontime_sole_member_${orgId}`) === 'true' : false
  );

  const handleArchive = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setProjectToArchive({ id: project.id, name: project.name });
      setArchiveDialogOpen(true);
    }
  };

  // 9. Optimistic UI for unarchive
  const handleUnarchive = useCallback(async (projectId: string) => {
    // Optimistic: trigger refetch immediately after API call
    const { error } = await supabase
      .from('projects')
      .update({ status: 'active' })
      .eq('id', projectId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to unarchive project', variant: 'destructive' });
    } else {
      toast({ title: 'Project Unarchived', description: 'The project has been restored to Active.' });
    }
    refetch();
  }, [toast, refetch]);

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

  // 9. Optimistic UI for status changes
  const updateProjectStatus = useCallback(async (projectId: string, status: 'active' | 'on_hold' | 'completed') => {
    const statusLabels = { active: 'Active', on_hold: 'On Hold', completed: 'Completed' };
    const { error } = await supabase.from('projects').update({ status }).eq('id', projectId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update project status', variant: 'destructive' });
    } else {
      toast({ title: 'Status Updated', description: `Project is now ${statusLabels[status]}.` });
    }
    refetch();
  }, [toast, refetch]);

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
    }
    refetch();
    setArchiveDialogOpen(false);
    setProjectToArchive(null);
  };

  const loading = authLoading || dataLoading;

  if (authLoading) {
    return (
      <AppLayout title="Dashboard">
        <div className="p-4 sm:p-6 space-y-6">
          <Skeleton className="h-24 w-full" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
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

  const canCreateProject = orgType === 'GC' || orgType === 'TC';

  // Onboarding state
  const showOnboarding = userSettings && !userSettings.onboarding_dismissed;
  const profileComplete = !!(profile?.first_name && profile?.phone);
  const orgComplete = !!(organization?.address?.street);
  const isOrgAdmin = userOrgRoles[0]?.is_admin ?? false;
  const teamInvited = !isOrgAdmin || (userOrgRoles.length > 1) || soleMember;
  const projectCreated = projects.length > 0;

  const handleDismissOnboarding = async () => {
    await updateUserSettings({ onboarding_dismissed: true });
  };

  const handleMarkSoleMember = () => {
    if (orgId) {
      localStorage.setItem(`ontime_sole_member_${orgId}`, 'true');
      setSoleMember(true);
    }
  };

  const handleMarkPartOfTeam = () => {
    if (orgId) {
      localStorage.setItem(`ontime_part_of_team_${orgId}`, 'true');
      setSoleMember(true); // marks step as done without claiming sole member
    }
  };

  // Quick stats
  const openWorkOrders = attentionItems.filter(i => i.type === 'change_order').length;
  const pendingInvoicesCount = attentionItems.filter(i => i.type === 'invoice').length;
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const remindersDue = reminders.filter(r => new Date(r.due_date) <= weekFromNow).length;

  return (
    <AppLayout
      title="Dashboard"
      showNewButton={canCreateProject}
      onNewClick={() => navigate('/create-project')}
      newButtonLabel="New Project"
    >
      <div className="space-y-4 sm:space-y-6">
        {showOnboarding && (
          <OnboardingChecklist
            profileComplete={profileComplete}
            orgComplete={orgComplete}
            teamInvited={teamInvited}
            projectCreated={projectCreated}
            orgType={orgType}
            onDismiss={handleDismissOnboarding}
            onMarkSoleMember={handleMarkSoleMember}
            onMarkPartOfTeam={handleMarkPartOfTeam}
          />
        )}

        <OrgInviteBanner />

        <DashboardQuickStats
          openWorkOrders={openWorkOrders}
          pendingInvoices={pendingInvoicesCount}
          remindersDue={remindersDue}
        />

        <DashboardAttentionBanner
          attentionItems={attentionItems}
          pendingInvites={pendingInvites}
          onRefresh={refetch}
        />

        <DashboardProjectList
          projects={projects}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          statusCounts={statusCounts}
          loading={loading}
          orgType={orgType}
          onArchive={handleArchive}
          onUnarchive={handleUnarchive}
          onStatusChange={handleStatusChange}
        />
      </div>

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
    </AppLayout>
  );
}

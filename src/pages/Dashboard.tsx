import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { SupplierDashboard } from '@/components/dashboard/SupplierDashboard';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  ArchiveProjectDialog,
  CompleteProjectDialog,
  AddReminderDialog,
} from '@/components/dashboard';
import { OrgInviteBanner } from '@/components/dashboard/OrgInviteBanner';
import { PendingInvitesPanel } from '@/components/dashboard/PendingInvitesPanel';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { useProfile } from '@/hooks/useProfile';
import { DashboardKPIRow } from '@/components/dashboard/DashboardKPIRow';
import { DashboardProjectList } from '@/components/dashboard/DashboardProjectList';
import { DashboardRecentDocs } from '@/components/dashboard/DashboardRecentDocs';
import type { ProjectStatusFilter } from '@/components/dashboard/StatusMenu';
import { DashboardBudgetCard } from '@/components/dashboard/DashboardBudgetCard';
import { DashboardNeedsAttentionCard } from '@/components/dashboard/DashboardNeedsAttentionCard';
import { RemindersTile } from '@/components/dashboard/RemindersTile';

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
    recentDocs,
    billing,
    financials,
    loading: dataLoading,
    refetch,
  } = useDashboardData();

  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [projectToArchive, setProjectToArchive] = useState<{ id: string; name: string } | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [projectToComplete, setProjectToComplete] = useState<{ id: string; name: string } | null>(null);
  const [addReminderOpen, setAddReminderOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>('active');
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!dataLoading && !hasInitialized.current) {
      hasInitialized.current = true;
      if (statusCounts.setup > 0) {
        setStatusFilter('setup');
      }
    }
  }, [dataLoading, statusCounts]);

  const { profile, organization, userSettings, updateUserSettings } = useProfile();
  const currentOrg = userOrgRoles[0]?.organization;
  const orgType = currentOrg?.type || null;
  const orgId = currentOrg?.id;
  const [soleMember, setSoleMember] = useState(() =>
    orgId ? localStorage.getItem(`ontime_sole_member_${orgId}`) === 'true' : false
  );

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

  const handleAddReminder = async (reminder: { title: string; due_date: string; project_id?: string }) => {
    if (!user || !currentOrg) return;
    const { error } = await supabase.from('reminders').insert({
      title: reminder.title,
      due_date: reminder.due_date,
      project_id: reminder.project_id || null,
      user_id: user.id,
      org_id: currentOrg.id,
    });
    if (error) {
      toast({ title: 'Error', description: 'Failed to add reminder', variant: 'destructive' });
    } else {
      toast({ title: 'Reminder Added' });
      refetch();
    }
  };

  const loading = authLoading || dataLoading;

  if (authLoading) {
    return (
      <AppLayout title="Dashboard">
        <div className="p-4 sm:p-6 space-y-6">
          <Skeleton className="h-24 w-full" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
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
              <p className="text-muted-foreground mb-4">Please sign in to access your projects.</p>
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
              <p className="text-muted-foreground mb-4">Your account is not linked to an organization.</p>
              <Button variant="outline" onClick={() => signOut()}>Sign Out</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Supplier gets a completely different dashboard
  if (orgType === 'SUPPLIER') {
    return <SupplierDashboard pendingInvites={pendingInvites} onRefreshInvites={refetch} />;
  }

  const canCreateProject = orgType === 'GC' || orgType === 'TC';
  const isOrgAdmin = userOrgRoles[0]?.is_admin ?? false;
  const showOnboarding = userSettings && !userSettings.onboarding_dismissed;
  const profileComplete = !!(profile?.first_name && profile?.phone);
  const orgComplete = !!(organization?.address?.street);
  const teamInvited = !isOrgAdmin || (userOrgRoles.length > 1) || soleMember;
  const projectCreated = projects.length > 0;

  const activeProject = projects.find(p => p.status === 'active');
  const totalAttention = attentionItems.length + pendingInvites.length;

  return (
    <AppLayout
      title="Dashboard"
      showNewButton={canCreateProject}
      onNewClick={() => navigate('/create-project')}
      newButtonLabel="New Project"
    >
      <div className="space-y-2.5">
        {showOnboarding && (
          <OnboardingChecklist
            profileComplete={profileComplete}
            orgComplete={orgComplete}
            teamInvited={teamInvited}
            projectCreated={projectCreated}
            orgType={orgType}
            onDismiss={async () => updateUserSettings({ onboarding_dismissed: true })}
            onMarkSoleMember={() => {
              if (orgId) { localStorage.setItem(`ontime_sole_member_${orgId}`, 'true'); setSoleMember(true); }
            }}
            onMarkPartOfTeam={() => {
              if (orgId) { localStorage.setItem(`ontime_part_of_team_${orgId}`, 'true'); setSoleMember(true); }
            }}
          />
        )}

        <OrgInviteBanner />

        {pendingInvites.length > 0 && (
          <PendingInvitesPanel invites={pendingInvites} onRefresh={refetch} />
        )}

        {/* KPI Row */}
        <DashboardKPIRow
          financials={financials}
          billing={billing}
          attentionCount={totalAttention}
        />

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-2.5">
          {/* Left column */}
          <div className="space-y-2.5">
            <DashboardProjectList
              projects={projects}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              statusCounts={statusCounts}
              loading={loading}
              orgType={orgType}
              orgId={orgId}
              onArchive={(id) => {
                const p = projects.find(proj => proj.id === id);
                if (p) { setProjectToArchive({ id, name: p.name }); setArchiveDialogOpen(true); }
              }}
              onUnarchive={(id) => updateProjectStatus(id, 'active')}
              onStatusChange={(id, status) => {
                if (status === 'completed') {
                  const p = projects.find(proj => proj.id === id);
                  if (p) { setProjectToComplete({ id, name: p.name }); setCompleteDialogOpen(true); }
                } else {
                  updateProjectStatus(id, status);
                }
              }}
            />
            <DashboardRecentDocs docs={recentDocs} />
          </div>

          {/* Right column */}
          <div className="space-y-2.5">
            <DashboardBudgetCard
              financials={financials}
              billing={billing}
              activeProjectName={activeProject?.name || null}
              activeProjectId={activeProject?.id || null}
            />
            <DashboardNeedsAttentionCard
              attentionItems={attentionItems}
              pendingInvites={pendingInvites}
              onRefresh={refetch}
            />
            <RemindersTile
              reminders={reminders.map(r => ({ ...r, completed: false }))}
              onComplete={async (id) => {
                await supabase.from('reminders').update({ completed: true }).eq('id', id);
                refetch();
              }}
              onAdd={() => setAddReminderOpen(true)}
            />
          </div>
        </div>
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
      <AddReminderDialog
        open={addReminderOpen}
        onOpenChange={setAddReminderOpen}
        onAdd={handleAddReminder}
        projects={projects.map(p => ({ id: p.id, name: p.name }))}
      />
    </AppLayout>
  );
}

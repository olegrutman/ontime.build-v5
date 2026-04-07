import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { SupplierDashboardView } from '@/components/dashboard/SupplierDashboardView';
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
import { DashboardBusinessSnapshot } from '@/components/dashboard/DashboardBusinessSnapshot';
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs';

import { DashboardMaterialsHealth } from '@/components/dashboard/DashboardMaterialsHealth';
import { ProjectSnapshotList } from '@/components/dashboard/ProjectSnapshotList';
import { DashboardActionQueue } from '@/components/dashboard/DashboardActionQueue';
import { RemindersTile } from '@/components/dashboard/RemindersTile';
import { DashboardWelcome } from '@/components/dashboard/DashboardWelcome';
import { DashboardSidebar } from '@/components/app-shell/DashboardSidebar';
import { GCDashboardView } from '@/components/dashboard/GCDashboardView';
import { TCDashboardView } from '@/components/dashboard/TCDashboardView';
import { FCDashboardView } from '@/components/dashboard/FCDashboardView';
import type { ProjectStatusFilter } from '@/components/dashboard/StatusMenu';

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
    projectFinancials,
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
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout title="Dashboard">
        <div className="p-6">
          <Card className="max-w-md mx-auto rounded-2xl">
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
          <Card className="max-w-md mx-auto rounded-2xl">
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

  const canCreateProject = orgType === 'GC' || orgType === 'TC' || orgType === 'SUPPLIER';
  const isOrgAdmin = userOrgRoles[0]?.is_admin ?? false;

  // Supplier gets the expandable KPI card dashboard
  if (orgType === 'SUPPLIER') {
    return (
      <AppLayout title="Dashboard" fullWidth>
        <SupplierDashboardView
          projects={projects}
          financials={financials}
          projectFinancials={projectFinancials}
          billing={billing}
          attentionItems={attentionItems}
          pendingInvites={pendingInvites}
          recentDocs={recentDocs}
          statusCounts={statusCounts}
          profile={profile}
          organization={organization}
          userSettings={userSettings}
          updateUserSettings={updateUserSettings as any}
          isOrgAdmin={isOrgAdmin}
          userOrgRolesLength={userOrgRoles.length}
          orgType={orgType}
          orgId={orgId}
          soleMember={soleMember}
          onSetSoleMember={() => { if (orgId) { localStorage.setItem(`ontime_sole_member_${orgId}`, 'true'); setSoleMember(true); } }}
          onSetPartOfTeam={() => { if (orgId) { localStorage.setItem(`ontime_part_of_team_${orgId}`, 'true'); setSoleMember(true); } }}
          onRefresh={refetch}
          loading={loading}
        />
        <ArchiveProjectDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen} projectName={projectToArchive?.name || ''} onConfirm={confirmArchive} />
        <CompleteProjectDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen} projectName={projectToComplete?.name || ''} onConfirm={confirmComplete} />
        <AddReminderDialog open={addReminderOpen} onOpenChange={setAddReminderOpen} onAdd={handleAddReminder} projects={projects.map(p => ({ id: p.id, name: p.name }))} />
      </AppLayout>
    );
  }

  // GC gets the expandable KPI card dashboard
  if (orgType === 'GC') {
    return (
      <AppLayout title="Dashboard" fullWidth showNewButton={canCreateProject} onNewClick={() => navigate('/create-project')} newButtonLabel="New Project">
        <GCDashboardView
          projects={projects}
          financials={financials}
          projectFinancials={projectFinancials}
          billing={billing}
          attentionItems={attentionItems}
          pendingInvites={pendingInvites}
          recentDocs={recentDocs}
          statusCounts={statusCounts}
          profile={profile}
          organization={organization}
          userSettings={userSettings}
          updateUserSettings={updateUserSettings as any}
          isOrgAdmin={isOrgAdmin}
          userOrgRolesLength={userOrgRoles.length}
          orgType={orgType}
          orgId={orgId}
          soleMember={soleMember}
          onSetSoleMember={() => { if (orgId) { localStorage.setItem(`ontime_sole_member_${orgId}`, 'true'); setSoleMember(true); } }}
          onSetPartOfTeam={() => { if (orgId) { localStorage.setItem(`ontime_part_of_team_${orgId}`, 'true'); setSoleMember(true); } }}
          onRefresh={refetch}
          loading={loading}
        />
        <ArchiveProjectDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen} projectName={projectToArchive?.name || ''} onConfirm={confirmArchive} />
        <CompleteProjectDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen} projectName={projectToComplete?.name || ''} onConfirm={confirmComplete} />
        <AddReminderDialog open={addReminderOpen} onOpenChange={setAddReminderOpen} onAdd={handleAddReminder} projects={projects.map(p => ({ id: p.id, name: p.name }))} />
      </AppLayout>
    );
  }

  // TC gets a dedicated KPI card dashboard
  if (orgType === 'TC') {
    return (
      <AppLayout title="Dashboard" fullWidth showNewButton={canCreateProject} onNewClick={() => navigate('/create-project')} newButtonLabel="New Project">
        <TCDashboardView
          projects={projects}
          financials={financials}
          projectFinancials={projectFinancials}
          billing={billing}
          attentionItems={attentionItems}
          pendingInvites={pendingInvites}
          recentDocs={recentDocs}
          statusCounts={statusCounts}
          profile={profile}
          organization={organization}
          userSettings={userSettings}
          updateUserSettings={updateUserSettings as any}
          isOrgAdmin={isOrgAdmin}
          userOrgRolesLength={userOrgRoles.length}
          orgType={orgType}
          orgId={orgId}
          soleMember={soleMember}
          onSetSoleMember={() => { if (orgId) { localStorage.setItem(`ontime_sole_member_${orgId}`, 'true'); setSoleMember(true); } }}
          onSetPartOfTeam={() => { if (orgId) { localStorage.setItem(`ontime_part_of_team_${orgId}`, 'true'); setSoleMember(true); } }}
          onRefresh={refetch}
          loading={loading}
        />
        <ArchiveProjectDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen} projectName={projectToArchive?.name || ''} onConfirm={confirmArchive} />
        <CompleteProjectDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen} projectName={projectToComplete?.name || ''} onConfirm={confirmComplete} />
        <AddReminderDialog open={addReminderOpen} onOpenChange={setAddReminderOpen} onAdd={handleAddReminder} projects={projects.map(p => ({ id: p.id, name: p.name }))} />
      </AppLayout>
    );
  }

  // FC gets a dedicated KPI card dashboard
  if (orgType === 'FC') {
    return (
      <AppLayout title="Dashboard" fullWidth>
        <FCDashboardView
          projects={projects}
          financials={financials}
          projectFinancials={projectFinancials}
          billing={billing}
          attentionItems={attentionItems}
          pendingInvites={pendingInvites}
          recentDocs={recentDocs}
          statusCounts={statusCounts}
          profile={profile}
          organization={organization}
          userSettings={userSettings}
          updateUserSettings={updateUserSettings as any}
          isOrgAdmin={isOrgAdmin}
          userOrgRolesLength={userOrgRoles.length}
          orgType={orgType}
          orgId={orgId}
          soleMember={soleMember}
          onSetSoleMember={() => { if (orgId) { localStorage.setItem(`ontime_sole_member_${orgId}`, 'true'); setSoleMember(true); } }}
          onSetPartOfTeam={() => { if (orgId) { localStorage.setItem(`ontime_part_of_team_${orgId}`, 'true'); setSoleMember(true); } }}
          onRefresh={refetch}
          loading={loading}
        />
        <ArchiveProjectDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen} projectName={projectToArchive?.name || ''} onConfirm={confirmArchive} />
        <CompleteProjectDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen} projectName={projectToComplete?.name || ''} onConfirm={confirmComplete} />
        <AddReminderDialog open={addReminderOpen} onOpenChange={setAddReminderOpen} onAdd={handleAddReminder} projects={projects.map(p => ({ id: p.id, name: p.name }))} />
      </AppLayout>
    );
  }

  const showOnboarding = userSettings && !userSettings.onboarding_dismissed;
  const profileComplete = !!(profile?.first_name && profile?.phone);
  const orgComplete = !!(organization?.address?.street);
  const teamInvited = !isOrgAdmin || (userOrgRoles.length > 1) || soleMember;
  const projectCreated = projects.length > 0;

  const pendingCOCount = recentDocs.filter(d => d.type === 'change_order' && ['draft', 'shared', 'submitted'].includes(d.status)).length;
  const openPOCount = recentDocs.filter(d => d.type === 'purchase_order' && !['DELIVERED', 'CANCELLED'].includes(d.status)).length;

  return (
    <AppLayout
      title="Dashboard"
      fullWidth
      showNewButton={canCreateProject}
      onNewClick={() => navigate('/create-project')}
      newButtonLabel="New Project"
    >
      <div className="flex gap-0">
        <DashboardSidebar />
        <div className="flex-1 min-w-0 space-y-4 px-4 lg:px-5">

        {/* Greeting */}
        <DashboardWelcome
          firstName={profile?.first_name || null}
          attentionCount={attentionItems.length + pendingInvites.length}
          activeProjects={statusCounts.active}
        />

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
        <DashboardKPIs financials={financials} orgType={orgType} />

        {/* Main 8/4 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left column — 8 cols */}
          <div className="lg:col-span-8 space-y-4">
            {/* Two-col: Materials Health + Action Queue */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DashboardMaterialsHealth
                estimate={financials.totalCosts}
                ordered={financials.paidByYou}
                forecast={financials.totalCosts * 1.04}
              />
              <DashboardActionQueue docs={recentDocs} />
            </div>

            {/* Projects list — merged with attention data */}
            <div id="projects-list">
            <ProjectSnapshotList
              projects={projects}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              statusCounts={statusCounts}
              loading={loading}
              canCreate={canCreateProject}
              onCreateProject={() => navigate('/create-project')}
              orgType={orgType}
              orgId={orgId}
              attentionItems={attentionItems}
            />
            </div>
          </div>

          {/* Right column — 4 cols */}
          <div className="lg:col-span-4 space-y-4">
            <DashboardBusinessSnapshot
              statusCounts={statusCounts}
              attentionCount={attentionItems.length + pendingInvites.length}
              billing={billing}
              pendingCOCount={pendingCOCount}
              openPOCount={openPOCount}
            />
            {/* Reminders */}
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

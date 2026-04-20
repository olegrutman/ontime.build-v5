import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useProjectStatusActions } from '@/hooks/useProjectStatusActions';
import { DashboardProjectList } from '@/components/dashboard/DashboardProjectList';
import {
  ArchiveProjectDialog,
  CompleteProjectDialog,
} from '@/components/dashboard';
import type { ProjectStatusFilter } from '@/components/dashboard/StatusMenu';
import { cn } from '@/lib/utils';

type ArchiveTab = 'completed' | 'on_hold' | 'archived';

const TAB_DOTS: Record<ArchiveTab, string> = {
  completed: 'bg-blue-500',
  on_hold: 'bg-amber-500',
  archived: 'bg-muted-foreground',
};

const TABS: { key: ArchiveTab; label: string }[] = [
  { key: 'completed', label: 'Completed' },
  { key: 'on_hold', label: 'On Hold' },
  { key: 'archived', label: 'Archived' },
];

export default function ProjectsArchive() {
  const navigate = useNavigate();
  const { user, userOrgRoles, loading: authLoading } = useAuth();
  const { projects, statusCounts, loading: dataLoading, refetch } = useDashboardData();

  const currentOrg = userOrgRoles[0]?.organization;
  const orgType = currentOrg?.type || null;
  const orgId = currentOrg?.id;

  const [tab, setTab] = useState<ArchiveTab>('completed');
  const [search, setSearch] = useState('');

  const {
    archiveDialogOpen,
    setArchiveDialogOpen,
    projectToArchive,
    completeDialogOpen,
    setCompleteDialogOpen,
    projectToComplete,
    updateProjectStatus,
    unarchiveProject,
    requestArchive,
    confirmArchive,
    confirmComplete,
  } = useProjectStatusActions(refetch);

  const archivedProjects = useMemo(() => {
    const lower = search.trim().toLowerCase();
    return projects.filter((p) => {
      const isArchived = p.status === tab;
      if (!isArchived) return false;
      if (!lower) return true;
      return p.name.toLowerCase().includes(lower);
    });
  }, [projects, tab, search]);

  const handleStatusChange = (projectId: string, status: 'active' | 'on_hold' | 'completed') => {
    updateProjectStatus(projectId, status);
  };

  const loading = authLoading || dataLoading;

  if (!authLoading && !user) {
    return (
      <AppLayout title="Projects">
        <div className="p-6">
          <Card className="max-w-md mx-auto rounded-2xl">
            <CardContent className="p-6 text-center">
              <h2 className="text-lg font-semibold mb-2">Sign in required</h2>
              <p className="text-muted-foreground mb-4">Please sign in to view your projects.</p>
              <Button onClick={() => navigate('/auth')}>Sign In</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Projects" subtitle="Completed, on hold, and archived projects" fullWidth>
      <div className="px-4 sm:px-6 py-4 space-y-4 max-w-5xl">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name..."
            className="pl-9 h-10"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {TABS.map((t) => {
            const count = statusCounts[t.key];
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                  active
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:bg-accent border border-border'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full', TAB_DOTS[t.key])} />
                {t.label}
                <span
                  className={cn(
                    'text-[0.7rem] px-1.5 py-0 rounded-full',
                    active ? 'bg-background/40 text-secondary-foreground' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : archivedProjects.length === 0 ? (
          <Card className="rounded-lg">
            <CardContent className="py-12 text-center">
              <span className="text-3xl">📁</span>
              <p className="text-sm text-muted-foreground mt-2">
                {search.trim()
                  ? `No ${TABS.find((t) => t.key === tab)?.label.toLowerCase()} projects match "${search}"`
                  : `No ${TABS.find((t) => t.key === tab)?.label.toLowerCase()} projects`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <DashboardProjectList
            projects={archivedProjects}
            statusFilter={tab as ProjectStatusFilter}
            onStatusFilterChange={(s) => {
              if (s === 'completed' || s === 'on_hold' || s === 'archived') {
                setTab(s);
              }
            }}
            statusCounts={statusCounts}
            loading={false}
            orgType={orgType}
            orgId={orgId}
            onArchive={(id) => requestArchive(id, projects)}
            onUnarchive={unarchiveProject}
            onStatusChange={handleStatusChange}
          />
        )}
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

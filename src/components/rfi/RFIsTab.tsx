import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { RFICard } from './RFICard';
import { CreateRFIDialog } from './CreateRFIDialog';
import { RFIDetailDialog } from './RFIDetailDialog';
import { useProjectRFIs } from '@/hooks/useProjectRFIs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { ProjectRFI, RFIStatus } from '@/types/rfi';

interface RFIsTabProps {
  projectId: string;
}

interface TeamOrg {
  org_id: string;
  org_name: string;
}

export function RFIsTab({ projectId }: RFIsTabProps) {
  const { user, userOrgRoles, permissions } = useAuth();
  const { rfis, isLoading, createRFI, answerRFI, closeRFI } = useProjectRFIs(projectId);
  const [statusFilter, setStatusFilter] = useState<'ALL' | RFIStatus>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedRFI, setSelectedRFI] = useState<ProjectRFI | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [teamOrgs, setTeamOrgs] = useState<TeamOrg[]>([]);

  const currentOrgId = userOrgRoles[0]?.organization?.id;
  const canCreate = permissions?.canCreateRFIs ?? false;

  // Fetch team orgs for assign-to dropdown
  useEffect(() => {
    if (!projectId) return;
    supabase
      .from('project_team')
      .select('org_id, organization:organizations!project_team_org_id_fkey(name)')
      .eq('project_id', projectId)
      .then(({ data }) => {
        if (data) {
          const mapped = data.map((d: any) => ({ org_id: d.org_id, org_name: d.organization?.name || 'Unknown' }));
          const unique = Array.from(new Map(mapped.map((d: TeamOrg) => [d.org_id, d])).values());
          setTeamOrgs(unique);
        }
      });
  }, [projectId]);

  const filtered = statusFilter === 'ALL' ? rfis : rfis.filter((r) => r.status === statusFilter);

  const handleCardClick = (rfi: ProjectRFI) => {
    setSelectedRFI(rfi);
    setDetailOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="ALL">All ({rfis.length})</TabsTrigger>
            <TabsTrigger value="OPEN">Open ({rfis.filter((r) => r.status === 'OPEN').length})</TabsTrigger>
            <TabsTrigger value="ANSWERED">Answered ({rfis.filter((r) => r.status === 'ANSWERED').length})</TabsTrigger>
            <TabsTrigger value="CLOSED">Closed ({rfis.filter((r) => r.status === 'CLOSED').length})</TabsTrigger>
          </TabsList>
        </Tabs>
        {canCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New RFI
          </Button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {rfis.length === 0 ? 'No RFIs yet' : 'No RFIs match the selected filter'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((rfi) => (
            <RFICard key={rfi.id} rfi={rfi} onClick={() => handleCardClick(rfi)} />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      {currentOrgId && user && (
        <CreateRFIDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          projectId={projectId}
          currentOrgId={currentOrgId}
          currentUserId={user.id}
          teamOrgs={teamOrgs}
          onSubmit={async (payload) => { await createRFI.mutateAsync(payload); }}
        />
      )}

      {/* Detail Sheet */}
      <RFIDetailDialog
        rfi={selectedRFI}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        currentOrgId={currentOrgId}
        currentUserId={user?.id}
        onAnswer={async (id, ans, uid) => { await answerRFI.mutateAsync({ id, answer: ans, answeredByUserId: uid }); }}
        onClose={async (id) => { await closeRFI.mutateAsync(id); }}
      />
    </div>
  );
}

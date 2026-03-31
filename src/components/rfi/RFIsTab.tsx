import { useState } from 'react';
import { Plus, MessageSquareMore } from 'lucide-react';
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
import { useEffect } from 'react';

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

  useEffect(() => {
    if (!projectId) return;
    supabase.from('project_team').select('org_id, organization:organizations!project_team_org_id_fkey(name)').eq('project_id', projectId).then(({ data }) => {
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
    return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList className="bg-muted/50 p-1 rounded-full">
            <TabsTrigger value="ALL" className="rounded-full text-xs px-3">All ({rfis.length})</TabsTrigger>
            <TabsTrigger value="OPEN" className="rounded-full text-xs px-3">Open ({rfis.filter((r) => r.status === 'OPEN').length})</TabsTrigger>
            <TabsTrigger value="ANSWERED" className="rounded-full text-xs px-3">Answered ({rfis.filter((r) => r.status === 'ANSWERED').length})</TabsTrigger>
            <TabsTrigger value="CLOSED" className="rounded-full text-xs px-3">Closed ({rfis.filter((r) => r.status === 'CLOSED').length})</TabsTrigger>
          </TabsList>
        </Tabs>
        {canCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New RFI
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/20">
          <MessageSquareMore className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">{rfis.length === 0 ? 'No RFIs yet' : 'No RFIs match the selected filter'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((rfi) => <RFICard key={rfi.id} rfi={rfi} onClick={() => handleCardClick(rfi)} />)}
        </div>
      )}

      {currentOrgId && user && (
        <CreateRFIDialog open={createOpen} onOpenChange={setCreateOpen} projectId={projectId} currentOrgId={currentOrgId} currentUserId={user.id} teamOrgs={teamOrgs}
          onSubmit={async (payload) => { await createRFI.mutateAsync(payload); }} />
      )}

      <RFIDetailDialog rfi={selectedRFI} open={detailOpen} onOpenChange={setDetailOpen} currentOrgId={currentOrgId} currentUserId={user?.id}
        onAnswer={async (id, ans, uid) => { await answerRFI.mutateAsync({ id, answer: ans, answeredByUserId: uid }); }}
        onClose={async (id) => { await closeRFI.mutateAsync(id); }}
      />
    </div>
  );
}

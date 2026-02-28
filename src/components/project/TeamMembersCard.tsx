import { useEffect, useState, useCallback } from 'react';
import { Users, Plus, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { AddTeamMemberDialog } from '@/components/project/AddTeamMemberDialog';
import { DesignateSupplierDialog } from '@/components/project/DesignateSupplierDialog';
import { cn } from '@/lib/utils';

interface TeamMembersCardProps {
  projectId: string;
}

interface TeamMember {
  id: string;
  role: string;
  invited_org_name: string | null;
  status: string;
}

const roleDotColors: Record<string, string> = {
  'General Contractor': 'bg-blue-500',
  'Trade Contractor': 'bg-emerald-500',
  'Field Crew': 'bg-purple-500',
  'Supplier': 'bg-amber-500',
};

const roleAbbrev: Record<string, string> = {
  'General Contractor': 'GC',
  'Trade Contractor': 'TC',
  'Field Crew': 'FC',
  'Supplier': 'SUP',
};

export function TeamMembersCard({ projectId }: TeamMembersCardProps) {
  const { userOrgRoles } = useAuth();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isDesignateOpen, setIsDesignateOpen] = useState(false);
  const [designatedSupplier, setDesignatedSupplier] = useState<{ invited_name: string | null; invited_email: string | null; status: string } | null>(null);

  const creatorOrgType = userOrgRoles[0]?.organization?.type ?? null;
  const isGcOrTc = creatorOrgType === 'GC' || creatorOrgType === 'TC';

  const fetchTeam = useCallback(async () => {
    const { data } = await supabase.from('project_team').select('id, role, invited_org_name, status').eq('project_id', projectId);
    setTeam(data || []);
    setLoading(false);
  }, [projectId]);

  const fetchDesignatedSupplier = useCallback(async () => {
    const { data } = await supabase.from('project_designated_suppliers').select('invited_name, invited_email, status').eq('project_id', projectId).neq('status', 'removed').maybeSingle();
    setDesignatedSupplier(data);
  }, [projectId]);

  useEffect(() => {
    fetchTeam();
    fetchDesignatedSupplier();
  }, [fetchTeam, fetchDesignatedSupplier]);

  const teamByRole = team.reduce<Record<string, TeamMember[]>>((acc, m) => {
    if (!acc[m.role]) acc[m.role] = [];
    acc[m.role].push(m);
    return acc;
  }, {});

  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Team</p>
          {!loading && <span className="text-[10px] text-muted-foreground">({team.filter(m => m.status === 'Accepted').length})</span>}
        </div>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setIsAddMemberOpen(true)}>
          <Plus className="h-3 w-3 mr-1" />Add
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-12" />
      ) : team.length === 0 ? (
        <p className="text-sm text-muted-foreground">No team members</p>
      ) : (
        <div className="space-y-1.5">
          {Object.entries(teamByRole).slice(0, 5).map(([role, members]) => (
            <div key={role} className="flex items-center gap-2 py-1">
              <span className={cn("h-2 w-2 rounded-full shrink-0", roleDotColors[role])} />
              <span className="text-[10px] font-medium text-muted-foreground uppercase w-7">{roleAbbrev[role]}</span>
              <span className="text-sm truncate">{members.map(m => m.invited_org_name || 'Unknown').join(', ')}</span>
            </div>
          ))}

          {designatedSupplier ? (
            <div className="flex items-center justify-between pt-1.5 border-t mt-1.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full shrink-0 bg-amber-500" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase w-7">SUP</span>
                <span className="text-sm truncate">{designatedSupplier.invited_name || designatedSupplier.invited_email || 'Designated'}</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0">{designatedSupplier.status}</Badge>
              </div>
              {isGcOrTc && (
                <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={() => setIsDesignateOpen(true)}>Change</Button>
              )}
            </div>
          ) : isGcOrTc && !team.some(m => m.role === 'Supplier') ? (
            <Button variant="ghost" size="sm" className="h-7 w-full mt-1.5 text-[11px] text-muted-foreground" onClick={() => setIsDesignateOpen(true)}>
              <UserPlus className="h-3 w-3 mr-1" />Designate Supplier
            </Button>
          ) : null}
        </div>
      )}

      <AddTeamMemberDialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen} projectId={projectId} creatorOrgType={creatorOrgType} onMemberAdded={fetchTeam} />
      <DesignateSupplierDialog open={isDesignateOpen} onOpenChange={setIsDesignateOpen} projectId={projectId} onDesignated={fetchDesignatedSupplier} />
    </div>
  );
}

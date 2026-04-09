import { useEffect, useState, useCallback } from 'react';
import { resendProjectInvite } from '@/lib/inviteUtils';
import { Users, Package, UserPlus, RotateCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SurfaceCard, SurfaceCardHeader, SurfaceCardBody } from '@/components/ui/surface-card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AddTeamMemberDialog } from '@/components/project/AddTeamMemberDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { OrgType } from '@/types/organization';

interface ProjectOverviewTeamCardProps {
  projectId: string;
}

interface TeamMember {
  id: string;
  role: string;
  invited_org_name: string | null;
  invited_email: string | null;
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

export function ProjectOverviewTeamCard({ projectId }: ProjectOverviewTeamCardProps) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [materialResp, setMaterialResp] = useState<string | null>(null);
  const [designatedSupplier, setDesignatedSupplier] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [resending, setResending] = useState<string | null>(null);

  const { userOrgRoles } = useAuth();
  const { toast } = useToast();
  const viewerOrgType = (userOrgRoles[0]?.organization?.type as OrgType) ?? null;
  const canInvite = viewerOrgType === 'GC' || viewerOrgType === 'TC';

  const fetchData = useCallback(async () => {
    const [teamRes, contractRes, supplierRes] = await Promise.all([
      supabase.from('project_team').select('id, role, invited_org_name, invited_email, status').eq('project_id', projectId),
      supabase.from('project_contracts').select('material_responsibility').eq('project_id', projectId).not('material_responsibility', 'is', null).limit(1),
      supabase.from('project_designated_suppliers').select('invited_name').eq('project_id', projectId).neq('status', 'removed').maybeSingle(),
    ]);
    setTeam(teamRes.data || []);
    setMaterialResp(contractRes.data?.[0]?.material_responsibility ?? null);
    setDesignatedSupplier(supplierRes.data?.invited_name ?? null);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleResend = async (member: TeamMember) => {
    setResending(member.id);
    try {
      await resendProjectInvite(projectId, member.id);
      toast({ title: `Invitation resent to ${member.invited_email || member.invited_org_name || 'member'}` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Failed to resend', description: err.message, variant: 'destructive' });
    } finally {
      setResending(null);
    }
  };

  if (loading) return <Skeleton className="h-40 rounded-2xl" />;

  const acceptedCount = team.filter(m => m.status === 'Accepted').length;
  const subtitle = team.length === acceptedCount
    ? `${acceptedCount} member${acceptedCount !== 1 ? 's' : ''}`
    : `${acceptedCount}/${team.length} accepted`;

  return (
    <SurfaceCard>
      <SurfaceCardHeader title="Team" subtitle={subtitle} />
      <SurfaceCardBody className="pt-0 space-y-1.5">
        <TooltipProvider delayDuration={300}>
          {team.map((member) => {
            const abbrev = roleAbbrev[member.role] || member.role;
            const hasMaterial = materialResp === abbrev;
            const isInvited = member.status === 'Invited';
            const isResending = resending === member.id;

            return (
              <div key={member.id} className="group flex items-center gap-2 py-1">
                <span className={cn('h-2 w-2 rounded-full shrink-0', roleDotColors[member.role] || 'bg-muted-foreground')} />
                <span className="text-[0.65rem] font-medium text-muted-foreground uppercase w-7">{abbrev}</span>
                <span className={cn('text-[0.85rem] font-medium truncate flex-1', isInvited && 'text-muted-foreground')}>
                  {member.invited_org_name || 'Unknown'}
                </span>
                {isInvited && (
                  <>
                    <Badge variant="outline" className="text-[0.6rem] px-1.5 py-0 h-4 font-normal text-muted-foreground border-border">
                      Invited
                    </Badge>
                    {canInvite && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={isResending}
                            onClick={() => handleResend(member)}
                          >
                            {isResending
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <RotateCw className="h-3 w-3" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">Resend invitation</TooltipContent>
                      </Tooltip>
                    )}
                  </>
                )}
                {hasMaterial && <Package className="h-3 w-3 text-primary shrink-0" />}
              </div>
            );
          })}
        </TooltipProvider>

        {materialResp && (
          <div className="pt-2.5 border-t border-border/40 flex items-center gap-2 text-[0.75rem] text-muted-foreground">
            <Package className="h-3 w-3" />
            <span>Materials: {materialResp === 'GC' ? 'General Contractor' : 'Trade Contractor'}</span>
          </div>
        )}

        {designatedSupplier && (
          <div className="flex items-center gap-2 text-[0.75rem] text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>Supplier: {designatedSupplier}</span>
          </div>
        )}

        {canInvite && (
          <div className="pt-2 border-t border-border/40">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
              onClick={() => setAddDialogOpen(true)}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add Member
            </Button>
          </div>
        )}
      </SurfaceCardBody>

      <AddTeamMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        projectId={projectId}
        creatorOrgType={viewerOrgType}
        onMemberAdded={() => fetchData()}
      />
    </SurfaceCard>
  );
}

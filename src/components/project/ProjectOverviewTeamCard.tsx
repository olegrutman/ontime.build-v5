import { useEffect, useState, useCallback } from 'react';
import { Users, Package, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SurfaceCard, SurfaceCardHeader, SurfaceCardBody } from '@/components/ui/surface-card';
import { useAuth } from '@/hooks/useAuth';
import { AddTeamMemberDialog } from '@/components/project/AddTeamMemberDialog';
import type { OrgType } from '@/types/organization';

interface ProjectOverviewTeamCardProps {
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

export function ProjectOverviewTeamCard({ projectId }: ProjectOverviewTeamCardProps) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [materialResp, setMaterialResp] = useState<string | null>(null);
  const [designatedSupplier, setDesignatedSupplier] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [teamRes, contractRes, supplierRes] = await Promise.all([
      supabase.from('project_team').select('id, role, invited_org_name, status').eq('project_id', projectId),
      supabase.from('project_contracts').select('material_responsibility').eq('project_id', projectId).not('material_responsibility', 'is', null).limit(1),
      supabase.from('project_designated_suppliers').select('invited_name').eq('project_id', projectId).neq('status', 'removed').maybeSingle(),
    ]);
    setTeam(teamRes.data || []);
    setMaterialResp(contractRes.data?.[0]?.material_responsibility ?? null);
    setDesignatedSupplier(supplierRes.data?.invited_name ?? null);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <Skeleton className="h-40 rounded-2xl" />;

  const acceptedTeam = team.filter(m => m.status === 'Accepted');

  return (
    <SurfaceCard>
      <SurfaceCardHeader title="Team" subtitle={`${acceptedTeam.length} member${acceptedTeam.length !== 1 ? 's' : ''}`} />
      <SurfaceCardBody className="pt-0 space-y-1.5">
        {acceptedTeam.map((member) => {
          const abbrev = roleAbbrev[member.role] || member.role;
          const hasMaterial = materialResp === abbrev;
          return (
            <div key={member.id} className="flex items-center gap-2 py-1">
              <span className={cn('h-2 w-2 rounded-full shrink-0', roleDotColors[member.role] || 'bg-muted-foreground')} />
              <span className="text-[0.65rem] font-medium text-muted-foreground uppercase w-7">{abbrev}</span>
              <span className="text-[0.85rem] font-medium truncate flex-1">{member.invited_org_name || 'Unknown'}</span>
              {hasMaterial && <Package className="h-3 w-3 text-primary shrink-0" />}
            </div>
          );
        })}

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
      </SurfaceCardBody>
    </SurfaceCard>
  );
}

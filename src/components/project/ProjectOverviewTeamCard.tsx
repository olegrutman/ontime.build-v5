import { useEffect, useState, useCallback } from 'react';
import { Users, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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

  if (loading) return <Skeleton className="h-40 rounded-3xl" />;

  const acceptedTeam = team.filter(m => m.status === 'Accepted');

  return (
    <div className="rounded-3xl border border-border/60 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold tracking-tight">Team</h3>
        <span className="text-xs text-muted-foreground">({acceptedTeam.length})</span>
      </div>

      <div className="space-y-2">
        {acceptedTeam.map((member) => {
          const abbrev = roleAbbrev[member.role] || member.role;
          const hasMaterial = materialResp === abbrev;
          return (
            <div key={member.id} className="flex items-center gap-2 py-1.5">
              <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', roleDotColors[member.role] || 'bg-muted-foreground')} />
              <span className="text-[10px] font-medium text-muted-foreground uppercase w-7">{abbrev}</span>
              <span className="text-sm font-medium truncate flex-1">{member.invited_org_name || 'Unknown'}</span>
              {hasMaterial && <Package className="h-3.5 w-3.5 text-primary shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Material responsibility */}
      {materialResp && (
        <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2 text-xs text-muted-foreground">
          <Package className="h-3 w-3" />
          <span>Materials: {materialResp === 'GC' ? 'General Contractor' : 'Trade Contractor'}</span>
        </div>
      )}

      {/* Designated supplier */}
      {designatedSupplier && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span>Supplier: {designatedSupplier}</span>
        </div>
      )}
    </div>
  );
}

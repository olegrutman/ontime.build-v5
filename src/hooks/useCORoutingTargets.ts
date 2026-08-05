import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CORoutingTarget {
  id: string;
  name: string;
  type: 'GC' | 'TC' | 'FC' | 'SUPPLIER' | string;
  initials: string;
}

const initialsOf = (name: string) =>
  name.split(' ').map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase();

/**
 * Candidate orgs a CO/WO can be routed to ("Assigned to"), based on the
 * creator's role on this project:
 *   GC -> Trade Contractors on the project
 *   TC -> the project's GC
 *   FC -> the org that hired them (upstream contract), fallback TC/GC
 */
export function useCORoutingTargets(projectId: string | null | undefined) {
  const { userOrgRoles } = useAuth();
  const myOrgId = userOrgRoles?.[0]?.organization_id ?? null;

  return useQuery({
    queryKey: ['co-routing-targets', projectId, myOrgId],
    enabled: !!projectId && !!myOrgId,
    staleTime: 60_000,
    queryFn: async (): Promise<{ targets: CORoutingTarget[]; defaultId: string | null; myRole: string | null }> => {
      const { data: participants } = await supabase
        .from('project_participants')
        .select('organization_id, role, organization:organizations!project_participants_organization_id_fkey(id, name, type)')
        .eq('project_id', projectId!)
        .eq('invite_status', 'ACCEPTED');

      const rows = (participants ?? []).map(r => {
        const org = r.organization as { id: string; name: string; type: string } | null;
        return {
          orgId: r.organization_id,
          role: (r.role ?? org?.type ?? '') as string,
          name: org?.name ?? 'Unknown',
          type: (org?.type ?? r.role ?? '') as string,
        };
      });

      const me = rows.find(r => r.orgId === myOrgId);
      const myRole = me?.type ?? null;

      const toTarget = (r: { orgId: string; name: string; type: string }): CORoutingTarget => ({
        id: r.orgId,
        name: r.name,
        type: r.type,
        initials: initialsOf(r.name),
      });

      let targets: CORoutingTarget[] = [];
      let defaultId: string | null = null;

      if (myRole === 'GC') {
        targets = rows.filter(r => r.type === 'TC').map(toTarget);
        defaultId = targets[0]?.id ?? null;
      } else if (myRole === 'TC') {
        targets = rows.filter(r => r.type === 'GC').map(toTarget);
        defaultId = targets[0]?.id ?? null;
      } else {
        // FC (or unknown): route upstream to whoever hired them
        const { data: up } = await supabase
          .from('project_contracts')
          .select('from_org_id')
          .eq('project_id', projectId!)
          .eq('to_org_id', myOrgId!)
          .maybeSingle();
        const upstreamId = up?.from_org_id ?? null;
        targets = rows.filter(r => r.orgId !== myOrgId && (r.type === 'TC' || r.type === 'GC')).map(toTarget);
        defaultId = upstreamId ?? targets[0]?.id ?? null;
      }

      return { targets, defaultId, myRole };
    },
  });
}

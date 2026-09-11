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
 * creator's role on this project. Hierarchy is strict — a company may only
 * send work up to the company directly above it:
 *   GC -> Subcontractors on the project (downstream issuance)
 *   TC -> the company that hired them (their contract's upstream side, else the GC)
 *   FC -> the company that hired them (never skipping to the GC)
 *
 * project_contracts direction: from_org_id = downstream (biller),
 * to_org_id = upstream (payer). So "who hired me" = to_org_id where from_org_id = me.
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

      // GC issues work downstream to its subcontractors.
      if (myRole === 'GC') {
        const targets = rows.filter(r => r.type === 'TC').map(toTarget);
        return { targets, defaultId: targets[0]?.id ?? null, myRole };
      }

      // Everyone else routes strictly one step upstream: the company that hired them.
      const { data: upstream } = await supabase
        .from('project_contracts')
        .select('to_org_id')
        .eq('project_id', projectId!)
        .eq('from_org_id', myOrgId!)
        .limit(1)
        .maybeSingle();

      const upstreamId = upstream?.to_org_id ?? null;
      let targets = upstreamId
        ? rows.filter(r => r.orgId === upstreamId).map(toTarget)
        : [];

      if (targets.length === 0 && myRole === 'TC') {
        // No contract row yet — a subcontractor's only valid recipient is the GC.
        targets = rows.filter(r => r.type === 'GC').map(toTarget);
      }

      return { targets, defaultId: targets[0]?.id ?? null, myRole };
    },
  });
}


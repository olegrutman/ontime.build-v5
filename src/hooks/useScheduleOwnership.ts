import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const ROLE_PRIORITY: Record<string, number> = {
  'General Contractor': 1,
  'Trade Contractor': 2,
  'Finishing Contractor': 3,
};

export function useScheduleOwnership(projectId: string) {
  const { userOrgRoles } = useAuth();
  const userOrgIds = userOrgRoles.map(r => r.organization_id);

  const { data, isLoading } = useQuery({
    queryKey: ['schedule-ownership', projectId],
    queryFn: async () => {
      const { data: team, error } = await supabase
        .from('project_team')
        .select('role, org_id')
        .eq('project_id', projectId);
      if (error) throw error;
      return team || [];
    },
    enabled: !!projectId,
  });

  const team = data || [];

  // Find highest upstream role on the project
  let ownerOrgId: string | null = null;
  let ownerRole: string | null = null;
  let bestPriority = Infinity;

  for (const member of team) {
    const priority = ROLE_PRIORITY[member.role] ?? 99;
    if (priority < bestPriority) {
      bestPriority = priority;
      ownerOrgId = member.org_id;
      ownerRole = member.role;
    }
  }

  const canEditSchedule = ownerOrgId ? userOrgIds.includes(ownerOrgId) : false;

  return { canEditSchedule, ownerRole, ownerOrgId, isLoading };
}

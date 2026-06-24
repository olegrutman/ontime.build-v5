import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { COFCOrgOption } from '@/types/changeOrder';

export function useProjectFCOrgs(projectId: string | null) {
  return useQuery({
    queryKey: ['project-fc-orgs', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_team')
        .select('org_id, organization:organizations!project_team_org_id_fkey(id, name, type)')
        .eq('project_id', projectId!)
        .eq('organization.type', 'FC');

      if (error) throw error;

      const unique = new Map<string, COFCOrgOption>();
      for (const row of data ?? []) {
        const organization = row.organization as { id: string; name: string; type: 'FC' } | null;
        if (!organization || organization.type !== 'FC') continue;
        unique.set(row.org_id, {
          id: row.org_id,
          name: organization.name,
          type: 'FC',
        });
      }

      return Array.from(unique.values());
    },
  });
}

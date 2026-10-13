import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ProposalParty = { id: string; name: string; type: string; logo_url: string | null; address: unknown; phone: string | null };
export type ProposalParties = { issuer: ProposalParty; recipients: ProposalParty[]; owner: Record<string, unknown> | null; owner_email: string | null; site_address: unknown; project_name: string };
export function formatProposalAddress(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const a = value as Record<string, unknown>;
  return [a.street ?? a.line1 ?? a.address, a.city, a.state, a.zip ?? a.postal_code].filter(Boolean).join(', ');
}
export function useProposalParties(projectId: string | undefined) {
  const { userOrgRoles } = useAuth();
  const orgId = userOrgRoles[0]?.organization_id;
  return useQuery({
    queryKey: ['proposal-parties', projectId, orgId],
    enabled: Boolean(projectId && orgId),
    queryFn: async () => {
      if (!projectId || !orgId) throw new Error('Project and company required');
      const { data, error } = await supabase.rpc('proposal_parties', { _project_id: projectId, _org_id: orgId });
      if (error) throw error;
      return data as unknown as ProposalParties;
    },
  });
}
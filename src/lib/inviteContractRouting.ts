import { supabase } from '@/integrations/supabase/client';

export function downstreamPayerType(
  creatorType: 'GC' | 'TC',
  invitedRole: 'Subcontractor' | 'Crew',
): 'GC' | 'TC' {
  return creatorType === 'GC' && invitedRole === 'Crew' ? 'TC' : creatorType;
}

/** Resolve the company a downstream worker bills before saving the invitation. */
export async function resolveDownstreamPayer({
  projectId,
  currentOrgId,
  currentOrgType,
  invitedRole,
}: {
  projectId: string;
  currentOrgId: string;
  currentOrgType: 'GC' | 'TC';
  invitedRole: 'Subcontractor' | 'Crew';
}): Promise<{ orgId: string; role: 'General Contractor' | 'Subcontractor' }> {
  const payerType = downstreamPayerType(currentOrgType, invitedRole);
  if (payerType === currentOrgType) {
    return {
      orgId: currentOrgId,
      role: currentOrgType === 'GC' ? 'General Contractor' : 'Subcontractor',
    };
  }
  const { data, error } = await supabase
    .from('project_participants')
    .select('organization_id')
    .eq('project_id', projectId)
    .eq('role', payerType)
    .not('accepted_at', 'is', null)
    .order('accepted_at', { ascending: true })
    .limit(1);
  if (error) throw error;
  const payerOrgId = data?.[0]?.organization_id;
  if (!payerOrgId) {
    throw new Error('Add an accepted subcontractor before inviting a crew. Crews bill the subcontractor.');
  }
  return { orgId: payerOrgId, role: 'Subcontractor' };
}

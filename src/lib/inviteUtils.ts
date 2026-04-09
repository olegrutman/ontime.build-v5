import { supabase } from '@/integrations/supabase/client';

export async function resendProjectInvite(projectId: string, teamMemberId: string) {
  const { data, error } = await supabase.rpc('resend_project_invite', {
    _project_id: projectId,
    _team_member_id: teamMemberId,
  });

  if (error) throw new Error(error.message);

  const result = data as { error?: string; resolved?: boolean };

  if (result?.error) {
    throw new Error(result.error);
  }

  return result;
}

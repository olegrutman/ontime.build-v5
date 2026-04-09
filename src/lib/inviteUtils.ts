import { supabase } from '@/integrations/supabase/client';

const ROLE_MAP: Record<string, string> = {
  'General Contractor': 'GC',
  'Trade Contractor': 'TC',
  'Field Crew': 'FC',
  'Supplier': 'SUPPLIER',
};

export async function resendProjectInvite(projectId: string, teamMemberId: string) {
  // 1. Get team member details
  const { data: tm, error: tmErr } = await supabase
    .from('project_team')
    .select('org_id, user_id, role, invited_email, invited_org_name')
    .eq('id', teamMemberId)
    .single();

  if (tmErr || !tm) throw new Error('Team member not found');

  let orgId = tm.org_id;
  let userId = tm.user_id;
  const participantRole = ROLE_MAP[tm.role] || 'TC';

  // 2. If no org_id, try to resolve from invited_email
  if (!orgId && tm.invited_email) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', tm.invited_email)
      .maybeSingle();

    if (profile) {
      const { data: orgRole } = await supabase
        .from('user_org_roles')
        .select('organization_id')
        .eq('user_id', profile.user_id)
        .limit(1)
        .maybeSingle();

      if (orgRole) {
        orgId = orgRole.organization_id;
        userId = profile.user_id;
        // Update project_team with resolved org_id
        await supabase
          .from('project_team')
          .update({ org_id: orgId, user_id: userId })
          .eq('id', teamMemberId);
      }
    }
  }

  // 3. Ensure project_participants row exists
  if (orgId) {
    const { data: existing } = await supabase
      .from('project_participants')
      .select('id')
      .eq('project_id', projectId)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!existing) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('project_participants').insert({
        project_id: projectId,
        organization_id: orgId,
        role: participantRole as any,
        invite_status: 'INVITED',
        invited_by: user?.id || '',
      });
    }
  }

  // 4. Refresh invite timestamp
  await supabase
    .from('project_invites')
    .update({ created_at: new Date().toISOString() })
    .eq('project_team_id', teamMemberId);

  // 5. Create notification for invited org members
  if (orgId) {
    const [orgMembersRes, projectRes] = await Promise.all([
      supabase.from('user_org_roles').select('user_id').eq('organization_id', orgId),
      supabase.from('projects').select('name').eq('id', projectId).single(),
    ]);

    const projectName = projectRes.data?.name || 'a project';

    for (const m of orgMembersRes.data || []) {
      await supabase.from('notifications').insert({
        recipient_org_id: orgId,
        recipient_user_id: m.user_id,
        type: 'PROJECT_INVITE' as any,
        title: 'Project Invitation',
        body: `You've been invited to join "${projectName}"`,
        entity_type: 'project',
        entity_id: projectId,
        action_url: '/dashboard',
      });
    }
  }
}

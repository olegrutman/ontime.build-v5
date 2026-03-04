import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppRole, MemberPermissions } from '@/types/organization';
import { useToast } from '@/hooks/use-toast';

export interface OrgMember {
  id: string;
  user_id: string;
  role: AppRole;
  is_admin: boolean;
  created_at: string;
  profile: {
    full_name: string | null;
    email: string;
    job_title: string | null;
  } | null;
  permissions: MemberPermissions | null;
}

export interface OrgInvite {
  id: string;
  email: string;
  role: AppRole;
  status: string;
  created_at: string;
  expires_at: string;
  organization?: {
    name: string;
  } | null;
}

export function useOrgTeam() {
  const { user, userOrgRoles } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<OrgInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const currentOrg = userOrgRoles[0]?.organization;
  const orgId = currentOrg?.id;

  const fetchData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);

    const [membersRes, invitesRes, permissionsRes] = await Promise.all([
      supabase
        .from('user_org_roles')
        .select('id, user_id, role, is_admin, created_at, profile:profiles(full_name, email, job_title)')
        .eq('organization_id', orgId),
      supabase
        .from('org_invitations')
        .select('id, email, role, status, created_at, expires_at')
        .eq('organization_id', orgId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('member_permissions')
        .select('*'),
    ]);

    // Build permissions map
    const permMap = new Map<string, MemberPermissions>();
    if (permissionsRes.data) {
      (permissionsRes.data as unknown as MemberPermissions[]).forEach(p => permMap.set(p.user_org_role_id, p));
    }

    if (membersRes.data) {
      let membersList = membersRes.data as unknown as OrgMember[];

      // Fallback: if any member has null profile, fetch profiles separately
      const missingProfileIds = membersList
        .filter((m) => !m.profile)
        .map((m) => m.user_id);

      if (missingProfileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, job_title')
          .in('user_id', missingProfileIds);

        if (profiles) {
          const profileMap = new Map(profiles.map((p) => [p.user_id, { full_name: p.full_name, email: p.email, job_title: p.job_title }]));
          membersList = membersList.map((m) =>
            m.profile ? m : { ...m, profile: profileMap.get(m.user_id) || null }
          );
        }
      }

      // Attach permissions
      membersList = membersList.map(m => ({
        ...m,
        permissions: permMap.get(m.id) || null,
      }));

      setMembers(membersList);
    }
    if (invitesRes.data) {
      setPendingInvites(invitesRes.data as unknown as OrgInvite[]);
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sendInvite = async (email: string, role: AppRole) => {
    if (!orgId || !user) return;

    const { error } = await supabase.from('org_invitations').insert({
      organization_id: orgId,
      invited_by: user.id,
      email: email.toLowerCase().trim(),
      role,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }

    toast({ title: 'Invite Sent', description: `Invitation sent to ${email}` });
    fetchData();
    return true;
  };

  const cancelInvite = async (inviteId: string) => {
    const { error } = await supabase
      .from('org_invitations')
      .update({ status: 'expired' })
      .eq('id', inviteId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to cancel invitation', variant: 'destructive' });
    } else {
      toast({ title: 'Cancelled', description: 'Invitation has been revoked.' });
      fetchData();
    }
  };

  const changeRole = async (memberRoleId: string, newRole: AppRole) => {
    const { error } = await supabase.rpc('change_org_member_role', {
      p_member_role_id: memberRoleId,
      p_new_role: newRole,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }

    toast({ title: 'Role Updated', description: 'Member role has been changed.' });
    fetchData();
    return true;
  };

  const updateMemberPermissions = async (targetRoleId: string, perms: Partial<MemberPermissions>) => {
    const { error } = await supabase.rpc('update_member_permissions', {
      _target_role_id: targetRoleId,
      _can_approve_invoices: perms.can_approve_invoices ?? null,
      _can_create_work_orders: perms.can_create_work_orders ?? null,
      _can_create_pos: perms.can_create_pos ?? null,
      _can_manage_team: perms.can_manage_team ?? null,
      _can_view_financials: perms.can_view_financials ?? null,
      _can_submit_time: perms.can_submit_time ?? null,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }

    toast({ title: 'Updated', description: 'Permissions have been updated.' });
    fetchData();
    return true;
  };

  const transferAdmin = async (targetRoleId: string) => {
    const { error } = await supabase.rpc('transfer_admin', {
      _target_role_id: targetRoleId,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }

    toast({ title: 'Admin Transferred', description: 'Admin role has been transferred.' });
    fetchData();
    return true;
  };

  const removeMember = async (targetRoleId: string) => {
    const { error } = await supabase.rpc('remove_org_member', {
      _target_role_id: targetRoleId,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }

    toast({ title: 'Removed', description: 'Team member has been removed.' });
    fetchData();
    return true;
  };

  return { members, pendingInvites, loading, sendInvite, cancelInvite, changeRole, updateMemberPermissions, transferAdmin, removeMember, refetch: fetchData };
}

/** Hook for the dashboard: fetch pending org invites for the current user */
export function useMyOrgInvites() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvites = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('org_invitations')
      .select('id, email, role, status, created_at, expires_at, organization:organizations(name)')
      .eq('status', 'pending')
      .eq('email', user.email.toLowerCase());

    setInvites((data as unknown as OrgInvite[]) || []);
    setLoading(false);
  }, [user?.email]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const accept = async (inviteId: string) => {
    const { error } = await supabase.rpc('accept_org_invitation', {
      p_invitation_id: inviteId,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Welcome!', description: 'You have joined the organization.' });
      fetchInvites();
      // Reload to refresh auth context with new role
      window.location.reload();
    }
  };

  const decline = async (inviteId: string) => {
    const { error } = await supabase.rpc('decline_org_invitation', {
      p_invitation_id: inviteId,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Declined', description: 'Invitation declined.' });
      fetchInvites();
    }
  };

  return { invites, loading, accept, decline };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppRole } from '@/types/organization';
import { useToast } from '@/hooks/use-toast';

export interface OrgMember {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  profile: {
    full_name: string | null;
    email: string;
  } | null;
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

    const [membersRes, invitesRes] = await Promise.all([
      supabase
        .from('user_org_roles')
        .select('id, user_id, role, created_at, profile:profiles(full_name, email)')
        .eq('organization_id', orgId),
      supabase
        .from('org_invitations')
        .select('id, email, role, status, created_at, expires_at')
        .eq('organization_id', orgId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);

    if (membersRes.data) {
      setMembers(membersRes.data as unknown as OrgMember[]);
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

  return { members, pendingInvites, loading, sendInvite, cancelInvite, refetch: fetchData };
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

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const PROJECT_ROLES = [
  { value: 'FIELD_CREW', label: 'Field Crew' },
  { value: 'TRADE_CONTRACTOR', label: 'Trade Contractor' },
  { value: 'GC', label: 'General Contractor' },
] as const;

export type ProjectRole = typeof PROJECT_ROLES[number]['value'];

export interface ProjectInvitation {
  id: string;
  project_id: string;
  inviter_user_id: string;
  invitee_user_id: string;
  project_role: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  // Joined fields
  project_name?: string;
  inviter_company?: string;
}

export function useProjectInvitations() {
  const { user } = useAuth();
  const [pendingInvitations, setPendingInvitations] = useState<ProjectInvitation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setPendingInvitations([]);
      return;
    }

    fetchPendingInvitations();

    // Subscribe to realtime invitation changes
    const channel = supabase
      .channel('invitation-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_invitations',
          filter: `invitee_user_id=eq.${user.id}`,
        },
        () => {
          fetchPendingInvitations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchPendingInvitations = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('project_invitations')
      .select(`
        *,
        projects:project_id(name)
      `)
      .eq('invitee_user_id', user.id)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const enrichedInvitations = data.map((inv: any) => ({
        ...inv,
        project_name: inv.projects?.name || 'Unknown Project',
        inviter_company: 'Team Member',
      }));
      setPendingInvitations(enrichedInvitations);
    }
  };

  const acceptInvitation = async (invitationId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('accept_project_invitation', {
        _invitation_id: invitationId,
      });

      if (error) throw error;

      toast.success('Invitation accepted! Project added to your dashboard.');
      await fetchPendingInvitations();
      return { success: true };
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error(error.message || 'Failed to accept invitation');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const declineInvitation = async (invitationId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('decline_project_invitation', {
        _invitation_id: invitationId,
      });

      if (error) throw error;

      toast.success('Invitation declined.');
      await fetchPendingInvitations();
      return { success: true };
    } catch (error: any) {
      console.error('Error declining invitation:', error);
      toast.error(error.message || 'Failed to decline invitation');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = async (
    projectId: string,
    inviteeUserId: string,
    projectRole: ProjectRole
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('send_project_invitation', {
        _project_id: projectId,
        _invitee_user_id: inviteeUserId,
        _project_role: projectRole,
      });

      if (error) throw error;

      toast.success('Invitation sent!');
      return { success: true };
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error(error.message || 'Failed to send invitation');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    pendingInvitations,
    sendInvitation,
    acceptInvitation,
    declineInvitation,
    loading,
    refetch: fetchPendingInvitations,
  };
}

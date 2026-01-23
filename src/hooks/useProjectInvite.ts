import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useProjectInvite() {
  const [loading, setLoading] = useState(false);

  const acceptInvite = async (projectId: string) => {
    setLoading(true);
    // Type assertion needed until types are regenerated
    const { error } = await (supabase.rpc as any)('accept_project_invite', {
      _project_id: projectId
    });

    if (error) {
      toast.error('Failed to accept invite: ' + error.message);
      setLoading(false);
      return false;
    }

    toast.success('Project invite accepted!');
    setLoading(false);
    return true;
  };

  const declineInvite = async (projectId: string) => {
    setLoading(true);
    // Type assertion needed until types are regenerated
    const { error } = await (supabase.rpc as any)('decline_project_invite', {
      _project_id: projectId
    });

    if (error) {
      toast.error('Failed to decline invite: ' + error.message);
      setLoading(false);
      return false;
    }

    toast.success('Project invite declined');
    setLoading(false);
    return true;
  };

  return {
    acceptInvite,
    declineInvite,
    loading
  };
}

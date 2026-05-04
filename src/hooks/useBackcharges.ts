import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Backcharge {
  id: string;
  project_id: string;
  source_co_id: string;
  responsible_org_id: string | null;
  responsible_party_name: string | null;
  amount: number;
  status: 'pending' | 'disputed' | 'accepted' | 'deducted' | 'withdrawn';
  gc_approved: boolean;
  gc_approved_at: string | null;
  dispute_note: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  // Joined
  source_co?: { id: string; title: string; co_number: string | null };
  responsible_org?: { id: string; name: string; type: string } | null;
}

export function useBackcharges(projectId: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['backcharges', projectId] });
  };

  const { data: backcharges = [], isLoading } = useQuery({
    queryKey: ['backcharges', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backcharges')
        .select('*, source_co:change_orders(id, title, co_number), responsible_org:organizations(id, name, type)')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Backcharge[];
    },
  });

  const createBackcharge = useMutation({
    mutationFn: async (input: {
      project_id: string;
      source_co_id: string;
      responsible_org_id: string | null;
      responsible_party_name: string | null;
      amount: number;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('backcharges')
        .insert({ ...input, created_by_user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, dispute_note, gc_approved }: {
      id: string;
      status: Backcharge['status'];
      dispute_note?: string;
      gc_approved?: boolean;
    }) => {
      const updates: Record<string, any> = { status };
      if (dispute_note !== undefined) updates.dispute_note = dispute_note;
      if (gc_approved !== undefined) {
        updates.gc_approved = gc_approved;
        if (gc_approved) updates.gc_approved_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from('backcharges')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  return { backcharges, isLoading, createBackcharge, updateStatus };
}

export function useBackchargeCount(projectId: string | null, orgId: string | null) {
  return useQuery({
    queryKey: ['backcharge-count', projectId, orgId],
    enabled: !!projectId && !!orgId,
    queryFn: async () => {
      // Count pending backcharges where this org is responsible OR created by this org
      const { count, error } = await supabase
        .from('backcharges')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId!)
        .eq('status', 'pending');
      if (error) throw error;
      return count ?? 0;
    },
  });
}

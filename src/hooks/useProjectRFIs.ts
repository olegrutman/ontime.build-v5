import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ProjectRFI, CreateRFIPayload } from '@/types/rfi';

export function useProjectRFIs(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['project-rfis', projectId];

  const { data: rfis = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_rfis')
        .select(`
          *,
          submitted_by_org:organizations!project_rfis_submitted_by_org_id_fkey(name),
          assigned_to_org:organizations!project_rfis_assigned_to_org_id_fkey(name)
        `)
        .eq('project_id', projectId)
        .order('rfi_number', { ascending: false });
      if (error) throw error;
      return data as unknown as ProjectRFI[];
    },
    enabled: !!projectId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`rfis-${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'project_rfis',
        filter: `project_id=eq.${projectId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, queryClient]);

  const createRFI = useMutation({
    mutationFn: async (payload: CreateRFIPayload) => {
      const { data, error } = await supabase
        .from('project_rfis')
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const answerRFI = useMutation({
    mutationFn: async ({ id, answer, answeredByUserId }: { id: string; answer: string; answeredByUserId: string }) => {
      const { error } = await supabase
        .from('project_rfis')
        .update({
          answer,
          status: 'ANSWERED',
          answered_by_user_id: answeredByUserId,
          answered_at: new Date().toISOString(),
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const closeRFI = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_rfis')
        .update({ status: 'CLOSED' } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { rfis, isLoading, createRFI, answerRFI, closeRFI };
}

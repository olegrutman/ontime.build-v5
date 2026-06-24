import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type RFIRow = {
  id: string;
  project_id: string;
  rfi_number: string;
  title: string;
  question: string;
  status: 'open' | 'answered' | 'closed' | 'void';
  urgency: 'low' | 'normal' | 'high' | 'critical';
  submitted_by_user_id: string | null;
  submitted_by_org_id: string | null;
  submitted_to_org_id: string | null;
  asked_at: string;
  answer: string | null;
  answered_by_user_id: string | null;
  answered_at: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  submitted_by_org?: { name: string } | null;
  submitted_to_org?: { name: string } | null;
};

export function useRFIs(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['rfis', projectId];

  const { data: rfis = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('rfis')
        .select(`
          *,
          submitted_by_org:organizations!rfis_submitted_by_org_id_fkey(name),
          submitted_to_org:organizations!rfis_submitted_to_org_id_fkey(name)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RFIRow[];
    },
    enabled: !!projectId,
  });

  // Realtime
  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`rfis-new-${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rfis',
        filter: `project_id=eq.${projectId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, queryClient]);

  const createRFI = useMutation({
    mutationFn: async (payload: {
      project_id: string;
      title: string;
      question: string;
      urgency?: string;
      submitted_by_user_id: string;
      submitted_by_org_id: string;
      submitted_to_org_id: string;
      due_date?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('rfis')
        .insert({
          ...payload,
          rfi_number: 'TMP', // trigger will overwrite
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const answerRFI = useMutation({
    mutationFn: async ({ id, answer, userId }: { id: string; answer: string; userId: string }) => {
      const { error } = await supabase
        .from('rfis')
        .update({
          answer,
          status: 'answered',
          answered_by_user_id: userId,
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
        .from('rfis')
        .update({ status: 'closed' } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const voidRFI = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rfis')
        .update({ status: 'void' } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { rfis, isLoading, createRFI, answerRFI, closeRFI, voidRFI };
}

/** Fetch open RFIs for a project (used in CO picker RFI linking) */
export function useOpenRFIs(projectId: string | undefined) {
  return useQuery({
    queryKey: ['rfis-open', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('rfis')
        .select('id, rfi_number, title')
        .eq('project_id', projectId)
        .eq('status', 'open')
        .order('rfi_number');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProjectType, ProjectProfile, ProfileDraft } from '@/types/projectProfile';

export function useProjectTypes() {
  return useQuery({
    queryKey: ['project_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_types')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as unknown as ProjectType[];
    },
  });
}

export function useProjectProfile(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project_profile', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_profiles')
        .select('*')
        .eq('project_id', projectId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ProjectProfile | null;
    },
  });
}

export function useSaveProjectProfile(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (draft: ProfileDraft) => {
      // Check existing
      const { data: existing } = await supabase
        .from('project_profiles')
        .select('id')
        .eq('project_id', projectId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('project_profiles')
          .update(draft as any)
          .eq('id', existing.id);
        if (error) throw error;
        return existing.id;
      } else {
        const id = crypto.randomUUID();
        const { error } = await supabase
          .from('project_profiles')
          .insert({ id, ...draft } as any);
        if (error) throw error;
        return id;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project_profile', projectId] });
    },
  });
}

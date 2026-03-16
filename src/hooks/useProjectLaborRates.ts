import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export function useProjectLaborRates(projectId?: string) {
  const { user, userOrgRoles } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentOrgId = userOrgRoles[0]?.organization?.id;

  // Bug #8: Use .limit(1) with order to avoid maybeSingle failure on multiple rows
  const { data: myRate, isLoading } = useQuery({
    queryKey: ['project-labor-rate', projectId, currentOrgId],
    queryFn: async () => {
      if (!projectId || !currentOrgId) return null;

      const { data, error } = await supabase
        .from('project_team')
        .select('id, labor_rate')
        .eq('project_id', projectId)
        .eq('org_id', currentOrgId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data?.[0]?.labor_rate as number | null ?? null;
    },
    enabled: !!projectId && !!currentOrgId,
  });

  const saveRateMutation = useMutation({
    mutationFn: async ({ rate, saveToProject }: { rate: number; saveToProject: boolean }) => {
      if (!projectId || !currentOrgId) throw new Error('Missing project or org');

      if (saveToProject) {
        const { error } = await supabase
          .from('project_team')
          .update({ labor_rate: rate } as never)
          .eq('project_id', projectId)
          .eq('org_id', currentOrgId);

        if (error) throw error;
      }

      return rate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-labor-rate', projectId] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to save rate',
        description: error.message,
      });
    },
  });

  return {
    myRate: myRate ?? null,
    isLoading,
    saveMyRate: saveRateMutation.mutateAsync,
    isSaving: saveRateMutation.isPending,
  };
}

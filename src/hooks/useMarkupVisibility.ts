import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type MarkupVisibility = 'hidden' | 'summary' | 'detailed';

export function useMarkupVisibility(projectId: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ['markup-visibility', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('tc_markup_visibility')
        .eq('id', projectId!)
        .maybeSingle();
      if (error) throw error;
      return (data?.tc_markup_visibility as MarkupVisibility) ?? 'hidden';
    },
    staleTime: 60_000,
  });

  return {
    visibility: (data ?? 'hidden') as MarkupVisibility,
    isLoading,
  };
}

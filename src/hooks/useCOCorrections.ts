import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { OrderCorrection } from '@/lib/coCorrection';

export function useCOCorrections(projectId: string, coId?: string) {
  return useQuery({
    queryKey: ['co-corrections', projectId, coId ?? 'all'],
    refetchInterval: 15000,
    queryFn: async () => {
      let query = supabase.from('co_corrections').select('*').eq('project_id', projectId);
      if (coId) query = query.eq('co_id', coId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(row => ({ ...row, scope_snapshot: Array.isArray(row.scope_snapshot) ? row.scope_snapshot as unknown as OrderCorrection['scope_snapshot'] : [] }));
    },
  });
}
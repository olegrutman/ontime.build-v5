import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SOVItemOption {
  id: string;
  item_name: string;
  value_amount: number;
  total_billed_amount: number;
  total_completion_percent: number;
  contract_name: string;
}

export function useProjectSOVItems(projectId: string) {
  return useQuery({
    queryKey: ['project-sov-items', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_sov_items')
        .select(`
          id,
          item_name,
          value_amount,
          total_billed_amount,
          total_completion_percent,
          sov:project_sov(
            contract:project_contracts(
              from_org:organizations!from_org_id(name),
              to_org:organizations!to_org_id(name)
            )
          )
        `)
        .eq('project_id', projectId)
        .order('item_name');

      if (error) throw error;

      // Transform data to include contract display name
      return (data || []).map(item => ({
        id: item.id,
        item_name: item.item_name,
        value_amount: item.value_amount,
        total_billed_amount: item.total_billed_amount,
        total_completion_percent: item.total_completion_percent,
        contract_name: item.sov?.contract 
          ? `${item.sov.contract.from_org?.name} → ${item.sov.contract.to_org?.name}`
          : 'Unknown Contract'
      })) as SOVItemOption[];
    },
    enabled: !!projectId,
  });
}
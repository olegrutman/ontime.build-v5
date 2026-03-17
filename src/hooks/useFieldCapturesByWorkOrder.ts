import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const QUERY_KEY = 'field-captures-by-wo';

export function useFieldCapturesByWorkOrder(workOrderId: string | null | undefined) {
  const queryClient = useQueryClient();

  const { data: captures = [], isLoading } = useQuery({
    queryKey: [QUERY_KEY, workOrderId],
    queryFn: async () => {
      if (!workOrderId) return [];
      const { data, error } = await supabase
        .from('field_captures')
        .select('*')
        .eq('converted_work_order_id', workOrderId)
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workOrderId,
  });

  useEffect(() => {
    if (!workOrderId) return;
    const channel = supabase
      .channel(`fc-wo-${workOrderId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'field_captures',
        filter: `converted_work_order_id=eq.${workOrderId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, workOrderId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workOrderId, queryClient]);

  return { captures, isLoading };
}

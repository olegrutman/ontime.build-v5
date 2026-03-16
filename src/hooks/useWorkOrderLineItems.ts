import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WorkOrderLineItem {
  id: string;
  project_id: string;
  change_order_id: string | null;
  org_id: string;
  created_by_user_id: string;
  catalog_item_id: string | null;
  item_name: string;
  division: string | null;
  category_name: string | null;
  group_label: string | null;
  unit: string;
  unit_rate: number;
  qty: number | null;
  hours: number | null;
  line_total: number;
  location_tag: string | null;
  material_spec: string | null;
  note: string | null;
  status: string;
  period_week: string;
  added_at: string | null;
}

const QUERY_KEY = 'work-order-line-items';

export function useWorkOrderLineItems(changeOrderId: string | null | undefined) {
  const queryClient = useQueryClient();

  const { data: lineItems = [], isLoading } = useQuery({
    queryKey: [QUERY_KEY, changeOrderId],
    queryFn: async () => {
      if (!changeOrderId) return [];
      const { data, error } = await supabase
        .from('work_order_line_items')
        .select('*')
        .eq('change_order_id', changeOrderId)
        .order('added_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as WorkOrderLineItem[];
    },
    enabled: !!changeOrderId,
  });

  useEffect(() => {
    if (!changeOrderId) return;
    const channel = supabase
      .channel(`wo-line-items-${changeOrderId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'work_order_line_items',
        filter: `change_order_id=eq.${changeOrderId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, changeOrderId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [changeOrderId, queryClient]);

  return { lineItems, isLoading };
}

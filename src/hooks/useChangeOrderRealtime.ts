import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribes to realtime changes on a specific work order and all its
 * sub-tables (fc_hours, tc_labor, materials, equipment, checklist, participants).
 * Invalidates React Query caches so every role sees updates instantly.
 */
export function useChangeOrderRealtime(changeOrderId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!changeOrderId) return;

    const invalidate = (key: string) => {
      queryClient.invalidateQueries({ queryKey: [key, changeOrderId] });
    };

    const invalidateAll = () => {
      invalidate('change-order');
      invalidate('change-order-participants');
      invalidate('change-order-fc-hours');
      invalidate('change-order-tc-labor');
      invalidate('change-order-materials');
      invalidate('change-order-equipment');
      invalidate('change-order-checklist');
    };

    const channel = supabase
      .channel(`wo-realtime-${changeOrderId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'change_order_projects',
        filter: `id=eq.${changeOrderId}`,
      }, invalidateAll)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'change_order_fc_hours',
        filter: `change_order_id=eq.${changeOrderId}`,
      }, () => {
        invalidate('change-order-fc-hours');
        invalidate('change-order');
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'change_order_tc_labor',
        filter: `change_order_id=eq.${changeOrderId}`,
      }, () => {
        invalidate('change-order-tc-labor');
        invalidate('change-order');
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'change_order_materials',
        filter: `change_order_id=eq.${changeOrderId}`,
      }, () => {
        invalidate('change-order-materials');
        invalidate('change-order');
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'change_order_equipment',
        filter: `change_order_id=eq.${changeOrderId}`,
      }, () => {
        invalidate('change-order-equipment');
        invalidate('change-order');
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'change_order_checklist',
        filter: `change_order_id=eq.${changeOrderId}`,
      }, () => {
        invalidate('change-order-checklist');
        invalidate('change-order');
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'change_order_participants',
        filter: `change_order_id=eq.${changeOrderId}`,
      }, () => {
        invalidate('change-order-participants');
        invalidate('change-order');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [changeOrderId, queryClient]);
}

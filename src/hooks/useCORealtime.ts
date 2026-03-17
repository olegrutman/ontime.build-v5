import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCORealtime(coId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!coId) return;

    const channel = supabase
      .channel(`co-realtime-${coId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'co_labor_entries', filter: `co_id=eq.${coId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['co-detail', coId, 'labor'] });
          queryClient.invalidateQueries({ queryKey: ['co-detail', coId, 'co'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'co_material_items', filter: `co_id=eq.${coId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['co-detail', coId, 'materials'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'co_equipment_items', filter: `co_id=eq.${coId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['co-detail', coId, 'equipment'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'co_nte_log', filter: `co_id=eq.${coId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['co-detail', coId, 'nte'] });
          queryClient.invalidateQueries({ queryKey: ['co-detail', coId, 'co'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'change_orders', filter: `id=eq.${coId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['co-detail', coId, 'co'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'co_activity', filter: `co_id=eq.${coId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['co-detail', coId, 'activity'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coId, queryClient]);
}

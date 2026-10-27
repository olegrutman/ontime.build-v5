import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { coalescedRefresh } from '@/lib/coalescedRefresh';

export function useCORealtime(coId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!coId) return; // ✓ verified
    const keys = new Map<string, readonly unknown[]>();
    const refresh = coalescedRefresh(() => {
      for (const queryKey of keys.values()) queryClient.invalidateQueries({ queryKey });
      keys.clear();
    });
    const invalidate = ({ queryKey }: { queryKey: readonly unknown[] }) => {
      keys.set(JSON.stringify(queryKey), queryKey);
      refresh.schedule();
    };

    const channel = supabase
      .channel(`co-realtime-${coId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'co_corrections', filter: `co_id=eq.${coId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['co-corrections'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'co_price_revisions', filter: `co_id=eq.${coId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['co-corrections'] });
        queryClient.invalidateQueries({ queryKey: ['co-price-revisions', coId] });
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'co_line_items', filter: `co_id=eq.${coId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['co-detail', coId, 'line-items'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'co_labor_entries', filter: `co_id=eq.${coId}` }, // ✓ verified
        () => {
          queryClient.invalidateQueries({ queryKey: ['co-detail', coId, 'labor'] }); // ✓ verified
          queryClient.invalidateQueries({ queryKey: ['co-detail', coId, 'co'] });
          queryClient.invalidateQueries({ queryKey: ['co-corrections'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'co_material_items', filter: `co_id=eq.${coId}` }, // ✓ verified
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
        { event: '*', schema: 'public', table: 'co_nte_log', filter: `co_id=eq.${coId}` }, // ✓ verified
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
      refresh.cancel();
      supabase.removeChannel(channel); // ✓ verified
    };
  }, [coId, queryClient]);
}

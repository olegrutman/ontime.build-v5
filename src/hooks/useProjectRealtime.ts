import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribes to realtime changes on change_order_projects, purchase_orders,
 * and invoices for a given project. Invalidates React-Query caches and
 * returns a refreshKey that increments on every change (useful for
 * components that don't use React Query).
 */
export function useProjectRealtime(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!projectId) return;

    const bump = () => setRefreshKey((k) => k + 1);

    const channel = supabase
      .channel(`project-realtime-${projectId}`)
      // Work orders
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'change_order_projects',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['change-order-projects'] });
          bump();
        }
      )
      // Purchase orders
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchase_orders',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          bump();
        }
      )
      // Invoices
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          bump();
        }
      )
      // RFIs
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_rfis',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['project-rfis'] });
          bump();
        }
      )
      // Returns
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'returns',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['returns'] });
          bump();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);

  return refreshKey;
}

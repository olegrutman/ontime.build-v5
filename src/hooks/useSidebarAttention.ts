import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useSidebarAttention(projectId: string | undefined) {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!projectId || !user) return;

    const fetch = async () => {
      const [coRes, invRes, poSubmittedRes, poPendingRes, rfiRes] = await Promise.all([
        supabase.from('change_orders').select('id', { count: 'exact', head: true })
          .eq('project_id', projectId).eq('status', 'SUBMITTED'),
        supabase.from('invoices').select('id', { count: 'exact', head: true })
          .eq('project_id', projectId).eq('status', 'SUBMITTED'),
        supabase.from('purchase_orders').select('id', { count: 'exact', head: true })
          .eq('project_id', projectId).eq('status', 'SUBMITTED'),
        supabase.from('purchase_orders').select('id', { count: 'exact', head: true })
          .eq('project_id', projectId).in('status', ['ORDERED', 'READY_FOR_DELIVERY']),
        supabase.from('project_rfis').select('id', { count: 'exact', head: true })
          .eq('project_id', projectId).in('status', ['open', 'in_review']),
      ]);

      const result: Record<string, number> = {};
      if (coRes.count && coRes.count > 0) result['change-orders'] = coRes.count;
      if (invRes.count && invRes.count > 0) result['invoices'] = invRes.count;
      // Combine SUBMITTED POs (need pricing) + ORDERED/READY (pending delivery)
      const poTotal = (poSubmittedRes.count || 0) + (poPendingRes.count || 0);
      if (poTotal > 0) result['purchase-orders'] = poTotal;
      if (rfiRes.count && rfiRes.count > 0) result['rfis'] = rfiRes.count;
      setCounts(result);
    };

    fetch();
  }, [projectId, user]);

  return counts;
}

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useSidebarAttention(projectId: string | undefined) {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!projectId || !user) return;

    const fetch = async () => {
      const [coRes, invRes, poRes] = await Promise.all([
        supabase.from('change_orders').select('id', { count: 'exact', head: true })
          .eq('project_id', projectId).eq('status', 'SUBMITTED'),
        supabase.from('invoices').select('id', { count: 'exact', head: true })
          .eq('project_id', projectId).eq('status', 'SUBMITTED'),
        supabase.from('purchase_orders').select('id', { count: 'exact', head: true })
          .eq('project_id', projectId).eq('status', 'SUBMITTED'),
      ]);

      const result: Record<string, number> = {};
      if (coRes.count && coRes.count > 0) result['change-orders'] = coRes.count;
      if (invRes.count && invRes.count > 0) result['invoices'] = invRes.count;
      if (poRes.count && poRes.count > 0) result['purchase-orders'] = poRes.count;
      setCounts(result);
    };

    fetch();
  }, [projectId, user]);

  return counts;
}

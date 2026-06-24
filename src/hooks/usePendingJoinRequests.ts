import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function usePendingJoinRequests(orgId: string | undefined) {
  const [count, setCount] = useState(0);

  const fetch = useCallback(async () => {
    if (!orgId) return;
    const { count: c } = await supabase
      .from('org_join_requests')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'pending');
    setCount(c ?? 0);
  }, [orgId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`join-requests-${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'org_join_requests', filter: `organization_id=eq.${orgId}` },
        () => fetch()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, fetch]);

  return count;
}

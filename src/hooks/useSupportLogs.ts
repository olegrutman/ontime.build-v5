import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SupportActionLog } from '@/types/platform';

interface LogFilters {
  dateFrom?: string;
  dateTo?: string;
  actionType?: string;
  targetOrgId?: string;
  platformUserId?: string;
}

export function useSupportLogs(filters?: LogFilters) {
  const [logs, setLogs] = useState<SupportActionLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('support_actions_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (filters?.dateFrom) query = query.gte('created_at', filters.dateFrom);
    if (filters?.dateTo) query = query.lte('created_at', filters.dateTo);
    if (filters?.actionType) query = query.eq('action_type', filters.actionType);
    if (filters?.targetOrgId) query = query.eq('target_org_id', filters.targetOrgId);
    if (filters?.platformUserId) query = query.eq('created_by_user_id', filters.platformUserId);

    const { data } = await query;
    setLogs((data || []) as unknown as SupportActionLog[]);
    setLoading(false);
  }, [filters?.dateFrom, filters?.dateTo, filters?.actionType, filters?.targetOrgId, filters?.platformUserId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, refetch: fetchLogs };
}

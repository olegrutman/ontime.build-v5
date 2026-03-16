import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { LogItem, LogItemStatus } from '@/types/quickLog';

interface LogItemInput {
  project_id: string;
  org_id: string;
  catalog_item_id?: string;
  item_name: string;
  division: string;
  category_name: string;
  unit: string;
  qty?: number;
  hours?: number;
  unit_rate: number;
  material_spec?: string;
  location?: string;
  note?: string;
}

export function useWorkOrderLog(projectId: string, orgId?: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const key = ['work-order-log', projectId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_order_log_items')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as LogItem[];
    },
    enabled: !!projectId,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`work-order-log-${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'work_order_log_items',
        filter: `project_id=eq.${projectId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: key });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, qc]);

  const allItems = query.data || [];

  const counts = useMemo(() => {
    let openCount = 0, openTotal = 0, submittedCount = 0, submittedTotal = 0, approvedCount = 0, approvedTotal = 0;
    for (const item of allItems) {
      if (item.status === 'open') { openCount++; openTotal += item.line_total || 0; }
      else if (item.status === 'submitted_to_tc' || item.status === 'submitted_to_gc') { submittedCount++; submittedTotal += item.line_total || 0; }
      else if (item.status === 'approved') { approvedCount++; approvedTotal += item.line_total || 0; }
    }
    return { openCount, openTotal, submittedCount, submittedTotal, approvedCount, approvedTotal };
  }, [allItems]);

  const logItem = useMutation({
    mutationFn: async (input: LogItemInput) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('work_order_log_items')
        .insert({
          ...input,
          created_by_user_id: user.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as LogItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LogItemStatus }) => {
      const { error } = await supabase
        .from('work_order_log_items')
        .update({ status } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const submitAllOpen = useMutation({
    mutationFn: async ({ targetStatus }: { targetStatus: 'submitted_to_tc' | 'submitted_to_gc' }) => {
      if (!user || !orgId) throw new Error('Not authenticated');
      const openItems = allItems.filter(i => i.status === 'open');
      if (openItems.length === 0) throw new Error('No open items');

      const { error } = await supabase
        .from('work_order_log_items')
        .update({ status: targetStatus } as any)
        .eq('project_id', projectId)
        .eq('status', 'open')
        .eq('created_by_user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    items: allItems,
    loading: query.isLoading,
    ...counts,
    logItem,
    updateStatus,
    submitAllOpen,
  };
}

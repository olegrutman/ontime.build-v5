import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ScheduleItem {
  id: string;
  project_id: string;
  title: string;
  item_type: 'task' | 'milestone' | 'phase';
  start_date: string;
  end_date: string | null;
  progress: number;
  dependency_ids: string[];
  work_order_id: string | null;
  sov_item_id: string | null;
  color: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Computed fields
  sov_item?: {
    id: string;
    description: string;
    value_amount: number;
    total_billed_amount: number;
    billing_progress: number;
  };
}

export type ScheduleItemInsert = Omit<ScheduleItem, 'id' | 'created_at' | 'updated_at'>;

export function useProjectSchedule(projectId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const key = ['project-schedule', projectId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_schedule_items')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as ScheduleItem[];
    },
    enabled: !!projectId,
  });

  const addItem = useMutation({
    mutationFn: async (item: Partial<ScheduleItemInsert> & { title: string; start_date: string }) => {
      const { data, error } = await supabase
        .from('project_schedule_items')
        .insert({
          project_id: projectId,
          created_by: user?.id ?? null,
          item_type: 'task',
          progress: 0,
          sort_order: (query.data?.length ?? 0),
          dependency_ids: [],
          ...item,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ScheduleItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScheduleItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('project_schedule_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ScheduleItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_schedule_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { ...query, items: query.data ?? [], addItem, updateItem, deleteItem };
}

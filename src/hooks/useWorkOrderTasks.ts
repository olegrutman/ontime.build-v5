import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WorkOrderTask, WorkOrderTaskStatus } from '@/types/workOrderTask';

const QUERY_KEY = 'work-order-tasks';

export function useWorkOrderTasks(workOrderId: string | null | undefined) {
  const queryClient = useQueryClient();

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: [QUERY_KEY, workOrderId],
    queryFn: async () => {
      if (!workOrderId) return [];
      const { data, error } = await supabase
        .from('work_order_tasks')
        .select('*')
        .eq('work_order_id', workOrderId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as WorkOrderTask[];
    },
    enabled: !!workOrderId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!workOrderId) return;
    const channel = supabase
      .channel(`wo-tasks-${workOrderId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'work_order_tasks',
        filter: `work_order_id=eq.${workOrderId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, workOrderId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [workOrderId, queryClient]);

  // Add task
  const addTask = useMutation({
    mutationFn: async (task: {
      title?: string;
      description?: string;
      location_data?: Record<string, string | undefined>;
      work_type?: string;
      reason?: string;
      structural_element?: string;
      scope_size?: string;
      urgency?: string;
      photo_url?: string;
      voice_note_url?: string;
      field_capture_id?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const nextOrder = tasks.length;
      const { data, error } = await supabase
        .from('work_order_tasks')
        .insert({
          work_order_id: workOrderId!,
          sort_order: nextOrder,
          title: task.title || '',
          description: task.description || null,
          location_data: task.location_data || {},
          work_type: task.work_type || null,
          reason: task.reason || null,
          structural_element: task.structural_element || null,
          scope_size: task.scope_size || null,
          urgency: task.urgency || null,
          photo_url: task.photo_url || null,
          voice_note_url: task.voice_note_url || null,
          field_capture_id: task.field_capture_id || null,
          created_by: user?.id || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, workOrderId] });
    },
  });

  // Update task
  const updateTask = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<WorkOrderTask> }) => {
      const { error } = await supabase
        .from('work_order_tasks')
        .update(updates as any)
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, workOrderId] });
    },
  });

  // Update task status
  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: WorkOrderTaskStatus }) => {
      const { error } = await supabase
        .from('work_order_tasks')
        .update({ status } as any)
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, workOrderId] });
    },
  });

  // Delete task
  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('work_order_tasks')
        .delete()
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, workOrderId] });
    },
  });

  return {
    tasks,
    isLoading,
    addTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
  };
}

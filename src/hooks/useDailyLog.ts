import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { DailyLog, DailyLogManpower, DailyLogDelay, DailyLogDelivery, DailyLogPhoto, WeatherData, SafetyIncident } from '@/types/dailyLog';

export function useDailyLog(projectId: string, logDate?: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const date = logDate || new Date().toISOString().split('T')[0];
  const key = ['daily-log', projectId, date];

  // Fetch or auto-create today's log
  const logQuery = useQuery({
    queryKey: key,
    queryFn: async () => {
      // Try to fetch existing
      const { data: existing } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('project_id', projectId)
        .eq('log_date', date)
        .maybeSingle();

      if (existing) return existing as unknown as DailyLog;

      // Auto-create draft
      const { data: created, error } = await supabase
        .from('daily_logs')
        .insert({
          project_id: projectId,
          log_date: date,
          created_by: user?.id ?? '',
          weather_data: {},
          safety_incidents: [],
          notes: '',
        })
        .select()
        .single();

      if (error) throw error;
      return created as unknown as DailyLog;
    },
    enabled: !!projectId && !!user,
  });

  const logId = logQuery.data?.id;

  // Manpower
  const manpowerQuery = useQuery({
    queryKey: ['daily-log-manpower', logId],
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_log_manpower')
        .select('*')
        .eq('log_id', logId!)
        .order('created_at');
      return (data || []) as unknown as DailyLogManpower[];
    },
    enabled: !!logId,
  });

  // Delays
  const delaysQuery = useQuery({
    queryKey: ['daily-log-delays', logId],
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_log_delays')
        .select('*')
        .eq('log_id', logId!)
        .order('created_at');
      return (data || []) as unknown as DailyLogDelay[];
    },
    enabled: !!logId,
  });

  // Photos
  const photosQuery = useQuery({
    queryKey: ['daily-log-photos', logId],
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_log_photos')
        .select('*')
        .eq('log_id', logId!)
        .order('created_at');
      return (data || []) as unknown as DailyLogPhoto[];
    },
    enabled: !!logId,
  });

  // Deliveries
  const deliveriesQuery = useQuery({
    queryKey: ['daily-log-deliveries', logId],
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_log_deliveries')
        .select('*')
        .eq('log_id', logId!)
        .order('created_at');
      return (data || []) as unknown as DailyLogDelivery[];
    },
    enabled: !!logId,
  });

  // --- Mutations ---

  const updateLog = useMutation({
    mutationFn: async (updates: Partial<Pick<DailyLog, 'weather_data' | 'safety_incidents' | 'notes' | 'manpower_total' | 'delay_hours' | 'status' | 'submitted_at'>>) => {
      const { error } = await supabase
        .from('daily_logs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', logId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const upsertManpower = useMutation({
    mutationFn: async (entries: { id?: string; org_id?: string | null; trade: string; headcount: number }[]) => {
      // Delete existing then re-insert
      await supabase.from('daily_log_manpower').delete().eq('log_id', logId!);
      if (entries.length > 0) {
        const { error } = await supabase
          .from('daily_log_manpower')
          .insert(entries.map(e => ({ log_id: logId!, org_id: e.org_id ?? null, trade: e.trade, headcount: e.headcount })));
        if (error) throw error;
      }
      // Update total on log
      const total = entries.reduce((sum, e) => sum + e.headcount, 0);
      await supabase.from('daily_logs').update({ manpower_total: total, updated_at: new Date().toISOString() }).eq('id', logId!);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-log-manpower', logId] });
      qc.invalidateQueries({ queryKey: key });
    },
  });

  const upsertDelays = useMutation({
    mutationFn: async (entries: { cause: string; hours_lost: number; notes?: string }[]) => {
      await supabase.from('daily_log_delays').delete().eq('log_id', logId!);
      if (entries.length > 0) {
        const { error } = await supabase
          .from('daily_log_delays')
          .insert(entries.map(e => ({ log_id: logId!, cause: e.cause, hours_lost: e.hours_lost, notes: e.notes || '' })));
        if (error) throw error;
      }
      const totalHours = entries.reduce((sum, e) => sum + e.hours_lost, 0);
      await supabase.from('daily_logs').update({ delay_hours: totalHours, updated_at: new Date().toISOString() }).eq('id', logId!);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-log-delays', logId] });
      qc.invalidateQueries({ queryKey: key });
    },
  });

  const addPhoto = useMutation({
    mutationFn: async (photo: { storage_path: string; tag: string; caption?: string }) => {
      const { error } = await supabase
        .from('daily_log_photos')
        .insert({ log_id: logId!, ...photo });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-log-photos', logId] }),
  });

  const deletePhoto = useMutation({
    mutationFn: async (photoId: string) => {
      const { error } = await supabase.from('daily_log_photos').delete().eq('id', photoId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-log-photos', logId] }),
  });

  const upsertDeliveries = useMutation({
    mutationFn: async (entries: { po_id: string; status: string; notes?: string }[]) => {
      await supabase.from('daily_log_deliveries').delete().eq('log_id', logId!);
      if (entries.length > 0) {
        const { error } = await supabase
          .from('daily_log_deliveries')
          .insert(entries.map(e => ({ log_id: logId!, po_id: e.po_id, status: e.status, notes: e.notes || '' })));
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-log-deliveries', logId] }),
  });

  const submitLog = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('daily_logs')
        .update({ status: 'submitted', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', logId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    log: logQuery.data,
    logLoading: logQuery.isLoading,
    logId,
    manpower: manpowerQuery.data ?? [],
    delays: delaysQuery.data ?? [],
    photos: photosQuery.data ?? [],
    deliveries: deliveriesQuery.data ?? [],
    updateLog,
    upsertManpower,
    upsertDelays,
    addPhoto,
    deletePhoto,
    upsertDeliveries,
    submitLog,
    isSubmitted: logQuery.data?.status === 'submitted',
  };
}

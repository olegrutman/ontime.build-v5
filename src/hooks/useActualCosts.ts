
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface ActualCostEntry {
  id: string;
  change_order_id: string;
  entry_date: string;
  cost_type: 'hours' | 'lump_sum';
  description: string;
  men_count: number | null;
  hours_per_man: number | null;
  hourly_rate: number | null;
  lump_amount: number | null;
  total_amount: number;
  entered_by: string;
  organization_id: string;
  created_at: string;
}

export type NewActualCostEntry = {
  change_order_id: string;
  entry_date: string;
  cost_type: 'hours' | 'lump_sum';
  description: string;
  men_count?: number | null;
  hours_per_man?: number | null;
  hourly_rate?: number | null;
  lump_amount?: number | null;
  total_amount: number;
};

export function useActualCosts(changeOrderId: string | undefined) {
  const { user, orgId } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['actual-costs', changeOrderId];

  const { data: entries = [], isLoading } = useQuery({
    queryKey,
    enabled: !!changeOrderId && !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('actual_cost_entries')
        .select('*')
        .eq('change_order_id', changeOrderId!)
        .order('entry_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ActualCostEntry[];
    },
  });

  const totalActualCost = entries.reduce((s, e) => s + (e.total_amount || 0), 0);

  const addEntry = useMutation({
    mutationFn: async (entry: NewActualCostEntry) => {
      if (!user || !orgId) throw new Error('Not authenticated');
      const { error } = await supabase.from('actual_cost_entries').insert({
        ...entry,
        entered_by: user.id,
        organization_id: orgId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Cost entry saved' });
    },
    onError: (e: any) => {
      toast({ title: 'Error saving cost', description: e.message, variant: 'destructive' });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase.from('actual_cost_entries').delete().eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Entry deleted' });
    },
    onError: (e: any) => {
      toast({ title: 'Error deleting', description: e.message, variant: 'destructive' });
    },
  });

  return { entries, totalActualCost, isLoading, addEntry, deleteEntry };
}

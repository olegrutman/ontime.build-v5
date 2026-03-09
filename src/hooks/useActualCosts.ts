
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface ActualCostEntry {
  id: string;
  change_order_id: string | null;
  project_id: string | null;
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
  change_order_id?: string | null;
  project_id?: string | null;
  entry_date: string;
  cost_type: 'hours' | 'lump_sum';
  description: string;
  men_count?: number | null;
  hours_per_man?: number | null;
  hourly_rate?: number | null;
  lump_amount?: number | null;
  total_amount: number;
};

interface UseActualCostsOptions {
  changeOrderId?: string;
  projectId?: string;
}

export function useActualCosts({ changeOrderId, projectId }: UseActualCostsOptions) {
  const { user, userOrgRoles } = useAuth();
  const orgId = userOrgRoles[0]?.organization?.id;
  const queryClient = useQueryClient();
  const queryKey = ['actual-costs', changeOrderId ?? null, projectId ?? null];

  const { data: entries = [], isLoading } = useQuery({
    queryKey,
    enabled: !!(changeOrderId || projectId) && !!orgId,
    queryFn: async () => {
      let query = supabase
        .from('actual_cost_entries')
        .select('*')
        .order('entry_date', { ascending: false });

      if (changeOrderId) {
        query = query.eq('change_order_id', changeOrderId);
      } else if (projectId) {
        query = query.eq('project_id', projectId).is('change_order_id', null);
      }

      const { data, error } = await query;
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

/** Fetches ALL actual cost entries for a project (project-level + all work-order-level) */
export function useProjectActualCosts(projectId: string | undefined) {
  const { userOrgRoles } = useAuth();
  const orgId = userOrgRoles[0]?.organization?.id;

  const { data: totalActualCost = 0, isLoading } = useQuery({
    queryKey: ['actual-costs-project-total', projectId],
    enabled: !!projectId && !!orgId,
    queryFn: async () => {
      // Get project-level entries
      const { data: projectEntries, error: e1 } = await supabase
        .from('actual_cost_entries')
        .select('total_amount')
        .eq('project_id', projectId!)
        .is('change_order_id', null);
      if (e1) throw e1;

      // Get all WO-level entries for COs in this project
      // Get WO-level entries: fetch COs for this project, then their cost entries
      const { data: cos } = await supabase
        .from('change_order_projects')
        .select('id')
        .eq('project_id', projectId!);
      const coIds = (cos ?? []).map(c => c.id);
      
      let woEntries: { total_amount: number }[] = [];
      if (coIds.length > 0) {
        const { data, error: e2 } = await supabase
          .from('actual_cost_entries')
          .select('total_amount')
          .in('change_order_id', coIds);
        if (e2) throw e2;
        woEntries = data ?? [];
      }
      if (e2) throw e2;

      const sum = [...(projectEntries ?? []), ...(woEntries ?? [])]
        .reduce((s, e) => s + ((e as any).total_amount || 0), 0);
      return sum;
    },
  });

  return { totalActualCost, isLoading };
}

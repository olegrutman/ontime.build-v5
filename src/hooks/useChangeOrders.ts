import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ChangeOrder, COStatus } from '@/types/changeOrder';

export interface GroupedChangeOrders {
  mine: {
    draft:      ChangeOrder[];
    shared:     ChangeOrder[];
    combined:   ChangeOrder[];
    submitted:  ChangeOrder[];
    approved:   ChangeOrder[];
    rejected:   ChangeOrder[];
    contracted: ChangeOrder[];
  };
  sharedWithMe: ChangeOrder[];
}

export function useChangeOrders(projectId: string | null) {
  const { userOrgRoles, user } = useAuth();
  const orgId = userOrgRoles?.[0]?.organization_id ?? null;
  const queryClient = useQueryClient();

  const { data: changeOrders = [], isLoading } = useQuery({
    queryKey: ['change-orders', projectId, orgId],
    enabled: !!projectId && !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ChangeOrder[];
    },
  });

  const grouped: GroupedChangeOrders = {
    mine: {
      draft:      [],
      shared:     [],
      combined:   [],
      submitted:  [],
      approved:   [],
      rejected:   [],
      contracted: [],
    },
    sharedWithMe: [],
  };

  for (const co of changeOrders) {
    const isMine = co.org_id === orgId;
    if (isMine) {
      const bucket = co.status as COStatus;
      if (bucket in grouped.mine) {
        grouped.mine[bucket as keyof typeof grouped.mine].push(co);
      }
    } else {
      grouped.sharedWithMe.push(co);
    }
  }

  const createCO = useMutation({
    mutationFn: async (input: Omit<ChangeOrder,
      'id' | 'created_at' | 'updated_at' | 'co_number' |
      'shared_at' | 'combined_at' | 'submitted_at' |
      'approved_at' | 'rejected_at' | 'contracted_at' |
      'nte_increase_requested' | 'nte_increase_approved'
    >) => {
      const { data, error } = await supabase
        .from('change_orders')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as ChangeOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders', projectId, orgId] });
    },
  });

  const updateCO = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ChangeOrder> }) => {
      const { data, error } = await supabase
        .from('change_orders')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ChangeOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders', projectId, orgId] });
    },
  });

  const shareCO = useMutation({
    mutationFn: async (coId: string) => {
      const { data, error } = await supabase
        .from('change_orders')
        .update({
          status: 'shared',
          shared_at: new Date().toISOString(),
          draft_shared_with_next: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', coId)
        .select()
        .single();
      if (error) throw error;
      return data as ChangeOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders', projectId, orgId] });
    },
  });

  const combineCOs = useMutation({
    mutationFn: async ({
      memberCoIds,
      title,
    }: {
      memberCoIds: string[];
      title?: string;
    }) => {
      if (!orgId || !projectId || !user) throw new Error('Not authenticated');

      const sourceOrg = changeOrders.find(c => c.id === memberCoIds[0]);
      if (!sourceOrg) throw new Error('Source CO not found');

      const { data: combined, error: createError } = await supabase
        .from('change_orders')
        .insert({
          org_id: orgId,
          project_id: projectId,
          created_by_user_id: user.id,
          created_by_role: sourceOrg.created_by_role,
          title: title ?? null,
          status: 'combined',
          pricing_type: sourceOrg.pricing_type,
          reason: sourceOrg.reason,
          combined_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) throw createError;

      const memberRows = memberCoIds.map(id => ({
        combined_co_id: combined.id,
        member_co_id: id,
      }));
      const { error: memberError } = await supabase
        .from('co_combined_members')
        .insert(memberRows);
      if (memberError) throw memberError;

      const { error: updateError } = await supabase
        .from('change_orders')
        .update({
          status: 'combined',
          combined_co_id: combined.id,
          combined_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', memberCoIds);
      if (updateError) throw updateError;

      return combined as ChangeOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders', projectId, orgId] });
    },
  });

  return {
    changeOrders,
    grouped,
    isLoading,
    createCO,
    updateCO,
    shareCO,
    combineCOs,
  };
}

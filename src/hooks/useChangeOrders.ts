import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ChangeOrder, COCollaboratorStatus, COStatus } from '@/types/changeOrder';

export interface ChangeOrderWithMembers extends ChangeOrder {
  collaboratorStatus?: COCollaboratorStatus;
  collaboratorOrgId?: string;
}

export interface GroupedChangeOrders {
  mine: {
    draft: ChangeOrderWithMembers[];
    shared: ChangeOrderWithMembers[];
    work_in_progress: ChangeOrderWithMembers[];
    closed_for_pricing: ChangeOrderWithMembers[];
    submitted: ChangeOrderWithMembers[];
    approved: ChangeOrderWithMembers[];
    rejected: ChangeOrderWithMembers[];
    contracted: ChangeOrderWithMembers[];
  };
  sharedWithMe: ChangeOrderWithMembers[];
}

export function useChangeOrders(projectId: string | null) {
  const { userOrgRoles, user } = useAuth();
  const orgId = userOrgRoles?.[0]?.organization_id ?? null;
  const queryClient = useQueryClient();

  const invalidateChangeOrders = () => {
    queryClient.invalidateQueries({ queryKey: ['change-orders', projectId] });
  };

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
      const allCOs = data as ChangeOrder[];

      const collaboratorMap = new Map<string, { status: COCollaboratorStatus; organization_id: string }>();
      if (allCOs.length > 0) {
        const { data: collaborators, error: collaboratorError } = await supabase
          .from('change_order_collaborators')
          .select('co_id, status, organization_id')
          .eq('organization_id', orgId!)
          .in('co_id', allCOs.map(co => co.id));

        if (collaboratorError) throw collaboratorError;

        for (const collaborator of collaborators ?? []) {
          collaboratorMap.set(collaborator.co_id, {
            status: collaborator.status as COCollaboratorStatus,
            organization_id: collaborator.organization_id,
          });
        }
      }

      return allCOs.map(c => ({
        ...c,
        collaboratorStatus: collaboratorMap.get(c.id)?.status,
        collaboratorOrgId: collaboratorMap.get(c.id)?.organization_id,
      })) as ChangeOrderWithMembers[];
    },
  });

  const grouped: GroupedChangeOrders = {
    mine: {
      draft: [],
      shared: [],
      work_in_progress: [],
      closed_for_pricing: [],
      submitted: [],
      approved: [],
      rejected: [],
      contracted: [],
    },
    sharedWithMe: [],
  };

  for (const co of changeOrders) {
    const isMine = co.org_id === orgId;
    const isCollaborator = co.collaboratorOrgId === orgId && (co.collaboratorStatus === 'active' || co.collaboratorStatus === 'completed');

    if (isMine) {
      const bucket = co.status as COStatus;
      if (bucket in grouped.mine) {
        grouped.mine[bucket as keyof typeof grouped.mine].push(co);
      }
    } else if ((co.assigned_to_org_id === orgId && co.org_id !== orgId) || isCollaborator) {
      grouped.sharedWithMe.push(co);
    }
  }

  const createCO = useMutation({
    mutationFn: async (input: Omit<ChangeOrder,
      'id' | 'created_at' | 'updated_at' | 'co_number' |
      'shared_at' | 'submitted_at' |
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
    onSuccess: invalidateChangeOrders,
  });

  const updateCO = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ChangeOrder> }) => {
      const { data, error } = await supabase
        .from('change_orders')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("You don't have permission to update this change order.");
      return data as ChangeOrder;
    },
    onSuccess: invalidateChangeOrders,
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
    onSuccess: invalidateChangeOrders,
  });

  return {
    changeOrders,
    grouped,
    isLoading,
    createCO,
    updateCO,
    shareCO,
  };
}

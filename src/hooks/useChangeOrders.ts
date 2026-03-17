import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ChangeOrder, COStatus } from '@/types/changeOrder';

export interface COMemberPreview {
  id: string;
  title: string | null;
  location_tag: string | null;
  reason: string | null;
}

export interface ChangeOrderWithMembers extends ChangeOrder {
  memberPreviews?: COMemberPreview[];
}

export interface GroupedChangeOrders {
  mine: {
    draft:      ChangeOrderWithMembers[];
    shared:     ChangeOrderWithMembers[];
    combined:   ChangeOrderWithMembers[];
    submitted:  ChangeOrderWithMembers[];
    approved:   ChangeOrderWithMembers[];
    rejected:   ChangeOrderWithMembers[];
    contracted: ChangeOrderWithMembers[];
  };
  sharedWithMe: ChangeOrderWithMembers[];
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
      const allCOs = data as ChangeOrder[];

      // Find parent combined COs (status=combined, no combined_co_id)
      const parentCOs = allCOs.filter(c => c.status === 'combined' && !c.combined_co_id);
      const parentIds = parentCOs.map(c => c.id);

      // Fetch member mappings for all parents
      let memberMap: Record<string, COMemberPreview[]> = {};
      if (parentIds.length > 0) {
        const { data: members } = await supabase
          .from('co_combined_members')
          .select('combined_co_id, member_co_id')
          .in('combined_co_id', parentIds);

        if (members && members.length > 0) {
          const memberCoIds = members.map(m => m.member_co_id);
          const memberCOMap = new Map<string, ChangeOrder>();
          allCOs.forEach(c => { if (memberCoIds.includes(c.id)) memberCOMap.set(c.id, c); });

          for (const m of members) {
            if (!memberMap[m.combined_co_id]) memberMap[m.combined_co_id] = [];
            const mc = memberCOMap.get(m.member_co_id);
            memberMap[m.combined_co_id].push({
              id: m.member_co_id,
              title: mc?.title ?? mc?.co_number ?? null,
              location_tag: mc?.location_tag ?? null,
              reason: mc?.reason ?? null,
            });
          }
        }
      }

      // Filter out child COs (absorbed into a parent)
      const childIds = new Set(Object.values(memberMap).flat().map(m => m.id));
      const filtered = allCOs.filter(c => !childIds.has(c.id));

      // Attach member previews to parents
      return filtered.map(c => ({
        ...c,
        memberPreviews: memberMap[c.id] ?? undefined,
      })) as ChangeOrderWithMembers[];
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

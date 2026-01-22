import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { ChangeWork, ChangeWorkPricing, WorkItemParticipant } from '@/types/changeWork';
import { WorkItemState } from '@/types/workItem';
import { useToast } from './use-toast';

export function useChangeWork() {
  const { user, userOrgRoles, currentRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = userOrgRoles[0]?.organization_id;

  // Fetch all change work items
  const { data: changeWorks = [], isLoading } = useQuery({
    queryKey: ['change-works', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('work_items')
        .select(`
          *,
          organization:organizations(id, org_code, name, type)
        `)
        .eq('item_type', 'CHANGE_WORK')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ChangeWork[];
    },
    enabled: !!orgId,
  });

  // Fetch pricing for a specific change work
  const usePricing = (workItemId: string | null) => {
    return useQuery({
      queryKey: ['change-work-pricing', workItemId],
      queryFn: async () => {
        if (!workItemId) return [];

        const { data, error } = await supabase
          .from('change_work_pricing')
          .select('*')
          .eq('work_item_id', workItemId)
          .order('sort_order');

        if (error) throw error;
        return data as ChangeWorkPricing[];
      },
      enabled: !!workItemId,
    });
  };

  // Fetch participants for a specific change work
  const useParticipants = (workItemId: string | null) => {
    return useQuery({
      queryKey: ['change-work-participants', workItemId],
      queryFn: async () => {
        if (!workItemId) return [];

        const { data, error } = await supabase
          .from('work_item_participants')
          .select(`
            *,
            organization:organizations(id, org_code, name, type)
          `)
          .eq('work_item_id', workItemId);

        if (error) throw error;
        return data as WorkItemParticipant[];
      },
      enabled: !!workItemId,
    });
  };

  // Create change work
  const createMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      location_ref?: string;
      parent_work_item_id?: string;
      project_id?: string;
    }) => {
      if (!user || !orgId) throw new Error('Not authenticated');

      // Generate code
      const { data: codeResult } = await supabase.rpc('generate_change_work_code', {
        org_id: orgId,
      });

      const { data: result, error } = await supabase
        .from('work_items')
        .insert({
          organization_id: orgId,
          item_type: 'CHANGE_WORK',
          state: 'OPEN',
          title: data.title,
          description: data.description,
          location_ref: data.location_ref,
          parent_work_item_id: data.parent_work_item_id,
          project_id: data.project_id,
          code: codeResult,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-works'] });
      toast({ title: 'Change Order created' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create',
        description: error.message,
      });
    },
  });

  // Add pricing item
  const addPricingMutation = useMutation({
    mutationFn: async (data: {
      work_item_id: string;
      description: string;
      quantity: number;
      unit_price: number;
      uom: string;
      notes?: string;
    }) => {
      const { data: result, error } = await supabase
        .from('change_work_pricing')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['change-work-pricing', variables.work_item_id] });
    },
  });

  // Update pricing item
  const updatePricingMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      work_item_id: string;
      description?: string;
      quantity?: number;
      unit_price?: number;
      uom?: string;
      notes?: string;
    }) => {
      const { id, work_item_id, ...updates } = data;
      const { error } = await supabase
        .from('change_work_pricing')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['change-work-pricing', variables.work_item_id] });
    },
  });

  // Delete pricing item
  const deletePricingMutation = useMutation({
    mutationFn: async ({ id, work_item_id }: { id: string; work_item_id: string }) => {
      const { error } = await supabase
        .from('change_work_pricing')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['change-work-pricing', variables.work_item_id] });
    },
  });

  // Invite participant by org_code
  const inviteParticipantMutation = useMutation({
    mutationFn: async ({ work_item_id, org_code }: { work_item_id: string; org_code: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Look up organization by org_code
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('org_code', org_code.toUpperCase())
        .maybeSingle();

      if (orgError || !org) {
        throw new Error('Organization not found');
      }

      const { error } = await supabase
        .from('work_item_participants')
        .insert({
          work_item_id,
          organization_id: org.id,
          invited_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['change-work-participants', variables.work_item_id] });
      toast({ title: 'Participant invited' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to invite',
        description: error.message,
      });
    },
  });

  // Remove participant
  const removeParticipantMutation = useMutation({
    mutationFn: async ({ id, work_item_id }: { id: string; work_item_id: string }) => {
      const { error } = await supabase
        .from('work_item_participants')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['change-work-participants', variables.work_item_id] });
      toast({ title: 'Participant removed' });
    },
  });

  // Advance state
  const advanceStateMutation = useMutation({
    mutationFn: async ({
      id,
      newState,
      rejectionNotes,
      amount,
    }: {
      id: string;
      newState: WorkItemState;
      rejectionNotes?: string;
      amount?: number;
    }) => {
      // Special handling for EXECUTED - use the database function
      if (newState === 'EXECUTED') {
        const { error } = await supabase.rpc('execute_change_work', {
          change_work_id: id,
        });
        if (error) throw error;
        return;
      }

      const updates: Record<string, unknown> = {
        state: newState,
        updated_at: new Date().toISOString(),
      };

      if (newState === 'OPEN' && rejectionNotes) {
        updates.rejection_notes = rejectionNotes;
      }

      if (amount !== undefined) {
        updates.amount = amount;
      }

      const { error } = await supabase
        .from('work_items')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-works'] });
      toast({ title: 'Status updated' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update status',
        description: error.message,
      });
    },
  });

  return {
    changeWorks,
    isLoading,
    usePricing,
    useParticipants,
    createChangeWork: createMutation.mutate,
    addPricing: addPricingMutation.mutate,
    updatePricing: updatePricingMutation.mutate,
    deletePricing: deletePricingMutation.mutate,
    inviteParticipant: inviteParticipantMutation.mutate,
    removeParticipant: removeParticipantMutation.mutate,
    advanceState: advanceStateMutation.mutate,
    currentRole,
    isCreating: createMutation.isPending,
    isAdvancing: advanceStateMutation.isPending,
  };
}

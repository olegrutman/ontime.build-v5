import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import {
  ChangeOrderProject,
  ChangeOrderParticipant,
  ChangeOrderFCHours,
  ChangeOrderTCLabor,
  ChangeOrderMaterial,
  ChangeOrderEquipment,
  ChangeOrderChecklist,
  ChangeOrderWizardData,
  ChangeOrderStatus,
  LocationData,
} from '@/types/changeOrderProject';

export function useChangeOrderProject(projectId?: string) {
  const { user, currentRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all change orders for a project
  const { data: changeOrders = [], isLoading } = useQuery({
    queryKey: ['change-order-projects', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('change_order_projects')
        .select(`
          *,
          project:projects(id, name)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ChangeOrderProject[];
    },
    enabled: !!projectId,
  });

  // Create change order with participants
  const createMutation = useMutation({
    mutationFn: async (data: ChangeOrderWizardData & { project_id: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Generate title if empty
      const title = data.title || generateTitleFromLocation(data.location_data);

      const insertData = {
        project_id: data.project_id,
        title,
        description: data.description || null,
        location_data: data.location_data,
        work_type: data.work_type,
        requires_materials: data.requires_materials,
        material_cost_responsibility: data.material_cost_responsibility,
        requires_equipment: data.requires_equipment,
        equipment_cost_responsibility: data.equipment_cost_responsibility,
        created_by: user.id,
        created_by_role: currentRole,
        status: 'draft',
      };

      // Insert the work order
      const { data: result, error } = await supabase
        .from('change_order_projects')
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;
      
      const workOrder = result as unknown as ChangeOrderProject;

      // Insert participants if provided
      const participantsToInsert: Array<{
        change_order_id: string;
        organization_id: string;
        role: string;
        is_active: boolean;
        invited_by: string;
      }> = [];

      // Add the assigned contractor as primary participant
      if (data.assigned_org_id) {
        // Determine role based on who created (GC assigns TC, TC assigns FC)
        const assignedRole = currentRole === 'GC_PM' ? 'TC' : 'FC';
        participantsToInsert.push({
          change_order_id: workOrder.id,
          organization_id: data.assigned_org_id,
          role: assignedRole,
          is_active: true,
          invited_by: user.id,
        });
      }

      // Add additional toggled participants
      if (data.participant_org_ids && data.participant_org_ids.length > 0) {
        for (const orgId of data.participant_org_ids) {
          // Skip if already added as assignee
          if (orgId === data.assigned_org_id) continue;
          
          participantsToInsert.push({
            change_order_id: workOrder.id,
            organization_id: orgId,
            role: 'PARTICIPANT', // Generic role for additional participants
            is_active: true,
            invited_by: user.id,
          });
        }
      }

      // Insert all participants
      if (participantsToInsert.length > 0) {
        const { error: participantError } = await supabase
          .from('change_order_participants')
          .insert(participantsToInsert);

        if (participantError) {
          console.error('Error inserting participants:', participantError);
          // Don't fail the whole operation, just log the error
        }
      }

      return workOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-order-projects'] });
      queryClient.invalidateQueries({ queryKey: ['change-order-participants'] });
      toast({ title: 'Work Order created successfully' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create Work Order',
        description: error.message,
      });
    },
  });

  // Update change order
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChangeOrderProject> & { id: string }) => {
      const { error } = await supabase
        .from('change_order_projects')
        .update(updates as never)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-order-projects'] });
      queryClient.invalidateQueries({ queryKey: ['change-order'] });
    },
  });

  // Update status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, rejection_notes }: { 
      id: string; 
      status: ChangeOrderStatus; 
      rejection_notes?: string 
    }) => {
      const updates: Record<string, unknown> = { status };
      if (rejection_notes) {
        updates.rejection_notes = rejection_notes;
      }

      const { error } = await supabase
        .from('change_order_projects')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['change-order-projects'] });
      queryClient.invalidateQueries({ queryKey: ['change-order'] });
      
      const statusMessages: Record<ChangeOrderStatus, string> = {
        draft: 'Returned to draft',
        fc_input: 'Awaiting Field Crew input',
        tc_pricing: 'Ready for Trade Contractor pricing',
        ready_for_approval: 'Ready for approval',
        approved: 'Change Order approved!',
        rejected: 'Change Order rejected',
        contracted: 'Converted to contract',
      };
      
      toast({ title: statusMessages[variables.status] });
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
    changeOrders,
    isLoading,
    createChangeOrder: createMutation.mutateAsync,
    updateChangeOrder: updateMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}

// Hook for a single change order with all related data
export function useChangeOrder(changeOrderId: string | null) {
  const { user, currentRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch change order details
  const { data: changeOrder, isLoading } = useQuery({
    queryKey: ['change-order', changeOrderId],
    queryFn: async () => {
      if (!changeOrderId) return null;

      const { data, error } = await supabase
        .from('change_order_projects')
        .select(`
          *,
          project:projects(id, name)
        `)
        .eq('id', changeOrderId)
        .single();

      if (error) throw error;
      return data as ChangeOrderProject;
    },
    enabled: !!changeOrderId,
  });

  // Fetch participants
  const { data: participants = [] } = useQuery({
    queryKey: ['change-order-participants', changeOrderId],
    queryFn: async () => {
      if (!changeOrderId) return [];

      const { data, error } = await supabase
        .from('change_order_participants')
        .select(`
          *,
          organization:organizations(id, org_code, name, type)
        `)
        .eq('change_order_id', changeOrderId);

      if (error) throw error;
      return data as ChangeOrderParticipant[];
    },
    enabled: !!changeOrderId,
  });

  // Fetch FC hours (private - only TC, FC, and FS can see)
  const { data: fcHours = [] } = useQuery({
    queryKey: ['change-order-fc-hours', changeOrderId],
    queryFn: async () => {
      if (!changeOrderId) return [];

      const { data, error } = await supabase
        .from('change_order_fc_hours')
        .select('*')
        .eq('change_order_id', changeOrderId);

      if (error) throw error;
      return data as ChangeOrderFCHours[];
    },
    enabled: !!changeOrderId && (currentRole === 'TC_PM' || currentRole === 'FC_PM' || currentRole === 'FS'),
  });

  // Fetch TC labor
  const { data: tcLabor = [] } = useQuery({
    queryKey: ['change-order-tc-labor', changeOrderId],
    queryFn: async () => {
      if (!changeOrderId) return [];

      const { data, error } = await supabase
        .from('change_order_tc_labor')
        .select('*')
        .eq('change_order_id', changeOrderId);

      if (error) throw error;
      return data as ChangeOrderTCLabor[];
    },
    enabled: !!changeOrderId,
  });

  // Fetch materials
  const { data: materials = [] } = useQuery({
    queryKey: ['change-order-materials', changeOrderId],
    queryFn: async () => {
      if (!changeOrderId) return [];

      const { data, error } = await supabase
        .from('change_order_materials')
        .select(`
          *,
          supplier:suppliers(id, name)
        `)
        .eq('change_order_id', changeOrderId)
        .order('sort_order');

      if (error) throw error;
      return data as ChangeOrderMaterial[];
    },
    enabled: !!changeOrderId,
  });

  // Fetch equipment
  const { data: equipment = [] } = useQuery({
    queryKey: ['change-order-equipment', changeOrderId],
    queryFn: async () => {
      if (!changeOrderId) return [];

      const { data, error } = await supabase
        .from('change_order_equipment')
        .select('*')
        .eq('change_order_id', changeOrderId)
        .order('sort_order');

      if (error) throw error;
      return data as ChangeOrderEquipment[];
    },
    enabled: !!changeOrderId,
  });

  // Fetch checklist
  const { data: checklist } = useQuery({
    queryKey: ['change-order-checklist', changeOrderId],
    queryFn: async () => {
      if (!changeOrderId) return null;

      const { data, error } = await supabase
        .from('change_order_checklist')
        .select('*')
        .eq('change_order_id', changeOrderId)
        .single();

      if (error) throw error;
      return data as ChangeOrderChecklist;
    },
    enabled: !!changeOrderId,
  });

  // ===== Mutations =====

  // Add/Update FC Hours
  const addFCHoursMutation = useMutation({
    mutationFn: async (data: { description?: string; hours: number; hourly_rate?: number }) => {
      if (!user || !changeOrderId) throw new Error('Invalid state');

      const { data: result, error } = await supabase
        .from('change_order_fc_hours')
        .insert({
          change_order_id: changeOrderId,
          description: data.description,
          hours: data.hours,
          hourly_rate: data.hourly_rate,
          entered_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-order-fc-hours', changeOrderId] });
    },
  });

  // Lock FC Hours
  const lockFCHoursMutation = useMutation({
    mutationFn: async (hoursId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('change_order_fc_hours')
        .update({
          is_locked: true,
          locked_at: new Date().toISOString(),
          locked_by: user.id,
        })
        .eq('id', hoursId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-order-fc-hours', changeOrderId] });
      queryClient.invalidateQueries({ queryKey: ['change-order-checklist', changeOrderId] });
      toast({ title: 'Hours locked successfully' });
    },
  });

  // Add TC Labor
  const addTCLaborMutation = useMutation({
    mutationFn: async (data: { description?: string; hours: number; hourly_rate?: number }) => {
      if (!user || !changeOrderId) throw new Error('Invalid state');

      const { data: result, error } = await supabase
        .from('change_order_tc_labor')
        .insert({
          change_order_id: changeOrderId,
          description: data.description,
          hours: data.hours,
          hourly_rate: data.hourly_rate,
          entered_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-order-tc-labor', changeOrderId] });
    },
  });

  // Add Material
  const addMaterialMutation = useMutation({
    mutationFn: async (data: { 
      description: string; 
      quantity: number; 
      uom: string; 
      notes?: string 
    }) => {
      if (!changeOrderId) throw new Error('Invalid state');

      const { data: result, error } = await supabase
        .from('change_order_materials')
        .insert({
          change_order_id: changeOrderId,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-order-materials', changeOrderId] });
    },
  });

  // Update Material (for pricing)
  const updateMaterialMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChangeOrderMaterial> & { id: string }) => {
      const { error } = await supabase
        .from('change_order_materials')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-order-materials', changeOrderId] });
    },
  });

  // Lock Supplier Pricing
  const lockSupplierPricingMutation = useMutation({
    mutationFn: async (materialId: string) => {
      const { error } = await supabase
        .from('change_order_materials')
        .update({
          supplier_locked: true,
          supplier_locked_at: new Date().toISOString(),
        })
        .eq('id', materialId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-order-materials', changeOrderId] });
      toast({ title: 'Supplier pricing locked' });
    },
  });

  // Add Equipment
  const addEquipmentMutation = useMutation({
    mutationFn: async (data: {
      description: string;
      pricing_type: 'flat' | 'daily';
      daily_rate?: number;
      days?: number;
      flat_cost?: number;
      notes?: string;
    }) => {
      if (!changeOrderId) throw new Error('Invalid state');

      const total_cost = data.pricing_type === 'daily'
        ? (data.daily_rate || 0) * (data.days || 1)
        : data.flat_cost || 0;

      const { data: result, error } = await supabase
        .from('change_order_equipment')
        .insert({
          change_order_id: changeOrderId,
          ...data,
          total_cost,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-order-equipment', changeOrderId] });
    },
  });

  // Update Equipment
  const updateEquipmentMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChangeOrderEquipment> & { id: string }) => {
      const { error } = await supabase
        .from('change_order_equipment')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-order-equipment', changeOrderId] });
    },
  });

  // Activate Field Crew (TC only)
  const activateFCMutation = useMutation({
    mutationFn: async (fcOrgId: string) => {
      if (!user || !changeOrderId) throw new Error('Invalid state');

      const { error } = await supabase
        .from('change_order_participants')
        .upsert({
          change_order_id: changeOrderId,
          organization_id: fcOrgId,
          role: 'FC',
          is_active: true,
          invited_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-order-participants', changeOrderId] });
      toast({ title: 'Field Crew activated' });
    },
  });

  return {
    changeOrder,
    participants,
    fcHours,
    tcLabor,
    materials,
    equipment,
    checklist,
    isLoading,
    currentRole,
    
    // FC Actions
    addFCHours: addFCHoursMutation.mutate,
    lockFCHours: lockFCHoursMutation.mutate,
    
    // TC Actions
    addTCLabor: addTCLaborMutation.mutate,
    addMaterial: addMaterialMutation.mutate,
    updateMaterial: updateMaterialMutation.mutate,
    lockSupplierPricing: lockSupplierPricingMutation.mutate,
    addEquipment: addEquipmentMutation.mutate,
    updateEquipment: updateEquipmentMutation.mutate,
    activateFC: activateFCMutation.mutate,
    
    // Loading states
    isAddingFCHours: addFCHoursMutation.isPending,
    isLockingFCHours: lockFCHoursMutation.isPending,
  };
}

// Helper to generate title from location
function generateTitleFromLocation(location: LocationData): string {
  const parts: string[] = [];
  
  if (location.room_area) parts.push(location.room_area);
  if (location.level) parts.push(location.level);
  if (location.unit) parts.push(`Unit ${location.unit}`);
  if (location.inside_outside) {
    parts.push(location.inside_outside === 'inside' ? 'Interior' : 'Exterior');
  }
  
  return parts.length > 0 ? parts.join(' - ') : 'New Change Order';
}

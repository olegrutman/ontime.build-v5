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
  const { user, currentRole, userOrgRoles } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user's organization ID
  const currentOrgId = userOrgRoles[0]?.organization?.id;
  const currentOrgType = userOrgRoles[0]?.organization?.type;

  // Fetch all change orders for a project, filtered by participation for FC users
  const { data: changeOrders = [], isLoading } = useQuery({
    queryKey: ['change-order-projects', projectId, currentOrgId, currentOrgType],
    queryFn: async () => {
      if (!projectId) return [];

      // FC users only see work orders where they are a participant
      if (currentOrgType === 'FC' && currentOrgId) {
        // First get the work order IDs where this FC is a participant
        const { data: participations, error: participationError } = await supabase
          .from('change_order_participants')
          .select('change_order_id')
          .eq('organization_id', currentOrgId)
          .eq('is_active', true);

        if (participationError) throw participationError;

        const participantWorkOrderIds = (participations || []).map(p => p.change_order_id);
        
        if (participantWorkOrderIds.length === 0) {
          return [];
        }

        const { data, error } = await supabase
          .from('change_order_projects')
          .select(`
            *,
            project:projects(id, name)
          `)
          .eq('project_id', projectId)
          .in('id', participantWorkOrderIds)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as ChangeOrderProject[];
      }

      // GC and TC see all work orders for the project
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
        reason: data.reason || null,
        fixing_trade_notes: data.fixing_trade_notes || null,
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

  // FC creates a simplified work order that goes directly to TC for approval
  const createFCWorkOrderMutation = useMutation({
    mutationFn: async (data: {
      project_id: string;
      location_data: LocationData;
      description: string;
      pricing_type: 'hourly' | 'lump_sum';
      hours?: number;
      hourly_rate?: number;
      lump_sum?: number;
    }) => {
      if (!user || !currentOrgId) throw new Error('Not authenticated');

      // Generate title from location
      const title = generateTitleFromLocation(data.location_data);

      // Create the work order with status 'tc_pricing' (awaiting TC approval)
      const insertData = {
        project_id: data.project_id,
        title,
        description: data.description,
        location_data: data.location_data,
        work_type: null, // FC doesn't specify work type
        requires_materials: false,
        material_cost_responsibility: null,
        requires_equipment: false,
        equipment_cost_responsibility: null,
        created_by: user.id,
        created_by_role: currentRole,
        status: 'tc_pricing', // Goes directly to TC for review
      };

      const { data: result, error } = await supabase
        .from('change_order_projects')
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;
      
      const workOrder = result as unknown as ChangeOrderProject;

      // Add FC as participant
      const { error: participantError } = await supabase
        .from('change_order_participants')
        .insert({
          change_order_id: workOrder.id,
          organization_id: currentOrgId,
          role: 'FC',
          is_active: true,
          invited_by: user.id,
        });

      if (participantError) {
        console.error('Error adding FC participant:', participantError);
      }

      // Add FC hours entry with their pricing
      const laborTotal = data.pricing_type === 'hourly'
        ? (data.hours || 0) * (data.hourly_rate || 0)
        : data.lump_sum || 0;

      const { error: hoursError } = await supabase
        .from('change_order_fc_hours')
        .insert({
          change_order_id: workOrder.id,
          description: data.description,
          pricing_type: data.pricing_type,
          hours: data.hours || 0,
          hourly_rate: data.pricing_type === 'hourly' ? data.hourly_rate : null,
          lump_sum: data.pricing_type === 'lump_sum' ? data.lump_sum : null,
          labor_total: laborTotal,
          is_locked: false,
          entered_by: user.id,
        });

      if (hoursError) {
        console.error('Error adding FC hours:', hoursError);
      }

      return workOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-order-projects'] });
      queryClient.invalidateQueries({ queryKey: ['change-order-fc-hours'] });
      toast({ title: 'Work Order submitted to Trade Contractor' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to submit Work Order',
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
    createFCWorkOrder: createFCWorkOrderMutation.mutateAsync,
    updateChangeOrder: updateMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    isCreating: createMutation.isPending,
    isCreatingFC: createFCWorkOrderMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}

// Hook for a single change order with all related data
export function useChangeOrder(changeOrderId: string | null) {
  const { user, currentRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // First fetch the change order to get project_id
  const { data: changeOrderData, isLoading: isLoadingChangeOrder } = useQuery({
    queryKey: ['change-order-basic', changeOrderId],
    queryFn: async () => {
      if (!changeOrderId) return null;

      const { data, error } = await supabase
        .from('change_order_projects')
        .select('id, project_id')
        .eq('id', changeOrderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!changeOrderId,
  });

  const projectId = changeOrderData?.project_id;

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

  // Fetch available Field Crews from project_team (accepted FC members)
  const { data: availableFieldCrews = [], isLoading: isLoadingFieldCrews } = useQuery({
    queryKey: ['project-team-field-crews', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('project_team')
        .select(`
          id,
          org_id,
          role,
          status,
          organizations:org_id (
            id,
            name,
            type,
            org_code
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'Accepted')
        .eq('role', 'Field Crew');

      if (error) {
        console.error('Error fetching field crews:', error);
        return [];
      }
      
      // Map to the expected format
      return (data || []).map((pt: any) => ({
        id: pt.organizations?.id || pt.org_id,
        name: pt.organizations?.name || 'Unknown',
        type: pt.organizations?.type || 'FC',
      }));
    },
    enabled: !!projectId,
  });

  // Fetch available Suppliers from project_team (accepted SUPPLIER members)
  const { data: availableSuppliers = [], isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['project-team-suppliers', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('project_team')
        .select(`
          id,
          org_id,
          role,
          status,
          organizations:org_id (
            id,
            name,
            type,
            org_code
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'Accepted')
        .eq('role', 'Supplier');

      if (error) {
        console.error('Error fetching suppliers:', error);
        return [];
      }
      
      // Map to the expected format
      return (data || []).map((pt: any) => ({
        id: pt.organizations?.id || pt.org_id,
        name: pt.organizations?.name || 'Unknown',
        type: pt.organizations?.type || 'SUPPLIER',
      }));
    },
    enabled: !!projectId,
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
    mutationFn: async (data: { 
      description?: string; 
      pricing_type?: 'hourly' | 'lump_sum';
      hours?: number; 
      hourly_rate?: number;
      lump_sum?: number;
    }) => {
      if (!user || !changeOrderId) throw new Error('Invalid state');

      const { data: result, error } = await supabase
        .from('change_order_fc_hours')
        .insert({
          change_order_id: changeOrderId,
          description: data.description,
          pricing_type: data.pricing_type || 'hourly',
          hours: data.hours || 0,
          hourly_rate: data.hourly_rate,
          lump_sum: data.lump_sum,
          entered_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-order-fc-hours', changeOrderId] });
      toast({ title: 'Hours saved' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to save hours',
        description: error.message,
      });
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
    mutationFn: async (data: { 
      description?: string; 
      pricing_type: 'hourly' | 'lump_sum';
      hours?: number; 
      hourly_rate?: number;
      lump_sum?: number;
    }) => {
      if (!user || !changeOrderId) throw new Error('Invalid state');

      const { data: result, error } = await supabase
        .from('change_order_tc_labor')
        .insert({
          change_order_id: changeOrderId,
          description: data.description,
          pricing_type: data.pricing_type,
          hours: data.hours || 0,
          hourly_rate: data.hourly_rate,
          lump_sum: data.lump_sum,
          entered_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-order-tc-labor', changeOrderId] });
      // Also invalidate the main change order to refresh totals for GC view
      queryClient.invalidateQueries({ queryKey: ['change-order', changeOrderId] });
      toast({ title: 'Labor pricing saved' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to save labor',
        description: error.message,
      });
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
      // Also invalidate the main change order to refresh totals for GC view
      queryClient.invalidateQueries({ queryKey: ['change-order', changeOrderId] });
    },
  });

  // Update Material (for pricing)
  const updateMaterialMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChangeOrderMaterial> & { id: string }) => {
      const { error } = await supabase
        .from('change_order_materials')
        .update(updates as Record<string, unknown>)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-order-materials', changeOrderId] });
      queryClient.invalidateQueries({ queryKey: ['change-order', changeOrderId] });
      toast({ title: 'Material pricing updated' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update material',
        description: error.message,
      });
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

  // Lock TC Manual Pricing (when TC prices materials themselves without supplier)
  const lockTCPricingMutation = useMutation({
    mutationFn: async ({ materialId, unitCost, lineTotal }: { 
      materialId: string; 
      unitCost: number; 
      lineTotal: number;
    }) => {
      const { error } = await supabase
        .from('change_order_materials')
        .update({
          unit_cost: unitCost,
          line_total: lineTotal,
          supplier_locked: true,
          supplier_locked_at: new Date().toISOString(),
        })
        .eq('id', materialId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-order-materials', changeOrderId] });
      queryClient.invalidateQueries({ queryKey: ['change-order-checklist', changeOrderId] });
      toast({ title: 'Material pricing locked' });
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
      queryClient.invalidateQueries({ queryKey: ['change-order', changeOrderId] });
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
      queryClient.invalidateQueries({ queryKey: ['change-order', changeOrderId] });
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

      // Send notification to the Field Crew org
      const workOrderTitle = changeOrder?.title || 'Work Order';
      // Type assertion needed until types are regenerated
      const { error: notifError } = await (supabase.rpc as any)('send_work_order_assignment_notification', {
        _change_order_id: changeOrderId,
        _recipient_org_id: fcOrgId,
        _work_order_title: workOrderTitle,
      });

      if (notifError) {
        console.error('Failed to send notification:', notifError);
        // Don't throw - notification failure shouldn't block activation
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-order-participants', changeOrderId] });
      toast({ title: 'Field Crew activated' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to activate Field Crew',
        description: error.message,
      });
    },
  });

  // Activate Supplier (TC only)
  const activateSupplierMutation = useMutation({
    mutationFn: async (supplierOrgId: string) => {
      if (!user || !changeOrderId) throw new Error('Invalid state');

      const { error } = await supabase
        .from('change_order_participants')
        .upsert({
          change_order_id: changeOrderId,
          organization_id: supplierOrgId,
          role: 'SUPPLIER',
          is_active: true,
          invited_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-order-participants', changeOrderId] });
      toast({ title: 'Supplier activated' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to activate Supplier',
        description: error.message,
      });
    },
  });

  // Deactivate participant
  const deactivateParticipantMutation = useMutation({
    mutationFn: async (participantId: string) => {
      if (!user || !changeOrderId) throw new Error('Invalid state');

      const { error } = await supabase
        .from('change_order_participants')
        .update({ is_active: false })
        .eq('id', participantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-order-participants', changeOrderId] });
      toast({ title: 'Participant deactivated' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to deactivate participant',
        description: error.message,
      });
    },
  });

  // Update change order (for description, etc.)
  const updateChangeOrderMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChangeOrderProject> & { id: string }) => {
      const { error } = await supabase
        .from('change_order_projects')
        .update(updates as never)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-order', changeOrderId] });
      queryClient.invalidateQueries({ queryKey: ['change-order-checklist', changeOrderId] });
      toast({ title: 'Work Order updated' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update Work Order',
        description: error.message,
      });
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
    isLoading: isLoadingChangeOrder || isLoading,
    currentRole,
    
    // Available team members for assignment
    availableFieldCrews,
    availableSuppliers,
    isLoadingTeamMembers: isLoadingFieldCrews || isLoadingSuppliers,
    
    // FC Actions
    addFCHours: addFCHoursMutation.mutate,
    lockFCHours: lockFCHoursMutation.mutate,
    
    // TC Actions
    addTCLabor: addTCLaborMutation.mutate,
    addMaterial: addMaterialMutation.mutate,
    updateMaterial: updateMaterialMutation.mutate,
    lockSupplierPricing: lockSupplierPricingMutation.mutate,
    lockTCPricing: lockTCPricingMutation.mutate,
    addEquipment: addEquipmentMutation.mutate,
    updateEquipment: updateEquipmentMutation.mutate,
    updateChangeOrder: updateChangeOrderMutation.mutate,
    isUpdatingChangeOrder: updateChangeOrderMutation.isPending,
    
    // Participant management
    activateFC: activateFCMutation.mutateAsync,
    activateSupplier: activateSupplierMutation.mutateAsync,
    deactivateParticipant: deactivateParticipantMutation.mutateAsync,
    isActivatingParticipant: activateFCMutation.isPending || activateSupplierMutation.isPending || deactivateParticipantMutation.isPending,
    
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

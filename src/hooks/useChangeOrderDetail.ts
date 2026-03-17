import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type {
  ChangeOrder,
  COLineItem,
  COLaborEntry,
  COMaterialItem,
  COEquipmentItem,
  CONTELogEntry,
  COActivityEntry,
  COFinancials,
  NewCOLineItem,
  NewCOLaborEntry,
  NewCOMaterialItem,
  NewCOEquipmentItem,
} from '@/types/changeOrder';

export function useChangeOrderDetail(coId: string | null) {
  const { userOrgRoles, user } = useAuth();
  const orgId = userOrgRoles?.[0]?.organization_id ?? null;
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['co-detail', coId] });
  };

  const { data: co, isLoading: isLoadingCO } = useQuery({
    queryKey: ['co-detail', coId, 'co'],
    enabled: !!coId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_orders')
        .select('*')
        .eq('id', coId!)
        .single();
      if (error) throw error;
      return data as ChangeOrder;
    },
  });

  // For combined parent COs, fetch member CO records
  const isCombinedParent = !!co && co.status === 'combined' && !co.combined_co_id;

  const { data: memberCOs = [] } = useQuery({
    queryKey: ['co-detail', coId, 'members'],
    enabled: !!coId && isCombinedParent,
    queryFn: async () => {
      const { data: members, error: mErr } = await supabase
        .from('co_combined_members')
        .select('member_co_id')
        .eq('combined_co_id', coId!);
      if (mErr) throw mErr;
      if (!members || members.length === 0) return [];

      const memberIds = members.map(m => m.member_co_id);
      const { data: cos, error: cErr } = await supabase
        .from('change_orders')
        .select('*')
        .in('id', memberIds);
      if (cErr) throw cErr;
      return cos as ChangeOrder[];
    },
  });

  // Determine which CO IDs to fetch data for (parent + members for combined, or just the CO)
  const allCoIds = isCombinedParent && memberCOs.length > 0
    ? memberCOs.map(c => c.id)
    : coId ? [coId] : [];

  const { data: lineItems = [] } = useQuery({
    queryKey: ['co-detail', coId, 'line-items', allCoIds],
    enabled: allCoIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('co_line_items')
        .select('*')
        .in('co_id', allCoIds)
        .order('sort_order');
      if (error) throw error;
      return data as COLineItem[];
    },
  });

  const { data: laborEntries = [] } = useQuery({
    queryKey: ['co-detail', coId, 'labor', allCoIds],
    enabled: allCoIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('co_labor_entries')
        .select('*')
        .in('co_id', allCoIds)
        .order('entry_date', { ascending: false });
      if (error) throw error;
      return data as COLaborEntry[];
    },
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['co-detail', coId, 'materials', allCoIds],
    enabled: allCoIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('co_material_items')
        .select('*')
        .in('co_id', allCoIds)
        .order('line_number');
      if (error) throw error;
      return data as COMaterialItem[];
    },
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['co-detail', coId, 'equipment', allCoIds],
    enabled: allCoIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('co_equipment_items')
        .select('*')
        .in('co_id', allCoIds)
        .order('created_at');
      if (error) throw error;
      return data as COEquipmentItem[];
    },
  });

  const { data: nteLog = [] } = useQuery({
    queryKey: ['co-detail', coId, 'nte'],
    enabled: !!coId && co?.pricing_type === 'nte',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('co_nte_log')
        .select('*')
        .eq('co_id', coId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CONTELogEntry[];
    },
  });

  const { data: activity = [] } = useQuery({
    queryKey: ['co-detail', coId, 'activity'],
    enabled: !!coId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('co_activity')
        .select('*')
        .eq('co_id', coId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as COActivityEntry[];
    },
  });

  const billableLaborEntries = laborEntries.filter(e => !e.is_actual_cost);
  const actualCostEntries    = laborEntries.filter(e => e.is_actual_cost);

  const fcLaborTotal  = billableLaborEntries.filter(e => e.entered_by_role === 'FC').reduce((s, e) => s + (e.line_total ?? 0), 0);
  const tcLaborTotal  = billableLaborEntries.filter(e => e.entered_by_role === 'TC').reduce((s, e) => s + (e.line_total ?? 0), 0);
  const laborTotal    = fcLaborTotal + tcLaborTotal;
  const materialsCost = materials.reduce((s, m) => s + (m.line_cost ?? 0), 0);
  const materialsMarkup = materials.reduce((s, m) => s + (m.markup_amount ?? 0), 0);
  const materialsTotal  = materials.reduce((s, m) => s + (m.billed_amount ?? 0), 0);
  const equipmentCost   = equipment.reduce((s, e) => s + (e.cost ?? 0), 0);
  const equipmentMarkup = equipment.reduce((s, e) => s + (e.markup_amount ?? 0), 0);
  const equipmentTotal  = equipment.reduce((s, e) => s + (e.billed_amount ?? 0), 0);
  const grandTotal      = laborTotal + materialsTotal + equipmentTotal;
  const actualCostTotal = actualCostEntries.reduce((s, e) => s + (e.line_total ?? 0), 0);
  const profitMargin    = grandTotal > 0 ? ((grandTotal - actualCostTotal) / grandTotal) * 100 : null;
  const nteUsedPercent  = co?.nte_cap && co.nte_cap > 0 ? (laborTotal / co.nte_cap) * 100 : null;

  const financials: COFinancials = {
    laborTotal,
    fcLaborTotal,
    tcLaborTotal,
    materialsTotal,
    materialsCost,
    materialsMarkup,
    equipmentTotal,
    equipmentCost,
    equipmentMarkup,
    grandTotal,
    actualCostTotal,
    profitMargin,
    nteUsedPercent,
  };

  const addLineItem = useMutation({
    mutationFn: async (input: NewCOLineItem) => {
      const { data, error } = await supabase
        .from('co_line_items')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as COLineItem;
    },
    onSuccess: invalidate,
  });

  const deleteLineItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('co_line_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addLaborEntry = useMutation({
    mutationFn: async (input: NewCOLaborEntry) => {
      const { data, error } = await supabase
        .from('co_labor_entries')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as COLaborEntry;
    },
    onSuccess: invalidate,
  });

  const updateLaborEntry = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<COLaborEntry> }) => {
      const { data, error } = await supabase
        .from('co_labor_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as COLaborEntry;
    },
    onSuccess: invalidate,
  });

  const deleteLaborEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('co_labor_entries')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addMaterial = useMutation({
    mutationFn: async (input: NewCOMaterialItem) => {
      const { data, error } = await supabase
        .from('co_material_items')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as COMaterialItem;
    },
    onSuccess: invalidate,
  });

  const updateMaterial = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<COMaterialItem> }) => {
      const { data, error } = await supabase
        .from('co_material_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as COMaterialItem;
    },
    onSuccess: invalidate,
  });

  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('co_material_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addEquipment = useMutation({
    mutationFn: async (input: NewCOEquipmentItem) => {
      const { data, error } = await supabase
        .from('co_equipment_items')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as COEquipmentItem;
    },
    onSuccess: invalidate,
  });

  const updateEquipment = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<COEquipmentItem> }) => {
      const { data, error } = await supabase
        .from('co_equipment_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as COEquipmentItem;
    },
    onSuccess: invalidate,
  });

  const deleteEquipment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('co_equipment_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const submitCO = useMutation({
    mutationFn: async (coId: string) => {
      const { data, error } = await supabase
        .from('change_orders')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', coId)
        .select()
        .single();
      if (error) throw error;
      return data as ChangeOrder;
    },
    onSuccess: invalidate,
  });

  const approveCO = useMutation({
    mutationFn: async (coId: string) => {
      const { data, error } = await supabase
        .from('change_orders')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', coId)
        .select()
        .single();
      if (error) throw error;
      return data as ChangeOrder;
    },
    onSuccess: invalidate,
  });

  const rejectCO = useMutation({
    mutationFn: async ({ coId, note }: { coId: string; note: string }) => {
      const { data, error } = await supabase
        .from('change_orders')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_note: note,
          updated_at: new Date().toISOString(),
        })
        .eq('id', coId)
        .select()
        .single();
      if (error) throw error;
      return data as ChangeOrder;
    },
    onSuccess: invalidate,
  });

  const requestNTEIncrease = useMutation({
    mutationFn: async ({
      requestedIncrease,
      runningTotal,
    }: {
      requestedIncrease: number;
      runningTotal: number;
    }) => {
      if (!coId || !user || !co?.nte_cap) throw new Error('Missing data');
      const { data, error } = await supabase
        .from('co_nte_log')
        .insert({
          co_id: coId,
          requested_by_user_id: user.id,
          requested_increase: requestedIncrease,
          running_total_at_request: runningTotal,
          current_cap_at_request: co.nte_cap,
        })
        .select()
        .single();
      if (error) throw error;
      await supabase
        .from('change_orders')
        .update({
          nte_increase_requested: requestedIncrease,
          updated_at: new Date().toISOString(),
        })
        .eq('id', coId);
      return data as CONTELogEntry;
    },
    onSuccess: invalidate,
  });

  const approveNTEIncrease = useMutation({
    mutationFn: async ({
      nteLogId,
      requestedIncrease,
    }: {
      nteLogId: string;
      requestedIncrease: number;
    }) => {
      if (!coId || !user || !co?.nte_cap) throw new Error('Missing data');
      const newCap = co.nte_cap + requestedIncrease;
      const now = new Date().toISOString();

      const { error: logError } = await supabase
        .from('co_nte_log')
        .update({
          approved_by_user_id: user.id,
          approved_at: now,
          new_cap_after_approval: newCap,
        })
        .eq('id', nteLogId);
      if (logError) throw logError;

      const { data, error: coError } = await supabase
        .from('change_orders')
        .update({
          nte_cap: newCap,
          nte_increase_requested: null,
          nte_increase_approved: true,
          updated_at: now,
        })
        .eq('id', coId)
        .select()
        .single();
      if (coError) throw coError;
      return data as ChangeOrder;
    },
    onSuccess: invalidate,
  });

  const rejectNTEIncrease = useMutation({
    mutationFn: async ({
      nteLogId,
      note,
    }: {
      nteLogId: string;
      note: string;
    }) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('co_nte_log')
        .update({
          rejected_at: now,
          rejection_note: note,
        })
        .eq('id', nteLogId);
      if (error) throw error;
      await supabase
        .from('change_orders')
        .update({
          nte_increase_requested: null,
          nte_increase_approved: false,
          updated_at: now,
        })
        .eq('id', coId!);
    },
    onSuccess: invalidate,
  });

  return {
    co,
    memberCOs,
    lineItems,
    laborEntries,
    materials,
    equipment,
    nteLog,
    activity,
    financials,
    isLoading: isLoadingCO,
    addLineItem,
    deleteLineItem,
    addLaborEntry,
    updateLaborEntry,
    deleteLaborEntry,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    submitCO,
    approveCO,
    rejectCO,
    requestNTEIncrease,
    approveNTEIncrease,
    rejectNTEIncrease,
  };
}

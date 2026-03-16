import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import type {
  WOLineItem,
  WOMaterialRow,
  WOEquipmentRow,
  WOFinancials,
  WOLineItemStatus,
  WOMode,
  WORequestType,
  WOLaborMode,
} from '@/types/unifiedWizard';
import type { CatalogItem } from '@/types/quickLog';

interface DraftRecord {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  wo_mode: string | null;
  wo_request_type: string | null;
  location_tag: string | null;
  tc_labor_rate: number | null;
  fc_labor_rate: number | null;
  use_fc_hours_at_tc_rate: boolean;
  materials_markup_pct: number;
  equipment_markup_pct: number;
  pricing_mode: string;
  draft_started_at: string | null;
  converted_at: string | null;
  labor_total: number | null;
  material_total: number | null;
  equipment_total: number | null;
  final_price: number | null;
  gc_request_note: string | null;
  created_by: string | null;
}

interface SaveDraftParams {
  title: string;
  description?: string;
  wo_mode: WOMode;
  wo_request_type?: WORequestType;
  location_tag?: string;
  tc_labor_rate?: number | null;
  fc_labor_rate?: number | null;
  use_fc_hours_at_tc_rate?: boolean;
  materials_markup_pct?: number;
  equipment_markup_pct?: number;
  pricing_mode?: string;
  gc_request_note?: string;
}

interface AddLineItemParams {
  catalog_item_id?: string | null;
  item_name: string;
  division?: string | null;
  category_name?: string | null;
  group_label?: string | null;
  unit: string;
  qty?: number | null;
  hours?: number | null;
  unit_rate: number;
  material_spec?: string | null;
  location_tag?: string | null;
  note?: string | null;
}

interface AddMaterialParams {
  description: string;
  supplier?: string | null;
  quantity: number;
  unit: string;
  unit_cost: number;
  markup_percent?: number;
  receipt_note?: string | null;
}

interface AddEquipmentParams {
  description: string;
  duration_note?: string | null;
  cost: number;
  markup_percent?: number;
  notes?: string | null;
}

export function useWorkOrderDraft(projectId: string, draftId?: string | null) {
  const { user, currentRole, userOrgRoles } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentOrgId = userOrgRoles[0]?.organization?.id;
  const currentOrgType = userOrgRoles[0]?.organization?.type;
  const addedByRole = currentOrgType === 'FC' ? 'fc' : 'tc';

  // ─── Fetch draft record ────────────────────────────────────────
  const { data: draft } = useQuery({
    queryKey: ['wo-draft', draftId],
    queryFn: async () => {
      if (!draftId) return null;
      const { data, error } = await supabase
        .from('change_order_projects')
        .select('*')
        .eq('id', draftId)
        .single();
      if (error) throw error;
      return data as unknown as DraftRecord;
    },
    enabled: !!draftId,
  });

  // ─── Fetch line items ──────────────────────────────────────────
  const { data: lineItems = [] } = useQuery({
    queryKey: ['wo-line-items', draftId],
    queryFn: async () => {
      if (!draftId) return [];
      const { data, error } = await supabase
        .from('work_order_line_items')
        .select('*')
        .eq('change_order_id', draftId)
        .order('added_at', { ascending: true });
      if (error) throw error;
      return data as unknown as WOLineItem[];
    },
    enabled: !!draftId,
  });

  // ─── Fetch materials ──────────────────────────────────────────
  const { data: materials = [] } = useQuery({
    queryKey: ['wo-materials', draftId],
    queryFn: async () => {
      if (!draftId) return [];
      const { data, error } = await supabase
        .from('work_order_materials')
        .select('*')
        .eq('change_order_id', draftId)
        .order('added_at', { ascending: true });
      if (error) throw error;
      return data as unknown as WOMaterialRow[];
    },
    enabled: !!draftId,
  });

  // ─── Fetch equipment ──────────────────────────────────────────
  const { data: equipment = [] } = useQuery({
    queryKey: ['wo-equipment', draftId],
    queryFn: async () => {
      if (!draftId) return [];
      const { data, error } = await supabase
        .from('work_order_equipment')
        .select('*')
        .eq('change_order_id', draftId)
        .order('added_at', { ascending: true });
      if (error) throw error;
      return data as unknown as WOEquipmentRow[];
    },
    enabled: !!draftId,
  });

  // ─── Computed financials ───────────────────────────────────────
  const financials = useMemo<WOFinancials>(() => {
    const laborTotal = lineItems.reduce((sum, li) => sum + (li.line_total || 0), 0);
    const materialsLineCost = materials.reduce((sum, m) => sum + (m.line_cost || 0), 0);
    const materialsMarkup = materials.reduce((sum, m) => sum + (m.markup_amount || 0), 0);
    const materialsBilled = materials.reduce((sum, m) => sum + (m.billed_amount || 0), 0);
    const equipmentCost = equipment.reduce((sum, e) => sum + (e.cost || 0), 0);
    const equipmentMarkup = equipment.reduce((sum, e) => sum + (e.markup_amount || 0), 0);
    const equipmentBilled = equipment.reduce((sum, e) => sum + (e.billed_amount || 0), 0);

    const totalBilledToGC = laborTotal + materialsBilled + equipmentBilled;
    const tcTotalCost = laborTotal + materialsLineCost + equipmentCost;
    const runningMarginPct = totalBilledToGC > 0
      ? ((totalBilledToGC - tcTotalCost) / totalBilledToGC) * 100
      : 0;

    return {
      laborTotal,
      materialsLineCost,
      materialsMarkup,
      materialsBilled,
      equipmentCost,
      equipmentMarkup,
      equipmentBilled,
      totalBilledToGC,
      tcTotalCost,
      runningMarginPct,
    };
  }, [lineItems, materials, equipment]);

  // ─── Save / upsert draft ──────────────────────────────────────
  const saveDraftMutation = useMutation({
    mutationFn: async (params: SaveDraftParams): Promise<string> => {
      if (!user || !currentOrgId) throw new Error('Not authenticated');

      const record: Record<string, unknown> = {
        project_id: projectId,
        title: params.title || 'Work Order',
        description: params.description || null,
        wo_mode: params.wo_mode,
        wo_request_type: params.wo_request_type || null,
        location_tag: params.location_tag || null,
        tc_labor_rate: params.tc_labor_rate ?? null,
        fc_labor_rate: params.fc_labor_rate ?? null,
        use_fc_hours_at_tc_rate: params.use_fc_hours_at_tc_rate ?? false,
        materials_markup_pct: params.materials_markup_pct ?? 0,
        equipment_markup_pct: params.equipment_markup_pct ?? 0,
        pricing_mode: params.pricing_mode || 'fixed',
        gc_request_note: params.gc_request_note || null,
        status: 'draft',
      };

      if (draftId) {
        const { error } = await supabase
          .from('change_order_projects')
          .update(record as never)
          .eq('id', draftId);
        if (error) throw error;
        return draftId;
      } else {
        record.created_by = user.id;
        record.created_by_role = currentRole;
        record.draft_started_at = new Date().toISOString();

        const { data, error } = await supabase
          .from('change_order_projects')
          .insert(record as never)
          .select('id')
          .single();
        if (error) throw error;
        return (data as any).id as string;
      }
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['wo-draft', id] });
      queryClient.invalidateQueries({ queryKey: ['change-order-projects'] });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Failed to save draft', description: error.message });
    },
  });

  // ─── Add line item ─────────────────────────────────────────────
  const addLineItemMutation = useMutation({
    mutationFn: async (params: AddLineItemParams) => {
      if (!user || !currentOrgId || !draftId) throw new Error('Missing context');

      const { error } = await supabase
        .from('work_order_line_items')
        .insert({
          project_id: projectId,
          change_order_id: draftId,
          org_id: currentOrgId,
          created_by_user_id: user.id,
          catalog_item_id: params.catalog_item_id || null,
          item_name: params.item_name,
          division: params.division || null,
          category_name: params.category_name || null,
          group_label: params.group_label || null,
          unit: params.unit,
          qty: params.qty ?? null,
          hours: params.hours ?? null,
          unit_rate: params.unit_rate,
          material_spec: params.material_spec || null,
          location_tag: params.location_tag || null,
          note: params.note || null,
        } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wo-line-items', draftId] });
    },
  });

  // ─── Remove line item ──────────────────────────────────────────
  const removeLineItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('work_order_line_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wo-line-items', draftId] });
    },
  });

  // ─── Add material ─────────────────────────────────────────────
  const addMaterialMutation = useMutation({
    mutationFn: async (params: AddMaterialParams) => {
      if (!user || !currentOrgId || !draftId) throw new Error('Missing context');

      const { error } = await supabase
        .from('work_order_materials')
        .insert({
          project_id: projectId,
          change_order_id: draftId,
          org_id: currentOrgId,
          created_by_user_id: user.id,
          description: params.description,
          supplier: params.supplier || null,
          quantity: params.quantity,
          unit: params.unit,
          unit_cost: params.unit_cost,
          markup_percent: params.markup_percent ?? 0,
          added_by_role: addedByRole,
          receipt_note: params.receipt_note || null,
        } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wo-materials', draftId] });
    },
  });

  // ─── Remove material ──────────────────────────────────────────
  const removeMaterialMutation = useMutation({
    mutationFn: async (materialId: string) => {
      const { error } = await supabase
        .from('work_order_materials')
        .delete()
        .eq('id', materialId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wo-materials', draftId] });
    },
  });

  // ─── Add equipment ────────────────────────────────────────────
  const addEquipmentMutation = useMutation({
    mutationFn: async (params: AddEquipmentParams) => {
      if (!user || !currentOrgId || !draftId) throw new Error('Missing context');

      const { error } = await supabase
        .from('work_order_equipment')
        .insert({
          project_id: projectId,
          change_order_id: draftId,
          org_id: currentOrgId,
          created_by_user_id: user.id,
          description: params.description,
          duration_note: params.duration_note || null,
          cost: params.cost,
          markup_percent: params.markup_percent ?? 0,
          added_by_role: addedByRole,
          notes: params.notes || null,
        } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wo-equipment', draftId] });
    },
  });

  // ─── Remove equipment ─────────────────────────────────────────
  const removeEquipmentMutation = useMutation({
    mutationFn: async (equipmentId: string) => {
      const { error } = await supabase
        .from('work_order_equipment')
        .delete()
        .eq('id', equipmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wo-equipment', draftId] });
    },
  });

  // ─── Convert to submitted work order ───────────────────────────
  const convertMutation = useMutation({
    mutationFn: async (submittedItemIds?: string[]) => {
      if (!user || !draftId) throw new Error('Missing context');

      // Update selected line items to 'submitted'
      if (submittedItemIds && submittedItemIds.length > 0) {
        const { error: liError } = await supabase
          .from('work_order_line_items')
          .update({ status: 'submitted' } as never)
          .in('id', submittedItemIds);
        if (liError) throw liError;
      }

      // Update all draft materials to submitted
      const { error: matError } = await supabase
        .from('work_order_materials')
        .update({ status: 'submitted' } as never)
        .eq('change_order_id', draftId)
        .eq('status', 'draft');
      if (matError) throw matError;

      // Update all draft equipment to submitted
      const { error: eqError } = await supabase
        .from('work_order_equipment')
        .update({ status: 'submitted' } as never)
        .eq('change_order_id', draftId)
        .eq('status', 'draft');
      if (eqError) throw eqError;

      // Re-fetch submitted items to compute totals
      const [liResult, matResult, eqResult] = await Promise.all([
        supabase
          .from('work_order_line_items')
          .select('line_total')
          .eq('change_order_id', draftId)
          .eq('status', 'submitted'),
        supabase
          .from('work_order_materials')
          .select('billed_amount')
          .eq('change_order_id', draftId)
          .eq('status', 'submitted'),
        supabase
          .from('work_order_equipment')
          .select('billed_amount')
          .eq('change_order_id', draftId)
          .eq('status', 'submitted'),
      ]);

      const laborTotal = (liResult.data || []).reduce((s: number, r: any) => s + (r.line_total || 0), 0);
      const materialTotal = (matResult.data || []).reduce((s: number, r: any) => s + (r.billed_amount || 0), 0);
      const equipmentTotal = (eqResult.data || []).reduce((s: number, r: any) => s + (r.billed_amount || 0), 0);
      const finalPrice = laborTotal + materialTotal + equipmentTotal;

      // Update the WO header
      const { error: woError } = await supabase
        .from('change_order_projects')
        .update({
          status: 'ready_for_approval',
          labor_total: laborTotal,
          material_total: materialTotal,
          equipment_total: equipmentTotal,
          final_price: finalPrice,
          converted_at: new Date().toISOString(),
          submitted_by_user_id: user.id,
        } as never)
        .eq('id', draftId);
      if (woError) throw woError;

      return { finalPrice };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wo-draft'] });
      queryClient.invalidateQueries({ queryKey: ['wo-line-items'] });
      queryClient.invalidateQueries({ queryKey: ['wo-materials'] });
      queryClient.invalidateQueries({ queryKey: ['wo-equipment'] });
      queryClient.invalidateQueries({ queryKey: ['change-order-projects'] });
      toast({ title: 'Work order submitted for approval' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Failed to submit', description: error.message });
    },
  });

  return {
    draft,
    lineItems,
    materials,
    equipment,
    financials,
    saveDraft: saveDraftMutation.mutateAsync,
    isSavingDraft: saveDraftMutation.isPending,
    addLineItem: addLineItemMutation.mutateAsync,
    removeLineItem: removeLineItemMutation.mutateAsync,
    addMaterial: addMaterialMutation.mutateAsync,
    removeMaterial: removeMaterialMutation.mutateAsync,
    addEquipment: addEquipmentMutation.mutateAsync,
    removeEquipment: removeEquipmentMutation.mutateAsync,
    convertToWorkOrder: convertMutation.mutateAsync,
    isConverting: convertMutation.isPending,
  };
}

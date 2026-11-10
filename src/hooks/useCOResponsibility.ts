import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseCOResponsibilityResult {
  materialResponsible: 'GC' | 'TC';
  equipmentResponsible: 'GC' | 'TC';
  materialOverridden: boolean;
  equipmentOverridden: boolean;
  setMaterialOverride: (value: 'GC' | 'TC' | null) => void;
  setEquipmentOverride: (value: 'GC' | 'TC' | null) => void;
  isLoading: boolean;
  isSaving: boolean;
}

export function useCOResponsibility(
  coId: string | undefined,
  projectId: string | undefined,
  coMaterialOverride: string | null | undefined,
  coEquipmentOverride: string | null | undefined,
  coMaterialDefault?: string | null,
  coEquipmentDefault?: string | null,
): UseCOResponsibilityResult {
  const queryClient = useQueryClient();

  // Fetch project contract defaults.
  // Important: prefer the contract that governs the *work* (a downstream
  // contractor billing upstream, i.e. from_role !== 'Owner'). The Owner→GC
  // contract almost always says materials are "GC" (GC buys for the owner),
  // which must NOT leak onto TC/FC work orders.
  const { data: contractDefaults, isLoading } = useQuery({
    queryKey: ['project-contract-responsibility', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('project_contracts')
        .select('from_role, to_role, material_responsibility, created_at')
        .eq('project_id', projectId ?? '')
        .not('material_responsibility', 'is', null);
      const rows = data ?? [];
      const trade = rows.find(r => (r.from_role ?? '') !== 'Owner');
      const chosen = trade ?? rows[0];
      return {
        materialResponsibility: (chosen?.material_responsibility as 'GC' | 'TC') ?? 'TC',
      };
    },
    staleTime: 60_000,
  });


  const materialOverridden = !!coMaterialOverride;
  const equipmentOverridden = !!coEquipmentOverride;

  const materialResponsible: 'GC' | 'TC' = coMaterialOverride
    ? (coMaterialOverride as 'GC' | 'TC')
    : coMaterialDefault
      ? (coMaterialDefault as 'GC' | 'TC')
      : contractDefaults?.materialResponsibility ?? 'TC';

  const equipmentResponsible: 'GC' | 'TC' = coEquipmentOverride
    ? (coEquipmentOverride as 'GC' | 'TC')
    : coEquipmentDefault
      ? (coEquipmentDefault as 'GC' | 'TC')
      : 'TC';

  const updateOverride = useMutation({
    mutationFn: async ({ kind, value }: { kind: 'material' | 'equipment'; value: 'GC' | 'TC' | null }) => {
      if (!coId) throw new Error('No order selected');
      const { error } = await supabase.rpc('set_co_procurement_responsibility', {
        _co_id: coId, _kind: kind, _responsible: value as string,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['co-detail', coId] });
      queryClient.invalidateQueries({ queryKey: ['change-orders', projectId] });
      queryClient.invalidateQueries({ queryKey: ['co-corrections'] });
      queryClient.invalidateQueries({ queryKey: ['co-financials-v2', coId] });
      toast.success('Responsibility updated');
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Failed to update responsibility');
    },
  });

  function setMaterialOverride(value: 'GC' | 'TC' | null) {
    updateOverride.mutate({ kind: 'material', value });
  }

  function setEquipmentOverride(value: 'GC' | 'TC' | null) {
    updateOverride.mutate({ kind: 'equipment', value });
  }

  return {
    materialResponsible,
    equipmentResponsible,
    materialOverridden,
    equipmentOverridden,
    setMaterialOverride,
    setEquipmentOverride,
    isLoading,
    isSaving: updateOverride.isPending,
  };
}

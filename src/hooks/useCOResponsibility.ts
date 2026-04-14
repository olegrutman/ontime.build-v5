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
}

export function useCOResponsibility(
  coId: string | undefined,
  projectId: string | undefined,
  coMaterialOverride: string | null | undefined,
  coEquipmentOverride: string | null | undefined,
): UseCOResponsibilityResult {
  const queryClient = useQueryClient();

  // Fetch project contract defaults
  const { data: contractDefaults, isLoading } = useQuery({
    queryKey: ['project-contract-responsibility', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('project_contracts')
        .select('material_responsibility')
        .eq('project_id', projectId!)
        .not('material_responsibility', 'is', null)
        .limit(1)
        .maybeSingle();
      return {
        materialResponsibility: (data?.material_responsibility as 'GC' | 'TC') ?? 'TC',
      };
    },
    staleTime: 60_000,
  });

  const materialOverridden = !!coMaterialOverride;
  const equipmentOverridden = !!coEquipmentOverride;

  const materialResponsible: 'GC' | 'TC' = coMaterialOverride
    ? (coMaterialOverride as 'GC' | 'TC')
    : contractDefaults?.materialResponsibility ?? 'TC';

  const equipmentResponsible: 'GC' | 'TC' = coEquipmentOverride
    ? (coEquipmentOverride as 'GC' | 'TC')
    : 'TC'; // default equipment to TC

  const updateOverride = useMutation({
    mutationFn: async (patch: Record<string, string | null>) => {
      if (!coId) throw new Error('No CO ID');
      const { error } = await supabase
        .from('change_orders')
        .update(patch)
        .eq('id', coId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['co-detail', coId] });
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Failed to update responsibility');
    },
  });

  function setMaterialOverride(value: 'GC' | 'TC' | null) {
    updateOverride.mutate({ co_material_responsible_override: value });
  }

  function setEquipmentOverride(value: 'GC' | 'TC' | null) {
    updateOverride.mutate({ co_equipment_responsible_override: value });
  }

  return {
    materialResponsible,
    equipmentResponsible,
    materialOverridden,
    equipmentOverridden,
    setMaterialOverride,
    setEquipmentOverride,
    isLoading,
  };
}

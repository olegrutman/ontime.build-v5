import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  ContractScopeCategory,
  ContractScopeSelection,
  ContractScopeDetail,
  ContractScopeExclusion,
} from '@/types/contractScope';

export function useScopeCategories() {
  return useQuery({
    queryKey: ['contract_scope_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_scope_categories')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as unknown as ContractScopeCategory[];
    },
  });
}

export function useContractScopeSelections(contractId: string | undefined) {
  return useQuery({
    queryKey: ['contract_scope_selections', contractId],
    enabled: !!contractId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_scope_selections')
        .select('*')
        .eq('contract_id', contractId!);
      if (error) throw error;
      return data as unknown as ContractScopeSelection[];
    },
  });
}

export function useContractScopeDetails(selectionIds: string[]) {
  return useQuery({
    queryKey: ['contract_scope_details', selectionIds],
    enabled: selectionIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_scope_details')
        .select('*')
        .in('selection_id', selectionIds);
      if (error) throw error;
      return data as unknown as ContractScopeDetail[];
    },
  });
}

export function useContractScopeExclusions(contractId: string | undefined) {
  return useQuery({
    queryKey: ['contract_scope_exclusions', contractId],
    enabled: !!contractId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_scope_exclusions')
        .select('*')
        .eq('contract_id', contractId!);
      if (error) throw error;
      return data as unknown as ContractScopeExclusion[];
    },
  });
}

export function useSaveContractScope(projectId: string, contractId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      selectedSlugs: string[];
      details: Record<string, Record<string, string>>; // slug -> { key: value }
      exclusions: { label: string; isCustom: boolean }[];
    }) => {
      // 1. Delete existing selections (cascades details)
      await supabase
        .from('contract_scope_selections')
        .delete()
        .eq('contract_id', contractId);

      // 2. Delete existing exclusions
      await supabase
        .from('contract_scope_exclusions')
        .delete()
        .eq('contract_id', contractId);

      // 3. Insert selections
      if (payload.selectedSlugs.length > 0) {
        const selectionRows = payload.selectedSlugs.map(slug => ({
          project_id: projectId,
          contract_id: contractId,
          category_slug: slug,
          is_included: true,
        }));

        const { data: insertedSelections, error: selErr } = await supabase
          .from('contract_scope_selections')
          .insert(selectionRows as any)
          .select('id, category_slug');
        if (selErr) throw selErr;

        // 4. Insert details
        const detailRows: any[] = [];
        for (const sel of (insertedSelections || [])) {
          const catDetails = payload.details[sel.category_slug];
          if (catDetails) {
            for (const [key, value] of Object.entries(catDetails)) {
              if (value) {
                detailRows.push({
                  selection_id: sel.id,
                  detail_key: key,
                  detail_value: value,
                });
              }
            }
          }
        }

        if (detailRows.length > 0) {
          const { error: detErr } = await supabase
            .from('contract_scope_details')
            .insert(detailRows as any);
          if (detErr) throw detErr;
        }
      }

      // 5. Insert exclusions
      if (payload.exclusions.length > 0) {
        const exclRows = payload.exclusions.map(e => ({
          project_id: projectId,
          contract_id: contractId,
          exclusion_label: e.label,
          is_custom: e.isCustom,
        }));

        const { error: exclErr } = await supabase
          .from('contract_scope_exclusions')
          .insert(exclRows as any);
        if (exclErr) throw exclErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract_scope_selections', contractId] });
      qc.invalidateQueries({ queryKey: ['contract_scope_exclusions', contractId] });
      qc.invalidateQueries({ queryKey: ['contract_scope_details'] });
    },
  });
}

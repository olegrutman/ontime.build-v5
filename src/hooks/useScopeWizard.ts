import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ScopeSection, ScopeItem, ScopeSelection, ProfileDraft } from '@/types/projectProfile';
import { checkItemFeature } from '@/types/projectProfile';

export function useScopeSections() {
  return useQuery({
    queryKey: ['scope_sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scope_sections')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as unknown as ScopeSection[];
    },
  });
}

export function useScopeItems() {
  return useQuery({
    queryKey: ['scope_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scope_items')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as unknown as ScopeItem[];
    },
  });
}

export function useScopeSelections(projectId: string | undefined) {
  return useQuery({
    queryKey: ['scope_selections', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_scope_selections')
        .select('*')
        .eq('project_id', projectId!);
      if (error) throw error;
      return data as unknown as ScopeSelection[];
    },
  });
}

/** Filter sections visible for a given profile */
export function filterSections(sections: ScopeSection[], profile: ProfileDraft): ScopeSection[] {
  return sections.filter(s => {
    if (s.always_visible || !s.required_feature) return true;
    return checkItemFeature(s.required_feature, profile);
  });
}

/** Filter items visible for a section given the profile */
export function filterItems(
  items: ScopeItem[],
  sectionId: string,
  profile: ProfileDraft,
  projectTypeSlug: string,
): ScopeItem[] {
  return items
    .filter(i => i.section_id === sectionId)
    .filter(i => {
      // Check required_feature
      if (!checkItemFeature(i.required_feature, profile)) return false;
      // Check excluded_project_types
      if (i.excluded_project_types?.includes(projectTypeSlug)) return false;
      // Check only_project_types
      if (i.only_project_types && i.only_project_types.length > 0 && !i.only_project_types.includes(projectTypeSlug)) return false;
      // Check min_stories
      if (i.min_stories && profile.stories < i.min_stories) return false;
      return true;
    });
}

export function useSaveScopeSelections(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (selections: { profileId: string; items: { scope_item_id: string; is_on: boolean }[] }) => {
      // Delete existing and reinsert
      await supabase
        .from('project_scope_selections')
        .delete()
        .eq('project_id', projectId);

      if (selections.items.length > 0) {
        const rows = selections.items.map(i => ({
          project_id: projectId,
          profile_id: selections.profileId,
          scope_item_id: i.scope_item_id,
          is_on: i.is_on,
          is_new: false,
          is_conflict: false,
        }));

        const { error } = await supabase
          .from('project_scope_selections')
          .insert(rows as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scope_selections', projectId] });
    },
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { FeatureKey, OrgFeature } from '@/types/subscription';

/**
 * Fetches the merged effective features for the current user's primary organization.
 * Uses the get_org_features() security-definer function.
 */
export function useOrgFeaturesForCurrentOrg() {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ['org-features', orgId],
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!orgId) return [] as OrgFeature[];
      const { data, error } = await supabase.rpc('get_org_features', {
        p_org_id: orgId,
      });
      if (error) throw error;
      return (data || []) as OrgFeature[];
    },
  });
}

/**
 * Check whether a specific feature is enabled for the current org.
 * Returns { enabled, limit, loading }.
 */
export function useFeatureAccess(featureKey: FeatureKey) {
  const { data: features, isLoading } = useOrgFeaturesForCurrentOrg();

  const feature = features?.find((f) => f.feature_key === featureKey);

  return {
    enabled: feature?.enabled ?? true, // default open while loading (graceful degradation)
    limit: feature?.limit_value ?? null,
    loading: isLoading,
    source: feature?.source ?? 'none',
  };
}

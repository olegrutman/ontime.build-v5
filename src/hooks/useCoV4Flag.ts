import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgType } from '@/hooks/useOrgType';
import { useAuth } from '@/hooks/useAuth';

/**
 * CO v4 feature flag hook — org-scoped.
 * Returns whether the current user's primary org has the named v4 flag enabled.
 * Defaults to `false` while loading so existing flows stay the default.
 */
export function useCoV4Flag(flag: 'co_v4' = 'co_v4'): boolean {
  return useCoV4FlagState(flag).enabled;
}

/**
 * Full state of the CO v4 flag query — use when callers need to distinguish
 * "still loading" from "explicitly disabled" (e.g. to avoid premature redirects).
 */
export function useCoV4FlagState(flag: 'co_v4' = 'co_v4') {
  const { userOrgRoles } = useAuth();
  const orgId = userOrgRoles[0]?.organization_id ?? null;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['co-v4-flag', orgId, flag],
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('co_v4_feature_flags')
        .select('enabled')
        .eq('org_id', orgId!)
        .eq('flag', flag)
        .maybeSingle();
      if (error) return false;
      return !!data?.enabled;
    },
  });

  return {
    enabled: !!data,
    loading: !orgId || isLoading || (isFetching && data === undefined),
    resolved: data !== undefined,
  };
}

/** Convenience: also expose orgType so gated UI can mention "GC only" etc. */
export function useCoV4Context() {
  const enabled = useCoV4Flag();
  const orgType = useOrgType();
  return { enabled, ...orgType };
}

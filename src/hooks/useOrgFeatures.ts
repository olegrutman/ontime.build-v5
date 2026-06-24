import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { FeatureKey, OrgFeature, OrgFeatureOverride, SubscriptionPlan, PlanFeature } from '@/types/subscription';

/** Fetch all subscription plans with their features */
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data: plans, error: plansError } = await supabase
        .from('subscription_plans' as any)
        .select('*')
        .order('sort_order');
      if (plansError) throw plansError;

      const { data: features, error: featuresError } = await supabase
        .from('plan_features' as any)
        .select('*');
      if (featuresError) throw featuresError;

      return {
        plans: (plans || []) as unknown as SubscriptionPlan[],
        features: (features || []) as unknown as PlanFeature[],
      };
    },
  });
}

/** Fetch merged effective features for a specific org (platform admin) */
export function useOrgEffectiveFeatures(orgId: string | undefined) {
  return useQuery({
    queryKey: ['org-features', orgId],
    enabled: !!orgId,
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

/** Fetch raw overrides for a specific org (platform admin) */
export function useOrgOverrides(orgId: string | undefined) {
  return useQuery({
    queryKey: ['org-overrides', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      if (!orgId) return [] as OrgFeatureOverride[];
      const { data, error } = await supabase
        .from('org_feature_overrides' as any)
        .select('*')
        .eq('organization_id', orgId);
      if (error) throw error;
      return (data || []) as unknown as OrgFeatureOverride[];
    },
  });
}

/** Upsert an org feature override */
export function useUpsertOrgOverride(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (override: {
      feature_key: FeatureKey;
      enabled: boolean;
      limit_value?: number | null;
    }) => {
      const { error } = await supabase
        .from('org_feature_overrides' as any)
        .upsert(
          {
            organization_id: orgId,
            feature_key: override.feature_key,
            enabled: override.enabled,
            limit_value: override.limit_value ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'organization_id,feature_key' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-features', orgId] });
      queryClient.invalidateQueries({ queryKey: ['org-overrides', orgId] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });
}

/** Delete an org feature override (revert to plan default) */
export function useDeleteOrgOverride(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (featureKey: FeatureKey) => {
      const { error } = await supabase
        .from('org_feature_overrides' as any)
        .delete()
        .eq('organization_id', orgId)
        .eq('feature_key', featureKey);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-features', orgId] });
      queryClient.invalidateQueries({ queryKey: ['org-overrides', orgId] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });
}

/** Update an org's subscription plan */
export function useUpdateOrgPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, planId }: { orgId: string; planId: string }) => {
      const { error } = await supabase
        .from('organizations')
        .update({ subscription_plan_id: planId } as any)
        .eq('id', orgId);
      if (error) throw error;
    },
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: ['org-features', orgId] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast({ title: 'Plan updated', description: 'The organization plan has been changed.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });
}

/** Update a plan feature toggle */
export function useUpdatePlanFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      planId,
      featureKey,
      enabled,
      limitValue,
    }: {
      planId: string;
      featureKey: FeatureKey;
      enabled: boolean;
      limitValue?: number | null;
    }) => {
      const { error } = await supabase
        .from('plan_features' as any)
        .upsert(
          { plan_id: planId, feature_key: featureKey, enabled, limit_value: limitValue ?? null },
          { onConflict: 'plan_id,feature_key' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast({ title: 'Plan feature updated' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });
}

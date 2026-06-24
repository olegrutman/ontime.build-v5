import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { DEFAULT_ROLE_RULES } from '@/constants/defaultRoleRules';
import type { OrgType } from '@/types/organization';

const ORG_TYPE_TO_RULE_KEY: Record<OrgType, 'gc' | 'tc' | 'fc' | 'supplier'> = {
  GC: 'gc',
  TC: 'tc',
  FC: 'fc',
  SUPPLIER: 'supplier',
};

/**
 * Check if a platform-level role rule is enabled for the current user's org type.
 * Falls back to DEFAULT_ROLE_RULES if no platform_settings override exists.
 */
export function useRoleRule(ruleId: string): { allowed: boolean; loading: boolean } {
  const { userOrgRoles } = useAuth();
  const { data: settings, isLoading } = usePlatformSettings();

  return useMemo(() => {
    const orgType = userOrgRoles[0]?.organization?.type as OrgType | undefined;
    if (!orgType) return { allowed: false, loading: isLoading };

    const ruleKey = ORG_TYPE_TO_RULE_KEY[orgType];

    // Check platform_settings override first
    const storedRules = settings?.role_rules as Record<string, Record<string, boolean>> | undefined;
    if (storedRules && storedRules[ruleId] !== undefined) {
      const ruleConfig = storedRules[ruleId];
      return { allowed: ruleConfig[ruleKey] ?? false, loading: false };
    }

    // Fall back to defaults
    const defaultRule = DEFAULT_ROLE_RULES.find(r => r.id === ruleId);
    if (!defaultRule || !defaultRule.enabled) return { allowed: false, loading: false };

    return { allowed: defaultRule[ruleKey] ?? false, loading: false };
  }, [userOrgRoles, settings, ruleId, isLoading]);
}

/**
 * Batch-check multiple role rules at once.
 */
export function useRoleRules(ruleIds: string[]): Record<string, boolean> {
  const { userOrgRoles } = useAuth();
  const { data: settings } = usePlatformSettings();

  return useMemo(() => {
    const orgType = userOrgRoles[0]?.organization?.type as OrgType | undefined;
    if (!orgType) return Object.fromEntries(ruleIds.map(id => [id, false]));

    const ruleKey = ORG_TYPE_TO_RULE_KEY[orgType];
    const storedRules = settings?.role_rules as Record<string, Record<string, boolean>> | undefined;
    const result: Record<string, boolean> = {};

    for (const ruleId of ruleIds) {
      if (storedRules && storedRules[ruleId] !== undefined) {
        result[ruleId] = storedRules[ruleId][ruleKey] ?? false;
      } else {
        const defaultRule = DEFAULT_ROLE_RULES.find(r => r.id === ruleId);
        result[ruleId] = defaultRule?.enabled ? (defaultRule[ruleKey] ?? false) : false;
      }
    }

    return result;
  }, [userOrgRoles, settings, ruleIds]);
}

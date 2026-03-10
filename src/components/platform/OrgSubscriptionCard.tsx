import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, RotateCcw } from 'lucide-react';
import {
  useSubscriptionPlans,
  useOrgEffectiveFeatures,
  useOrgOverrides,
  useUpsertOrgOverride,
  useDeleteOrgOverride,
  useUpdateOrgPlan,
} from '@/hooks/useOrgFeatures';
import { FEATURE_LABELS, FEATURE_DESCRIPTIONS, FEATURE_KEYS, LIMIT_FEATURES } from '@/types/subscription';
import type { FeatureKey } from '@/types/subscription';

interface OrgSubscriptionCardProps {
  orgId: string;
  currentPlanId: string | null;
}

export function OrgSubscriptionCard({ orgId, currentPlanId }: OrgSubscriptionCardProps) {
  const { data: plansData, isLoading: plansLoading } = useSubscriptionPlans();
  const { data: effectiveFeatures, isLoading: featuresLoading } = useOrgEffectiveFeatures(orgId);
  const { data: overrides } = useOrgOverrides(orgId);
  const upsertOverride = useUpsertOrgOverride(orgId);
  const deleteOverride = useDeleteOrgOverride(orgId);
  const updatePlan = useUpdateOrgPlan();

  const [selectedPlanId, setSelectedPlanId] = useState<string>(currentPlanId ?? '');

  // Sync state when prop arrives asynchronously
  React.useEffect(() => {
    if (currentPlanId && selectedPlanId === '') {
      setSelectedPlanId(currentPlanId);
    }
  }, [currentPlanId]);

  const plans = plansData?.plans ?? [];
  const currentPlan = plans.find((p) => p.id === (currentPlanId ?? selectedPlanId));

  function getEffective(fk: FeatureKey) {
    return effectiveFeatures?.find((f) => f.feature_key === fk);
  }

  function hasOverride(fk: FeatureKey) {
    return overrides?.some((o) => o.feature_key === fk) ?? false;
  }

  function handleToggleOverride(fk: FeatureKey, currentEnabled: boolean) {
    upsertOverride.mutate({ feature_key: fk, enabled: !currentEnabled });
  }

  function handleRemoveOverride(fk: FeatureKey) {
    deleteOverride.mutate(fk);
  }

  function handlePlanChange(planId: string) {
    setSelectedPlanId(planId);
    updatePlan.mutate({ orgId, planId });
  }

  if (plansLoading || featuresLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription & Features</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Subscription & Features</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Manage this organization's plan and feature access. Overrides take priority over the plan.
            </CardDescription>
          </div>
          {currentPlan && (
            <Badge variant="secondary" className="capitalize shrink-0 ml-2">
              {currentPlan.display_name}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Plan selector */}
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">Subscription Plan</p>
          <Select value={selectedPlanId || currentPlanId || ''} onValueChange={handlePlanChange}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select plan" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.display_name}
                  {plan.monthly_price === 0 ? ' (Free)' : ` ($${plan.monthly_price}/mo)`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Feature overrides grid */}
        <div>
          <p className="text-sm font-medium mb-2">Feature Overrides</p>
          <div className="border rounded-md divide-y">
            {FEATURE_KEYS.map((fk) => {
              const eff = getEffective(fk);
              const overridden = hasOverride(fk);
              const isLimit = LIMIT_FEATURES.includes(fk);

              return (
                <div key={fk} className="flex items-center justify-between px-3 py-2 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground shrink-0 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[220px] text-xs">
                        {FEATURE_DESCRIPTIONS[fk]}
                      </TooltipContent>
                    </Tooltip>
                    <span className="text-sm truncate">{FEATURE_LABELS[fk]}</span>
                    {overridden && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1 h-4 shrink-0">
                        override
                      </Badge>
                    )}
                    {isLimit && eff?.enabled && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        max: {eff.limit_value ?? '∞'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={eff?.enabled ?? false}
                      onCheckedChange={() => handleToggleOverride(fk, eff?.enabled ?? false)}
                      disabled={upsertOverride.isPending}
                    />
                    {overridden && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleRemoveOverride(fk)}
                            disabled={deleteOverride.isPending}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">Revert to plan default</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

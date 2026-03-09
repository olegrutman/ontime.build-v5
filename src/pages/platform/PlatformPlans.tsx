import { useState } from 'react';
import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useSubscriptionPlans, useUpdatePlanFeature } from '@/hooks/useOrgFeatures';
import { FEATURE_LABELS, FEATURE_DESCRIPTIONS, FEATURE_KEYS, LIMIT_FEATURES } from '@/types/subscription';
import type { FeatureKey, SubscriptionPlan, PlanFeature } from '@/types/subscription';
import { DollarSign, Layers } from 'lucide-react';

export default function PlatformPlans() {
  const { data, isLoading } = useSubscriptionPlans();
  const updateFeature = useUpdatePlanFeature();
  const [editingLimit, setEditingLimit] = useState<{ planId: string; featureKey: FeatureKey } | null>(null);
  const [limitInput, setLimitInput] = useState('');

  const plans = data?.plans ?? [];
  const features = data?.features ?? [];

  function getFeature(planId: string, fk: FeatureKey): PlanFeature | undefined {
    return features.find((f) => f.plan_id === planId && f.feature_key === fk);
  }

  function handleToggle(plan: SubscriptionPlan, fk: FeatureKey, current: boolean) {
    updateFeature.mutate({ planId: plan.id, featureKey: fk, enabled: !current });
  }

  function startEditLimit(planId: string, fk: FeatureKey, currentVal: number | null) {
    setEditingLimit({ planId, featureKey: fk });
    setLimitInput(currentVal != null ? String(currentVal) : '');
  }

  function commitLimit(plan: SubscriptionPlan, fk: FeatureKey) {
    const val = limitInput === '' ? null : parseInt(limitInput, 10);
    const feat = getFeature(plan.id, fk);
    updateFeature.mutate({
      planId: plan.id,
      featureKey: fk,
      enabled: feat?.enabled ?? true,
      limitValue: isNaN(val as number) ? null : val,
    });
    setEditingLimit(null);
  }

  if (isLoading) {
    return (
      <PlatformLayout title="Plans & Features">
        <Skeleton className="h-96 w-full" />
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout
      title="Plans & Features"
      breadcrumbs={[
        { label: 'Platform', href: '/platform' },
        { label: 'Plans & Features' },
      ]}
    >
      {/* Plan summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {plans.map((plan) => (
          <Card key={plan.id} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{plan.display_name}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">{plan.description}</CardDescription>
                </div>
                <Badge variant={plan.is_active ? 'default' : 'secondary'} className="text-xs">
                  {plan.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-baseline gap-1 mt-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-xl font-bold">
                  {plan.monthly_price === 0 ? 'Free' : `$${plan.monthly_price}`}
                </span>
                {(plan.monthly_price ?? 0) > 0 && (
                  <span className="text-xs text-muted-foreground">/mo</span>
                )}
              </div>
              {(plan.annual_price ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  ${plan.annual_price}/yr (save {Math.round((1 - (plan.annual_price! / (plan.monthly_price! * 12))) * 100)}%)
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {features.filter((f) => f.plan_id === plan.id && f.enabled).length} features enabled
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Feature matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature Matrix</CardTitle>
          <CardDescription>Toggle features per plan. Limit column only applies to capacity features (e.g., max projects).</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Feature</TableHead>
                {plans.map((p) => (
                  <TableHead key={p.id} className="text-center min-w-[120px]">
                    {p.display_name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {FEATURE_KEYS.map((fk) => (
                <TableRow key={fk}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{FEATURE_LABELS[fk]}</p>
                      <p className="text-xs text-muted-foreground">{FEATURE_DESCRIPTIONS[fk]}</p>
                    </div>
                  </TableCell>
                  {plans.map((plan) => {
                    const feat = getFeature(plan.id, fk);
                    const isLimit = LIMIT_FEATURES.includes(fk);
                    const isEditing =
                      editingLimit?.planId === plan.id && editingLimit?.featureKey === fk;

                    return (
                      <TableCell key={plan.id} className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Switch
                            checked={feat?.enabled ?? false}
                            onCheckedChange={() => handleToggle(plan, fk, feat?.enabled ?? false)}
                            disabled={updateFeature.isPending}
                          />
                          {isLimit && (
                            isEditing ? (
                              <Input
                                className="h-6 w-16 text-xs text-center px-1"
                                value={limitInput}
                                onChange={(e) => setLimitInput(e.target.value)}
                                onBlur={() => commitLimit(plan, fk)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitLimit(plan, fk);
                                  if (e.key === 'Escape') setEditingLimit(null);
                                }}
                                placeholder="∞"
                                autoFocus
                              />
                            ) : (
                              <button
                                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                                onClick={() => startEditLimit(plan.id, fk, feat?.limit_value ?? null)}
                              >
                                {feat?.limit_value != null ? feat.limit_value : '∞'}
                              </button>
                            )
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PlatformLayout>
  );
}

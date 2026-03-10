import * as React from 'react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Lock } from 'lucide-react';
import type { FeatureKey } from '@/types/subscription';
import { FEATURE_LABELS } from '@/types/subscription';

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  /** Fallback when feature is disabled (default: upgrade prompt) */
  fallback?: React.ReactNode;
}

/**
 * Conditionally renders children based on the current org's feature access.
 * Shows an upgrade prompt by default when the feature is disabled.
 */
export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { enabled, loading } = useFeatureAccess(feature);

  if (loading) return <>{children}</>;

  if (!enabled) {
    if (fallback !== undefined) return <>{fallback}</>;
    return <UpgradePrompt feature={feature} />;
  }

  return <>{children}</>;
}

function UpgradePrompt({ feature }: { feature: FeatureKey }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {FEATURE_LABELS[feature]} is not available
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        This feature is not included in your current plan. Contact your administrator to upgrade.
      </p>
    </div>
  );
}

/**
 * Hook to check if a feature is enabled — for conditional rendering of tabs, nav items, etc.
 */
export function useFeatureEnabled(feature: FeatureKey) {
  const { enabled, loading } = useFeatureAccess(feature);
  // While loading, default to enabled (graceful degradation)
  return loading ? true : enabled;
}

/** Map project tab names to feature keys */
export const TAB_FEATURE_MAP: Record<string, FeatureKey> = {
  'schedule': 'schedule_gantt',
  'sov': 'sov_contracts',
  'purchase-orders': 'purchase_orders',
  'invoices': 'invoicing',
  'work-orders': 'change_orders',
  'daily-log': 'daily_logs',
  'returns': 'returns_tracking',
  'estimates': 'supplier_estimates',
};

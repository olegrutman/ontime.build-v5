export type FeatureKey =
  | 'max_projects'
  | 'max_team_members'
  | 'schedule_gantt'
  | 'sov_contracts'
  | 'purchase_orders'
  | 'invoicing'
  | 'change_orders'
  | 'time_materials'
  | 'returns_tracking'
  | 'supplier_estimates'
  | 'custom_reports'
  | 'api_access'
  | 'daily_logs';

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  max_projects: 'Projects',
  max_team_members: 'Team Members',
  schedule_gantt: 'Schedule / Gantt',
  sov_contracts: 'SOV & Contracts',
  purchase_orders: 'Purchase Orders',
  invoicing: 'Invoicing',
  change_orders: 'Change Orders',
  time_materials: 'Time & Materials',
  returns_tracking: 'Returns Tracking',
  supplier_estimates: 'Supplier Estimates',
  custom_reports: 'Custom Reports / Export',
  api_access: 'API Access',
  daily_logs: 'Daily Logs',
};

export const FEATURE_DESCRIPTIONS: Record<FeatureKey, string> = {
  max_projects: 'Maximum number of active projects (null = unlimited)',
  max_team_members: 'Maximum team members per organization (null = unlimited)',
  schedule_gantt: 'Gantt chart scheduling and timeline views',
  sov_contracts: 'Schedule of Values and contract management',
  purchase_orders: 'Create and manage purchase orders',
  invoicing: 'Submit and approve invoices with retainage',
  change_orders: 'Change order creation and approval workflow',
  time_materials: 'Time & Materials tracking and billing',
  returns_tracking: 'Track material returns to suppliers',
  supplier_estimates: 'Supplier estimate requests and comparisons',
  custom_reports: 'Custom reporting and data export',
  api_access: 'Programmatic API access',
  daily_logs: 'Daily field log entries with weather and manpower',
};

export const FEATURE_KEYS: FeatureKey[] = Object.keys(FEATURE_LABELS) as FeatureKey[];

export const LIMIT_FEATURES: FeatureKey[] = ['max_projects', 'max_team_members'];

export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  monthly_price: number | null;
  annual_price: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface PlanFeature {
  id: string;
  plan_id: string;
  feature_key: FeatureKey;
  enabled: boolean;
  limit_value: number | null;
}

export interface OrgFeatureOverride {
  id: string;
  organization_id: string;
  feature_key: FeatureKey;
  enabled: boolean;
  limit_value: number | null;
  updated_by: string | null;
  updated_at: string;
}

export interface OrgFeature {
  feature_key: FeatureKey;
  enabled: boolean;
  limit_value: number | null;
  source: 'plan' | 'override' | 'none';
}

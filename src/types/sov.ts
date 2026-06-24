export interface SOVLine {
  id: string;
  sov_id: string | null;
  project_id: string;
  item_name: string;
  item_group: string | null;
  percent_of_contract: number | null;
  value_amount: number | null;
  scheduled_value: number | null;
  sort_order: number;
  source: string;
  scope_section_slug: string | null;
  is_locked: boolean;
  ai_original_pct: number | null;
  billing_status: string;
  remaining_amount: number;
  billed_to_date: number | null;
  total_billed_amount: number | null;
  total_completion_percent: number | null;
  default_enabled: boolean;
  created_at: string;
  updated_at: string | null;
  // Client-side only
  _edited?: boolean;
}

export interface SOVVersion {
  id: string;
  project_id: string;
  contract_id: string | null;
  project_profile_id: string | null;
  sov_name: string | null;
  is_locked: boolean;
  locked_at: string | null;
  locked_by: string | null;
  version: number;
  previous_version_id: string | null;
  scope_snapshot: any;
  created_at: string;
}

export interface ScopeCoverage {
  sectionSlug: string;
  sectionLabel: string;
  itemCount: number;
  covered: boolean;
  allocatedPct: number;
}

export interface AISOVLine {
  item_name: string;
  group: string;
  percent: number;
  scope_section_slug: string;
  floor_label: string;
}

export interface SOVPrerequisites {
  hasProfile: boolean;
  hasScope: boolean;
  hasContract: boolean;
  profileSummary?: string;
  scopeCount?: number;
  contractValue?: number;
  retainagePct?: number;
  contractNumber?: string;
  contractId?: string;
  profileId?: string;
}

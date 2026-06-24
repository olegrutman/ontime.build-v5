export type CorStatus = 
  | 'REQUESTED' 
  | 'SENT_TO_TC' 
  | 'SENT_TO_FIELD_CREW' 
  | 'HOURS_SUBMITTED' 
  | 'PRICED_BY_TC' 
  | 'CONVERTED';

export type CorScopeType = 'RE-FRAME' | 'ADDITION' | 'FIXING' | 'RE-INSTALL' | 'ADJUST';

export type CorReason = 
  | 'OWNER_REQUEST' 
  | 'MISSING_SCOPE' 
  | 'DESIGN_CONFLICT' 
  | 'DAMAGE_BY_OTHERS';

export type AppRole = 'FIELD_CREW' | 'TRADE_CONTRACTOR' | 'GC';

// Match the StructuredLocation from StructuredLocationPicker
export interface StructuredLocation {
  location_primary?: 'INSIDE' | 'OUTSIDE' | '';
  level?: string;
  building_type?: string;
  unit_id?: string;
  room_or_area?: string;
  custom_text?: string;
}

export interface ChangeOrderRequest {
  id: string;
  reference_number: number;
  project_id: string;
  contract_context_id: string | null;
  location: StructuredLocation;
  scope_type: CorScopeType;
  description: string;
  reason: CorReason;
  status: CorStatus;
  created_by_user_id: string;
  recipient_user_id: string | null;
  man_hours: number | null;
  fc_notes: string | null;
  hours_submitted_at: string | null;
  hours_submitted_by_user_id: string | null;
  labor_rate: number | null;
  labor_cost: number | null;
  materials_cost: number | null;
  equipment_cost: number | null;
  markup_percent: number | null;
  total_cost: number | null;
  priced_at: string | null;
  priced_by_user_id: string | null;
  converted_to_co_id: string | null;
  converted_at: string | null;
  converted_by_user_id: string | null;
  opened_at: string | null;
  sent_at: string | null;
  originated_by_role: AppRole | null;
  draft_co_id: string | null;
  parent_cor_id: string | null;
  parent_cor_ref: string | null;
  created_at: string;
  updated_at: string;
}

// Helper to format COR reference
export function formatCorRef(referenceNumber: number): string {
  return `COR-${referenceNumber}`;
}

// Helper to format CO reference
export function formatCoRef(referenceNumber: number): string {
  return `CO-${referenceNumber}`;
}

export const SCOPE_TYPE_OPTIONS: { value: CorScopeType; label: string }[] = [
  { value: 'RE-FRAME', label: 'Re-frame' },
  { value: 'ADDITION', label: 'Addition' },
  { value: 'FIXING', label: 'Fixing' },
  { value: 'RE-INSTALL', label: 'Re-install' },
  { value: 'ADJUST', label: 'Adjust' },
];

export const REASON_OPTIONS: { value: CorReason; label: string }[] = [
  { value: 'OWNER_REQUEST', label: 'Owner Request' },
  { value: 'MISSING_SCOPE', label: 'Missing Scope' },
  { value: 'DESIGN_CONFLICT', label: 'Design Conflict' },
  { value: 'DAMAGE_BY_OTHERS', label: 'Damage by Others' },
];

export const STATUS_CONFIG: Record<CorStatus, { 
  label: string; 
  className: string;
  description: string;
}> = {
  REQUESTED: { 
    label: 'Requested', 
    className: 'bg-muted text-muted-foreground',
    description: 'GC has requested this work'
  },
  SENT_TO_TC: { 
    label: 'Sent to TC', 
    className: 'bg-warning/10 text-warning',
    description: 'Awaiting Trade Contractor review'
  },
  SENT_TO_FIELD_CREW: { 
    label: 'Sent to FC', 
    className: 'bg-accent/10 text-accent',
    description: 'Awaiting Field Crew estimate'
  },
  HOURS_SUBMITTED: { 
    label: 'Hours Submitted', 
    className: 'bg-primary/10 text-primary',
    description: 'Field Crew has submitted hours'
  },
  PRICED_BY_TC: { 
    label: 'Priced', 
    className: 'bg-success/10 text-success',
    description: 'TC has added pricing - ready to convert'
  },
  CONVERTED: { 
    label: 'Converted', 
    className: 'bg-muted text-muted-foreground',
    description: 'Converted to Change Order'
  },
};

export const ROLE_LABELS: Record<AppRole, string> = {
  FIELD_CREW: 'Field Crew',
  TRADE_CONTRACTOR: 'Trade Contractor',
  GC: 'General Contractor',
};

export function getLocationDisplayString(location: StructuredLocation): string {
  const parts: string[] = [];
  
  // Handle structured location from StructuredLocationPicker
  if (location.level) parts.push(location.level);
  if (location.unit_id) parts.push(`Unit ${location.unit_id}`);
  if (location.room_or_area) parts.push(location.room_or_area);
  if (location.custom_text) parts.push(location.custom_text);
  
  // If nothing matched, show location primary
  if (parts.length === 0 && location.location_primary) {
    parts.push(location.location_primary === 'INSIDE' ? 'Inside' : 'Outside');
  }
  
  return parts.length > 0 ? parts.join(' - ') : 'No location specified';
}

import { WorkItemState } from './workItem';

export interface ChangeWorkPricing {
  id: string;
  work_item_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  uom: string;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface WorkItemParticipant {
  id: string;
  work_item_id: string;
  organization_id: string;
  invited_by: string;
  invited_at: string;
  accepted_at: string | null;
  organization?: {
    id: string;
    org_code: string;
    name: string;
    type: string;
  };
}

export interface ChangeWork {
  id: string;
  organization_id: string;
  project_id: string | null;
  parent_work_item_id: string | null;
  item_type: 'CHANGE_WORK';
  state: WorkItemState;
  title: string;
  description: string | null;
  code: string | null;
  amount: number | null;
  location_ref: string | null;
  rejection_notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  pricing?: ChangeWorkPricing[];
  participants?: WorkItemParticipant[];
  organization?: {
    id: string;
    org_code: string;
    name: string;
    type: string;
  };
}

export const CHANGE_WORK_STATE_ACTIONS: Record<WorkItemState, {
  nextStates: WorkItemState[];
  allowedRoles: ('GC_PM' | 'TC_PM')[];
  actionLabel?: string;
}> = {
  OPEN: {
    nextStates: ['PRICED'],
    allowedRoles: ['TC_PM'],
    actionLabel: 'Submit Pricing',
  },
  PRICED: {
    nextStates: ['APPROVED', 'OPEN'], // OPEN = rejection
    allowedRoles: ['GC_PM'],
    actionLabel: 'Review',
  },
  APPROVED: {
    nextStates: ['EXECUTED'],
    allowedRoles: ['GC_PM'],
    actionLabel: 'Execute',
  },
  EXECUTED: {
    nextStates: [],
    allowedRoles: [],
  },
};

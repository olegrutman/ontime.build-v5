export type WorkItemType = 'PROJECT' | 'SOV_ITEM' | 'CHANGE_WORK' | 'TM_WORK';

export type WorkItemState = 'OPEN' | 'PRICED' | 'APPROVED' | 'EXECUTED';

export interface Location {
  structure?: string;
  floor?: string;
  area?: string;
}

export interface Participant {
  id: string;
  name: string;
  organization: string;
  role: 'owner' | 'contractor' | 'subcontractor' | 'architect' | 'engineer';
}

export interface WorkItem {
  id: string;
  parent_work_item_id: string | null;
  type: WorkItemType;
  state: WorkItemState;
  title: string;
  description?: string;
  code: string; // e.g., "CO-001", "SOV-003"
  amount?: number;
  location?: Location;
  participants: Participant[];
  created_at: string;
  updated_at: string;
  children?: WorkItem[];
}

export const WORK_ITEM_TYPE_LABELS: Record<WorkItemType, string> = {
  PROJECT: 'Project',
  SOV_ITEM: 'SOV Item',
  CHANGE_WORK: 'Work Order',
  TM_WORK: 'T&M Work',
};

export const WORK_ITEM_STATE_LABELS: Record<WorkItemState, string> = {
  OPEN: 'Open',
  PRICED: 'Priced',
  APPROVED: 'Approved',
  EXECUTED: 'Executed',
};

export const STATE_ORDER: WorkItemState[] = ['OPEN', 'PRICED', 'APPROVED', 'EXECUTED'];

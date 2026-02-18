export type RFIStatus = 'OPEN' | 'ANSWERED' | 'CLOSED';
export type RFIPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface ProjectRFI {
  id: string;
  project_id: string;
  rfi_number: number;
  subject: string;
  question: string;
  answer: string | null;
  status: RFIStatus;
  priority: RFIPriority;
  submitted_by_org_id: string;
  submitted_by_user_id: string;
  assigned_to_org_id: string;
  answered_by_user_id: string | null;
  answered_at: string | null;
  due_date: string | null;
  reference_area: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  submitted_by_org?: { name: string } | null;
  assigned_to_org?: { name: string } | null;
}

export interface CreateRFIPayload {
  project_id: string;
  subject: string;
  question: string;
  priority: RFIPriority;
  submitted_by_org_id: string;
  submitted_by_user_id: string;
  assigned_to_org_id: string;
  due_date?: string | null;
  reference_area?: string | null;
}

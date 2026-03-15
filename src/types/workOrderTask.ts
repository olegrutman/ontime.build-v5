export type WorkOrderTaskStatus = 'pending' | 'in_progress' | 'complete' | 'skipped';

export interface WorkOrderTask {
  id: string;
  work_order_id: string;
  sort_order: number;
  title: string;
  description: string | null;
  location_data: Record<string, string | undefined>;
  work_type: string | null;
  reason: string | null;
  structural_element: string | null;
  scope_size: string | null;
  urgency: string | null;
  pricing_mode: string | null;
  requires_materials: boolean;
  material_cost_responsibility: string | null;
  requires_equipment: boolean;
  equipment_cost_responsibility: string | null;
  status: WorkOrderTaskStatus;
  photo_url: string | null;
  voice_note_url: string | null;
  field_capture_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkOrderTaskInsert = Omit<WorkOrderTask, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export interface RoleRule {
  id: string;
  category: string;
  rule_name: string;
  description: string;
  gc: boolean;
  tc: boolean;
  fc: boolean;
  supplier: boolean;
  enabled: boolean;
}

export const DEFAULT_ROLE_RULES: RoleRule[] = [
  // SOV
  { id: 'sov_edit_lines', category: 'SOV', rule_name: 'Edit SOV Line Items', description: 'Can edit schedule of values line item percentages and amounts', gc: true, tc: true, fc: false, supplier: false, enabled: true },
  { id: 'sov_lock_unlock', category: 'SOV', rule_name: 'Lock / Unlock SOV Lines', description: 'Can lock or unlock individual SOV line items to prevent edits', gc: true, tc: true, fc: false, supplier: false, enabled: true },
  { id: 'sov_add_items', category: 'SOV', rule_name: 'Add SOV Items', description: 'Can add new line items to the schedule of values', gc: true, tc: true, fc: false, supplier: false, enabled: true },
  { id: 'sov_delete_items', category: 'SOV', rule_name: 'Delete SOV Items', description: 'Can remove line items from the schedule of values', gc: true, tc: false, fc: false, supplier: false, enabled: true },
  // Change Orders
  { id: 'co_create', category: 'Change Orders', rule_name: 'Create Change Orders', description: 'Can initiate new change orders on a project', gc: true, tc: true, fc: false, supplier: false, enabled: true },
  { id: 'co_request_fc_input', category: 'Change Orders', rule_name: 'Request Crew Input', description: 'Subcontractors can request crew input on a change order', gc: false, tc: true, fc: false, supplier: false, enabled: true },
  { id: 'co_fc_edit_as_collaborator', category: 'Change Orders', rule_name: 'Crew Edits as Collaborator', description: 'Crews can only edit change orders when added as an active collaborator', gc: false, tc: false, fc: true, supplier: false, enabled: true },
  { id: 'co_gc_sees_final_price', category: 'Change Orders', rule_name: 'General Contractor Sees Final Price Only', description: 'General contractors cannot see crew labor breakdown — only the submitted subcontractor price', gc: true, tc: false, fc: false, supplier: false, enabled: true },
  { id: 'co_approve', category: 'Change Orders', rule_name: 'Approve Change Orders', description: 'Can approve submitted change orders', gc: true, tc: false, fc: false, supplier: false, enabled: true },
  { id: 'co_reject', category: 'Change Orders', rule_name: 'Reject Change Orders', description: 'Can reject submitted change orders with a reason', gc: true, tc: false, fc: false, supplier: false, enabled: true },
  // Invoices
  { id: 'inv_submit', category: 'Invoices', rule_name: 'Submit Invoices', description: 'Can create and submit invoices for billing', gc: false, tc: true, fc: true, supplier: false, enabled: true },
  { id: 'inv_approve', category: 'Invoices', rule_name: 'Approve Invoices', description: 'Can approve submitted invoices for payment', gc: true, tc: false, fc: false, supplier: false, enabled: true },
  { id: 'inv_fc_own_only', category: 'Invoices', rule_name: 'Crews See Own Invoices Only', description: 'Crews can only view invoices they created', gc: false, tc: false, fc: true, supplier: false, enabled: true },
  { id: 'inv_view_all', category: 'Invoices', rule_name: 'View All Project Invoices', description: 'Can view all invoices across the project', gc: true, tc: true, fc: false, supplier: false, enabled: true },
  // Contracts
  { id: 'contract_manage', category: 'Contracts', rule_name: 'Manage All Contracts', description: 'Project creator can manage all contracts on the project', gc: true, tc: true, fc: false, supplier: false, enabled: true },
  { id: 'contract_tc_add_gc_fc', category: 'Contracts', rule_name: 'Subcontractors Can Add Contractors and Crews', description: 'Subcontractors can invite general contractors and crews to the project', gc: false, tc: true, fc: false, supplier: false, enabled: true },
  { id: 'contract_gc_add_tc', category: 'Contracts', rule_name: 'General Contractors Can Add Subcontractors', description: 'General contractors can invite subcontractors to the project', gc: true, tc: false, fc: false, supplier: false, enabled: true },
  { id: 'contract_edit_value', category: 'Contracts', rule_name: 'Edit Contract Value', description: 'Can modify the contract value after initial setup', gc: true, tc: true, fc: false, supplier: false, enabled: true },
  // Dashboard
  { id: 'dash_margin_kpis', category: 'Dashboard', rule_name: 'See Margin KPIs', description: 'Can view projected margin and profit metrics on dashboard', gc: true, tc: true, fc: false, supplier: false, enabled: true },
  { id: 'dash_receivables', category: 'Dashboard', rule_name: 'See Receivables KPIs', description: 'Can view receivable and payment metrics on dashboard', gc: false, tc: false, fc: false, supplier: true, enabled: true },
  { id: 'dash_fc_layout', category: 'Dashboard', rule_name: 'Crew 3-Card Dashboard', description: 'Crews see a simplified 3-card KPI layout', gc: false, tc: false, fc: true, supplier: false, enabled: true },
  // Projects
  { id: 'proj_material_toggle', category: 'Projects', rule_name: 'Material Responsibility Toggle', description: 'Material responsibility controls based on creator org type', gc: true, tc: true, fc: false, supplier: false, enabled: true },
  { id: 'proj_tab_gating', category: 'Projects', rule_name: 'Tab Feature Gating', description: 'Project tabs are shown or hidden based on subscription tier and role', gc: true, tc: true, fc: true, supplier: true, enabled: true },
  { id: 'proj_delete', category: 'Projects', rule_name: 'Delete Projects', description: 'Can delete projects from the system', gc: true, tc: true, fc: false, supplier: false, enabled: true },
  { id: 'proj_daily_logs', category: 'Projects', rule_name: 'Submit Daily Logs', description: 'Can create and submit daily field logs', gc: true, tc: true, fc: true, supplier: false, enabled: true },
];

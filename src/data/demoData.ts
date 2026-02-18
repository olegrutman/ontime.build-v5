// Static demo dataset — never touches Supabase

export type DemoRole = 'GC' | 'TC' | 'FC' | 'SUPPLIER';

export interface DemoProject {
  id: string;
  name: string;
  description: string;
  status: string;
  project_type: string;
  build_type: string;
  address: { street: string; city: string; state: string; zip: string };
  retainage_percent: number;
  organization_id: string;
  created_at: string;
  mobilization_enabled: boolean;
  structures: any[];
  parties: any[];
  city: string;
  state: string;
  zip: string;
}

export interface DemoWorkOrder {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: string;
  pricing_mode: string;
  work_type: string;
  created_at: string;
  final_price: number | null;
  labor_total: number | null;
  material_total: number | null;
}

export interface DemoPurchaseOrder {
  id: string;
  project_id: string;
  po_number: string;
  supplier_name: string;
  status: string;
  total_amount: number;
  created_at: string;
  items_count: number;
}

export interface DemoInvoice {
  id: string;
  project_id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  billing_period_start: string;
  billing_period_end: string;
  created_at: string;
}

export interface DemoContract {
  id: string;
  project_id: string;
  title: string;
  from_org: string;
  to_org: string;
  contract_value: number;
  status: string;
}

export interface DemoSOVItem {
  id: string;
  project_id: string;
  code: string;
  title: string;
  scheduled_value: number;
  billed_to_date: number;
  retainage: number;
}

export interface DemoAttentionItem {
  id: string;
  project_id: string;
  type: 'work_order' | 'purchase_order' | 'invoice' | 'rfi';
  title: string;
  description: string;
  urgency: 'high' | 'medium';
  role_visibility: DemoRole[];
}

export interface DemoTeamMember {
  id: string;
  name: string;
  role: DemoRole;
  email: string;
  org_name: string;
}

// ────────── 3 Sample Projects ──────────

export const DEMO_PROJECTS: DemoProject[] = [
  {
    id: 'demo-proj-1',
    name: 'Maple Ridge Custom Home',
    description: 'New construction 4BR custom home with detached ADU',
    status: 'active',
    project_type: 'residential',
    build_type: 'new_construction',
    address: { street: '1234 Maple Ridge Dr', city: 'Austin', state: 'TX', zip: '78701' },
    retainage_percent: 10,
    organization_id: 'demo-org-gc',
    created_at: '2025-12-01T00:00:00Z',
    mobilization_enabled: true,
    structures: [{ id: 's1', name: 'Main House', type: 'main' }],
    parties: [],
    city: 'Austin',
    state: 'TX',
    zip: '78701',
  },
  {
    id: 'demo-proj-2',
    name: 'Downtown Office Renovation',
    description: 'Full gut renovation of 3-story Class A office space',
    status: 'active',
    project_type: 'commercial',
    build_type: 'renovation',
    address: { street: '500 Congress Ave', city: 'Austin', state: 'TX', zip: '78701' },
    retainage_percent: 5,
    organization_id: 'demo-org-gc',
    created_at: '2025-11-15T00:00:00Z',
    mobilization_enabled: false,
    structures: [],
    parties: [],
    city: 'Austin',
    state: 'TX',
    zip: '78701',
  },
  {
    id: 'demo-proj-3',
    name: 'Lakefront Townhomes Phase 2',
    description: 'Mixed-use development with 12 townhome units',
    status: 'active',
    project_type: 'mixed_use',
    build_type: 'new_construction',
    address: { street: '800 Lake Austin Blvd', city: 'Austin', state: 'TX', zip: '78703' },
    retainage_percent: 10,
    organization_id: 'demo-org-gc',
    created_at: '2025-10-01T00:00:00Z',
    mobilization_enabled: true,
    structures: [],
    parties: [],
    city: 'Austin',
    state: 'TX',
    zip: '78703',
  },
];

// ────────── Work Orders (2 per project) ──────────

export const DEMO_WORK_ORDERS: DemoWorkOrder[] = [
  { id: 'demo-wo-1a', project_id: 'demo-proj-1', title: 'Foundation Framing', description: 'Frame slab and footer forms', status: 'draft', pricing_mode: 'fixed', work_type: 'framing', created_at: '2025-12-10T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-1b', project_id: 'demo-proj-1', title: 'Rough Electrical', description: 'Run romex and install boxes per plan', status: 'active', pricing_mode: 'tm', work_type: 'electrical', created_at: '2025-12-12T00:00:00Z', final_price: 8500, labor_total: 5200, material_total: 3300 },
  { id: 'demo-wo-2a', project_id: 'demo-proj-2', title: 'Demo Interior Walls', description: 'Demo all non-structural interior walls floors 1-3', status: 'draft', pricing_mode: 'fixed', work_type: 'demolition', created_at: '2025-11-20T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-2b', project_id: 'demo-proj-2', title: 'HVAC Rough-In', description: 'Install ductwork and line sets', status: 'active', pricing_mode: 'fixed', work_type: 'hvac', created_at: '2025-11-22T00:00:00Z', final_price: 24000, labor_total: 14000, material_total: 10000 },
  { id: 'demo-wo-3a', project_id: 'demo-proj-3', title: 'Siding Install Units 1-6', description: 'Install Hardie panel siding', status: 'draft', pricing_mode: 'fixed', work_type: 'exterior', created_at: '2025-10-15T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-3b', project_id: 'demo-proj-3', title: 'Plumbing Top-Out', description: 'Complete rough plumbing top-out', status: 'active', pricing_mode: 'tm', work_type: 'plumbing', created_at: '2025-10-18T00:00:00Z', final_price: 18200, labor_total: 11000, material_total: 7200 },
];

// ────────── Purchase Orders ──────────

export const DEMO_PURCHASE_ORDERS: DemoPurchaseOrder[] = [
  { id: 'demo-po-1', project_id: 'demo-proj-1', po_number: 'PO-2025-001', supplier_name: 'Austin Lumber Co', status: 'draft', total_amount: 12450, created_at: '2025-12-11T00:00:00Z', items_count: 8 },
  { id: 'demo-po-2', project_id: 'demo-proj-2', po_number: 'PO-2025-002', supplier_name: 'Metro Electric Supply', status: 'priced', total_amount: 8900, created_at: '2025-11-21T00:00:00Z', items_count: 14 },
  { id: 'demo-po-3', project_id: 'demo-proj-3', po_number: 'PO-2025-003', supplier_name: 'Hardie Building Products', status: 'draft', total_amount: 31200, created_at: '2025-10-16T00:00:00Z', items_count: 6 },
];

// ────────── Invoices ──────────

export const DEMO_INVOICES: DemoInvoice[] = [
  { id: 'demo-inv-1a', project_id: 'demo-proj-1', invoice_number: 'INV-001', status: 'submitted', total_amount: 15000, billing_period_start: '2025-12-01', billing_period_end: '2025-12-31', created_at: '2026-01-02T00:00:00Z' },
  { id: 'demo-inv-1b', project_id: 'demo-proj-1', invoice_number: 'INV-002', status: 'draft', total_amount: 8500, billing_period_start: '2026-01-01', billing_period_end: '2026-01-31', created_at: '2026-02-01T00:00:00Z' },
  { id: 'demo-inv-2a', project_id: 'demo-proj-2', invoice_number: 'INV-003', status: 'approved', total_amount: 45000, billing_period_start: '2025-11-01', billing_period_end: '2025-11-30', created_at: '2025-12-01T00:00:00Z' },
  { id: 'demo-inv-2b', project_id: 'demo-proj-2', invoice_number: 'INV-004', status: 'submitted', total_amount: 32000, billing_period_start: '2025-12-01', billing_period_end: '2025-12-31', created_at: '2026-01-02T00:00:00Z' },
  { id: 'demo-inv-3a', project_id: 'demo-proj-3', invoice_number: 'INV-005', status: 'paid', total_amount: 62000, billing_period_start: '2025-10-01', billing_period_end: '2025-10-31', created_at: '2025-11-01T00:00:00Z' },
  { id: 'demo-inv-3b', project_id: 'demo-proj-3', invoice_number: 'INV-006', status: 'draft', total_amount: 28000, billing_period_start: '2025-11-01', billing_period_end: '2025-11-30', created_at: '2025-12-02T00:00:00Z' },
];

// ────────── Contracts ──────────

export const DEMO_CONTRACTS: DemoContract[] = [
  { id: 'demo-c-1', project_id: 'demo-proj-1', title: 'GC–TC Framing Contract', from_org: 'Summit Builders (GC)', to_org: 'Peak Framing (TC)', contract_value: 185000, status: 'executed' },
  { id: 'demo-c-2', project_id: 'demo-proj-2', title: 'GC–TC Mechanical Contract', from_org: 'Summit Builders (GC)', to_org: 'CoolAir HVAC (TC)', contract_value: 320000, status: 'executed' },
  { id: 'demo-c-3', project_id: 'demo-proj-3', title: 'GC–TC Exterior Package', from_org: 'Summit Builders (GC)', to_org: 'AllSide Exteriors (TC)', contract_value: 412000, status: 'approved' },
];

// ────────── SOV Items ──────────

export const DEMO_SOV_ITEMS: DemoSOVItem[] = [
  { id: 'demo-sov-1a', project_id: 'demo-proj-1', code: '01', title: 'General Conditions', scheduled_value: 18500, billed_to_date: 9250, retainage: 925 },
  { id: 'demo-sov-1b', project_id: 'demo-proj-1', code: '03', title: 'Concrete / Foundation', scheduled_value: 42000, billed_to_date: 42000, retainage: 4200 },
  { id: 'demo-sov-1c', project_id: 'demo-proj-1', code: '06', title: 'Wood & Plastics', scheduled_value: 68000, billed_to_date: 15000, retainage: 1500 },
  { id: 'demo-sov-1d', project_id: 'demo-proj-1', code: '16', title: 'Electrical', scheduled_value: 35000, billed_to_date: 8500, retainage: 850 },
  { id: 'demo-sov-2a', project_id: 'demo-proj-2', code: '02', title: 'Demolition', scheduled_value: 55000, billed_to_date: 55000, retainage: 2750 },
  { id: 'demo-sov-2b', project_id: 'demo-proj-2', code: '15', title: 'Mechanical / HVAC', scheduled_value: 120000, billed_to_date: 45000, retainage: 2250 },
  { id: 'demo-sov-3a', project_id: 'demo-proj-3', code: '07', title: 'Thermal & Moisture', scheduled_value: 98000, billed_to_date: 62000, retainage: 6200 },
  { id: 'demo-sov-3b', project_id: 'demo-proj-3', code: '15', title: 'Plumbing', scheduled_value: 145000, billed_to_date: 18200, retainage: 1820 },
];

// ────────── Attention Items ──────────

export const DEMO_ATTENTION_ITEMS: DemoAttentionItem[] = [
  { id: 'att-1', project_id: 'demo-proj-1', type: 'work_order', title: 'Foundation Framing WO needs pricing', description: 'Draft work order awaiting cost entry', urgency: 'high', role_visibility: ['GC', 'TC'] },
  { id: 'att-2', project_id: 'demo-proj-1', type: 'invoice', title: 'Invoice INV-001 awaiting approval', description: 'Submitted 3 days ago — no action taken', urgency: 'high', role_visibility: ['GC'] },
  { id: 'att-3', project_id: 'demo-proj-1', type: 'purchase_order', title: 'PO-2025-001 not yet sent to supplier', description: 'Lumber order drafted but unsent', urgency: 'medium', role_visibility: ['GC', 'TC', 'SUPPLIER'] },
  { id: 'att-4', project_id: 'demo-proj-2', type: 'work_order', title: 'Demo WO missing assignment', description: 'No field crew assigned', urgency: 'high', role_visibility: ['GC', 'TC'] },
  { id: 'att-5', project_id: 'demo-proj-2', type: 'invoice', title: 'Invoice INV-004 submitted — review needed', description: 'December billing submitted by TC', urgency: 'high', role_visibility: ['GC'] },
  { id: 'att-6', project_id: 'demo-proj-2', type: 'purchase_order', title: 'PO-2025-002 priced — ready for approval', description: 'Supplier has entered pricing', urgency: 'medium', role_visibility: ['GC', 'TC', 'SUPPLIER'] },
  { id: 'att-7', project_id: 'demo-proj-3', type: 'work_order', title: 'Siding WO needs scope finalized', description: 'Draft — scope description incomplete', urgency: 'high', role_visibility: ['GC', 'TC', 'FC'] },
  { id: 'att-8', project_id: 'demo-proj-3', type: 'invoice', title: 'Invoice INV-006 still in draft', description: 'November billing not yet submitted', urgency: 'medium', role_visibility: ['TC', 'FC'] },
  { id: 'att-9', project_id: 'demo-proj-3', type: 'rfi', title: 'Open RFI: Siding color clarification', description: 'Architect response pending', urgency: 'high', role_visibility: ['GC', 'TC', 'FC'] },
];

// ────────── Team Members ──────────

export const DEMO_TEAM: DemoTeamMember[] = [
  { id: 'tm-1', name: 'Alex Rivera', role: 'GC', email: 'alex@summitbuilders.com', org_name: 'Summit Builders' },
  { id: 'tm-2', name: 'Jordan Lee', role: 'TC', email: 'jordan@peakframing.com', org_name: 'Peak Framing' },
  { id: 'tm-3', name: 'Sam Torres', role: 'FC', email: 'sam@fieldcrew.com', org_name: 'Torres Field Crew' },
  { id: 'tm-4', name: 'Casey Nguyen', role: 'SUPPLIER', email: 'casey@austinlumber.com', org_name: 'Austin Lumber Co' },
];

// ────────── Helpers ──────────

export function getDemoProjectById(id: string) {
  return DEMO_PROJECTS.find(p => p.id === id) || null;
}

export function getDemoDataForProject(projectId: string, role: DemoRole) {
  const attentionItems = DEMO_ATTENTION_ITEMS.filter(
    a => a.project_id === projectId && a.role_visibility.includes(role)
  );
  const workOrders = DEMO_WORK_ORDERS.filter(wo => wo.project_id === projectId);
  const purchaseOrders = DEMO_PURCHASE_ORDERS.filter(po => po.project_id === projectId);
  const invoices = DEMO_INVOICES.filter(inv => inv.project_id === projectId);
  const contracts = DEMO_CONTRACTS.filter(c => c.project_id === projectId);
  const sovItems = DEMO_SOV_ITEMS.filter(s => s.project_id === projectId);

  return { attentionItems, workOrders, purchaseOrders, invoices, contracts, sovItems };
}

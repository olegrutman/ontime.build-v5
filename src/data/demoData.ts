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

export interface DemoPOLineItem {
  id: string;
  po_id: string;
  description: string;
  quantity: number;
  uom: string;
  unit_price: number;
}

export interface DemoRFI {
  id: string;
  project_id: string;
  rfi_number: string;
  subject: string;
  question: string;
  status: 'open' | 'answered' | 'closed';
  priority: 'high' | 'medium' | 'low';
  created_by: string;
  assigned_to: string;
  created_at: string;
  answered_at: string | null;
}

export interface DemoInvoiceLineItem {
  id: string;
  invoice_id: string;
  sov_code: string;
  description: string;
  scheduled_value: number;
  previous_billed: number;
  current_billed: number;
  retainage_percent: number;
}

export interface DemoWorkOrderDetail {
  id: string;
  location: string;
  work_type_label: string;
  checklist: { label: string; done: boolean }[];
}

// ════════════════════════════════════════════════════════
// 10 PROJECTS
// ════════════════════════════════════════════════════════

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
    city: 'Austin', state: 'TX', zip: '78701',
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
    city: 'Austin', state: 'TX', zip: '78701',
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
    city: 'Austin', state: 'TX', zip: '78703',
  },
  {
    id: 'demo-proj-4',
    name: 'Riverside Medical Center',
    description: '48,000 SF outpatient medical facility with surgery suites',
    status: 'active',
    project_type: 'institutional',
    build_type: 'new_construction',
    address: { street: '2100 Riverside Pkwy', city: 'Dallas', state: 'TX', zip: '75201' },
    retainage_percent: 10,
    organization_id: 'demo-org-gc',
    created_at: '2025-09-01T00:00:00Z',
    mobilization_enabled: true,
    structures: [{ id: 's4a', name: 'Main Building', type: 'main' }, { id: 's4b', name: 'Parking Garage', type: 'auxiliary' }],
    parties: [],
    city: 'Dallas', state: 'TX', zip: '75201',
  },
  {
    id: 'demo-proj-5',
    name: 'Cedar Park Elementary Expansion',
    description: '12-classroom addition and cafeteria renovation',
    status: 'active',
    project_type: 'institutional',
    build_type: 'renovation',
    address: { street: '450 Discovery Blvd', city: 'Cedar Park', state: 'TX', zip: '78613' },
    retainage_percent: 10,
    organization_id: 'demo-org-gc',
    created_at: '2025-08-15T00:00:00Z',
    mobilization_enabled: false,
    structures: [{ id: 's5a', name: 'New Wing', type: 'addition' }],
    parties: [],
    city: 'Cedar Park', state: 'TX', zip: '78613',
  },
  {
    id: 'demo-proj-6',
    name: 'Westlake Hills Estate',
    description: 'Luxury 7BR estate home with pool house and guest quarters',
    status: 'active',
    project_type: 'residential',
    build_type: 'new_construction',
    address: { street: '3200 Redbud Trail', city: 'Westlake Hills', state: 'TX', zip: '78746' },
    retainage_percent: 10,
    organization_id: 'demo-org-gc',
    created_at: '2025-10-15T00:00:00Z',
    mobilization_enabled: true,
    structures: [{ id: 's6a', name: 'Main Residence', type: 'main' }, { id: 's6b', name: 'Pool House', type: 'auxiliary' }, { id: 's6c', name: 'Guest Quarters', type: 'auxiliary' }],
    parties: [],
    city: 'Westlake Hills', state: 'TX', zip: '78746',
  },
  {
    id: 'demo-proj-7',
    name: 'East Side Brewery & Taproom',
    description: 'Adaptive reuse of warehouse into craft brewery with taproom',
    status: 'active',
    project_type: 'commercial',
    build_type: 'renovation',
    address: { street: '1800 E 6th St', city: 'Austin', state: 'TX', zip: '78702' },
    retainage_percent: 5,
    organization_id: 'demo-org-gc',
    created_at: '2025-11-01T00:00:00Z',
    mobilization_enabled: false,
    structures: [],
    parties: [],
    city: 'Austin', state: 'TX', zip: '78702',
  },
  {
    id: 'demo-proj-8',
    name: 'South Congress Retail Center',
    description: '22,000 SF multi-tenant retail strip center',
    status: 'active',
    project_type: 'commercial',
    build_type: 'new_construction',
    address: { street: '4500 S Congress Ave', city: 'Austin', state: 'TX', zip: '78745' },
    retainage_percent: 5,
    organization_id: 'demo-org-gc',
    created_at: '2025-09-15T00:00:00Z',
    mobilization_enabled: true,
    structures: [],
    parties: [],
    city: 'Austin', state: 'TX', zip: '78745',
  },
  {
    id: 'demo-proj-9',
    name: 'Mueller Mixed-Use Block 7',
    description: '5-story mixed-use with ground-floor retail and 80 residential units',
    status: 'active',
    project_type: 'mixed_use',
    build_type: 'new_construction',
    address: { street: '1900 Aldrich St', city: 'Austin', state: 'TX', zip: '78723' },
    retainage_percent: 10,
    organization_id: 'demo-org-gc',
    created_at: '2025-07-01T00:00:00Z',
    mobilization_enabled: true,
    structures: [{ id: 's9a', name: 'Tower A', type: 'main' }, { id: 's9b', name: 'Podium Retail', type: 'retail' }],
    parties: [],
    city: 'Austin', state: 'TX', zip: '78723',
  },
  {
    id: 'demo-proj-10',
    name: 'Pflugerville Distribution Hub',
    description: '120,000 SF tilt-wall distribution warehouse with dock-high loading',
    status: 'active',
    project_type: 'industrial',
    build_type: 'new_construction',
    address: { street: '15000 Tech Ridge Blvd', city: 'Pflugerville', state: 'TX', zip: '78660' },
    retainage_percent: 5,
    organization_id: 'demo-org-gc',
    created_at: '2025-08-01T00:00:00Z',
    mobilization_enabled: true,
    structures: [],
    parties: [],
    city: 'Pflugerville', state: 'TX', zip: '78660',
  },
];

// ════════════════════════════════════════════════════════
// WORK ORDERS (~100 total, 8-12 per project)
// ════════════════════════════════════════════════════════

export const DEMO_WORK_ORDERS: DemoWorkOrder[] = [
  // ── Project 1: Maple Ridge Custom Home ──
  { id: 'demo-wo-1a', project_id: 'demo-proj-1', title: 'Foundation Framing', description: 'Frame slab and footer forms', status: 'draft', pricing_mode: 'fixed', work_type: 'framing', created_at: '2025-12-10T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-1b', project_id: 'demo-proj-1', title: 'Rough Electrical', description: 'Run romex and install boxes per plan', status: 'active', pricing_mode: 'tm', work_type: 'electrical', created_at: '2025-12-12T00:00:00Z', final_price: 8500, labor_total: 5200, material_total: 3300 },
  { id: 'demo-wo-1c', project_id: 'demo-proj-1', title: 'Rough Plumbing', description: 'Install DWV and water supply lines', status: 'active', pricing_mode: 'fixed', work_type: 'plumbing', created_at: '2025-12-14T00:00:00Z', final_price: 12800, labor_total: 8400, material_total: 4400 },
  { id: 'demo-wo-1d', project_id: 'demo-proj-1', title: 'HVAC Rough-In', description: 'Install ductwork and refrigerant lines', status: 'draft', pricing_mode: 'fixed', work_type: 'hvac', created_at: '2025-12-16T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-1e', project_id: 'demo-proj-1', title: 'Roof Framing', description: 'Frame roof trusses and install sheathing', status: 'active', pricing_mode: 'fixed', work_type: 'framing', created_at: '2025-12-18T00:00:00Z', final_price: 22000, labor_total: 14000, material_total: 8000 },
  { id: 'demo-wo-1f', project_id: 'demo-proj-1', title: 'Insulation Install', description: 'Blown-in and batt insulation all levels', status: 'draft', pricing_mode: 'fixed', work_type: 'insulation', created_at: '2025-12-20T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-1g', project_id: 'demo-proj-1', title: 'Drywall Hang & Finish', description: 'Hang and finish drywall throughout', status: 'draft', pricing_mode: 'tm', work_type: 'drywall', created_at: '2025-12-22T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-1h', project_id: 'demo-proj-1', title: 'Exterior Siding', description: 'Install LP SmartSide siding and trim', status: 'draft', pricing_mode: 'fixed', work_type: 'exterior', created_at: '2025-12-24T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-1i', project_id: 'demo-proj-1', title: 'Interior Paint', description: 'Prime and paint all interior surfaces', status: 'draft', pricing_mode: 'fixed', work_type: 'painting', created_at: '2025-12-26T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-1j', project_id: 'demo-proj-1', title: 'Hardwood Flooring', description: 'Install 5" white oak hardwood Level 1 & 2', status: 'draft', pricing_mode: 'fixed', work_type: 'flooring', created_at: '2025-12-28T00:00:00Z', final_price: null, labor_total: null, material_total: null },

  // ── Project 2: Downtown Office Renovation ──
  { id: 'demo-wo-2a', project_id: 'demo-proj-2', title: 'Demo Interior Walls', description: 'Demo all non-structural interior walls floors 1-3', status: 'completed', pricing_mode: 'fixed', work_type: 'demolition', created_at: '2025-11-20T00:00:00Z', final_price: 18500, labor_total: 15000, material_total: 3500 },
  { id: 'demo-wo-2b', project_id: 'demo-proj-2', title: 'HVAC Rough-In', description: 'Install ductwork and line sets', status: 'active', pricing_mode: 'fixed', work_type: 'hvac', created_at: '2025-11-22T00:00:00Z', final_price: 24000, labor_total: 14000, material_total: 10000 },
  { id: 'demo-wo-2c', project_id: 'demo-proj-2', title: 'Electrical Rough-In Floors 1-2', description: 'New branch circuits and panel upgrades', status: 'active', pricing_mode: 'tm', work_type: 'electrical', created_at: '2025-11-25T00:00:00Z', final_price: 32000, labor_total: 20000, material_total: 12000 },
  { id: 'demo-wo-2d', project_id: 'demo-proj-2', title: 'Fire Sprinkler Modification', description: 'Relocate and add sprinkler heads per new layout', status: 'active', pricing_mode: 'fixed', work_type: 'fire_protection', created_at: '2025-11-28T00:00:00Z', final_price: 14200, labor_total: 9800, material_total: 4400 },
  { id: 'demo-wo-2e', project_id: 'demo-proj-2', title: 'Metal Stud Framing', description: 'Frame new partition walls all floors', status: 'active', pricing_mode: 'fixed', work_type: 'framing', created_at: '2025-12-01T00:00:00Z', final_price: 28000, labor_total: 18000, material_total: 10000 },
  { id: 'demo-wo-2f', project_id: 'demo-proj-2', title: 'Drywall & Acoustic Ceiling', description: 'Install drywall and acoustic tile ceiling system', status: 'draft', pricing_mode: 'fixed', work_type: 'drywall', created_at: '2025-12-05T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-2g', project_id: 'demo-proj-2', title: 'Flooring Install', description: 'LVP in common areas, carpet tile in offices', status: 'draft', pricing_mode: 'fixed', work_type: 'flooring', created_at: '2025-12-08T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-2h', project_id: 'demo-proj-2', title: 'Restroom Renovation', description: 'Complete gut and rebuild of 6 restrooms', status: 'active', pricing_mode: 'tm', work_type: 'plumbing', created_at: '2025-12-10T00:00:00Z', final_price: 45000, labor_total: 28000, material_total: 17000 },
  { id: 'demo-wo-2i', project_id: 'demo-proj-2', title: 'Elevator Modernization', description: 'Cab refurbishment and controller upgrade', status: 'draft', pricing_mode: 'fixed', work_type: 'elevator', created_at: '2025-12-12T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-2j', project_id: 'demo-proj-2', title: 'Lobby Finish-Out', description: 'Stone accent wall, millwork, and lighting', status: 'draft', pricing_mode: 'fixed', work_type: 'finishes', created_at: '2025-12-15T00:00:00Z', final_price: null, labor_total: null, material_total: null },

  // ── Project 3: Lakefront Townhomes Phase 2 ──
  { id: 'demo-wo-3a', project_id: 'demo-proj-3', title: 'Siding Install Units 1-6', description: 'Install Hardie panel siding', status: 'active', pricing_mode: 'fixed', work_type: 'exterior', created_at: '2025-10-15T00:00:00Z', final_price: 48000, labor_total: 28000, material_total: 20000 },
  { id: 'demo-wo-3b', project_id: 'demo-proj-3', title: 'Plumbing Top-Out', description: 'Complete rough plumbing top-out all units', status: 'active', pricing_mode: 'tm', work_type: 'plumbing', created_at: '2025-10-18T00:00:00Z', final_price: 18200, labor_total: 11000, material_total: 7200 },
  { id: 'demo-wo-3c', project_id: 'demo-proj-3', title: 'Electrical Rough Units 7-12', description: 'Wire units 7 through 12 per plan', status: 'active', pricing_mode: 'tm', work_type: 'electrical', created_at: '2025-10-22T00:00:00Z', final_price: 26400, labor_total: 16800, material_total: 9600 },
  { id: 'demo-wo-3d', project_id: 'demo-proj-3', title: 'Framing Units 7-12', description: 'Wood frame construction all units phase 2', status: 'completed', pricing_mode: 'fixed', work_type: 'framing', created_at: '2025-10-08T00:00:00Z', final_price: 86000, labor_total: 52000, material_total: 34000 },
  { id: 'demo-wo-3e', project_id: 'demo-proj-3', title: 'Roofing All Units', description: 'Install architectural shingles 12 units', status: 'active', pricing_mode: 'fixed', work_type: 'roofing', created_at: '2025-10-25T00:00:00Z', final_price: 62000, labor_total: 34000, material_total: 28000 },
  { id: 'demo-wo-3f', project_id: 'demo-proj-3', title: 'HVAC Install Units 1-6', description: 'Set condensers and install line sets', status: 'active', pricing_mode: 'fixed', work_type: 'hvac', created_at: '2025-10-28T00:00:00Z', final_price: 38000, labor_total: 22000, material_total: 16000 },
  { id: 'demo-wo-3g', project_id: 'demo-proj-3', title: 'Concrete Flatwork', description: 'Driveways, walkways, and patios all units', status: 'draft', pricing_mode: 'fixed', work_type: 'concrete', created_at: '2025-11-01T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-3h', project_id: 'demo-proj-3', title: 'Interior Paint Units 1-6', description: 'Prime and two-coat finish all interiors', status: 'draft', pricing_mode: 'fixed', work_type: 'painting', created_at: '2025-11-05T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-3i', project_id: 'demo-proj-3', title: 'Landscaping & Irrigation', description: 'Common area landscaping and drip irrigation', status: 'draft', pricing_mode: 'fixed', work_type: 'sitework', created_at: '2025-11-10T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-3j', project_id: 'demo-proj-3', title: 'Garage Doors & Openers', description: 'Install insulated garage doors 12 units', status: 'draft', pricing_mode: 'fixed', work_type: 'doors', created_at: '2025-11-12T00:00:00Z', final_price: null, labor_total: null, material_total: null },

  // ── Project 4: Riverside Medical Center ──
  { id: 'demo-wo-4a', project_id: 'demo-proj-4', title: 'Structural Steel Erection', description: 'Erect structural steel frame and decking', status: 'completed', pricing_mode: 'fixed', work_type: 'steel', created_at: '2025-09-10T00:00:00Z', final_price: 485000, labor_total: 285000, material_total: 200000 },
  { id: 'demo-wo-4b', project_id: 'demo-proj-4', title: 'Concrete Foundations', description: 'Pour spread footings and grade beams', status: 'completed', pricing_mode: 'fixed', work_type: 'concrete', created_at: '2025-09-05T00:00:00Z', final_price: 220000, labor_total: 135000, material_total: 85000 },
  { id: 'demo-wo-4c', project_id: 'demo-proj-4', title: 'MEP Rough-In', description: 'Mechanical, electrical, plumbing rough-in all floors', status: 'active', pricing_mode: 'tm', work_type: 'mechanical', created_at: '2025-09-20T00:00:00Z', final_price: 380000, labor_total: 240000, material_total: 140000 },
  { id: 'demo-wo-4d', project_id: 'demo-proj-4', title: 'Medical Gas Piping', description: 'Install O2, N2O, vacuum, and air piping', status: 'active', pricing_mode: 'fixed', work_type: 'plumbing', created_at: '2025-09-25T00:00:00Z', final_price: 95000, labor_total: 62000, material_total: 33000 },
  { id: 'demo-wo-4e', project_id: 'demo-proj-4', title: 'Fire Protection Sprinklers', description: 'Full building fire sprinkler system', status: 'active', pricing_mode: 'fixed', work_type: 'fire_protection', created_at: '2025-10-01T00:00:00Z', final_price: 128000, labor_total: 78000, material_total: 50000 },
  { id: 'demo-wo-4f', project_id: 'demo-proj-4', title: 'Curtain Wall Install', description: 'Aluminum curtain wall and storefront glazing', status: 'active', pricing_mode: 'fixed', work_type: 'glazing', created_at: '2025-10-05T00:00:00Z', final_price: 210000, labor_total: 120000, material_total: 90000 },
  { id: 'demo-wo-4g', project_id: 'demo-proj-4', title: 'Elevator Installation', description: 'Install 2 passenger elevators and 1 freight', status: 'draft', pricing_mode: 'fixed', work_type: 'elevator', created_at: '2025-10-10T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-4h', project_id: 'demo-proj-4', title: 'Roofing & Waterproofing', description: 'TPO roofing membrane and below-grade waterproofing', status: 'active', pricing_mode: 'fixed', work_type: 'roofing', created_at: '2025-10-15T00:00:00Z', final_price: 165000, labor_total: 95000, material_total: 70000 },
  { id: 'demo-wo-4i', project_id: 'demo-proj-4', title: 'Interior Framing & Drywall', description: 'Metal stud framing and drywall all patient areas', status: 'draft', pricing_mode: 'fixed', work_type: 'framing', created_at: '2025-10-20T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-4j', project_id: 'demo-proj-4', title: 'Parking Garage Concrete', description: 'Cast-in-place concrete 3-level parking structure', status: 'active', pricing_mode: 'fixed', work_type: 'concrete', created_at: '2025-10-25T00:00:00Z', final_price: 340000, labor_total: 210000, material_total: 130000 },
  { id: 'demo-wo-4k', project_id: 'demo-proj-4', title: 'Emergency Generator Install', description: 'Install 500kW diesel generator and ATS', status: 'draft', pricing_mode: 'fixed', work_type: 'electrical', created_at: '2025-11-01T00:00:00Z', final_price: null, labor_total: null, material_total: null },

  // ── Project 5: Cedar Park Elementary ──
  { id: 'demo-wo-5a', project_id: 'demo-proj-5', title: 'Selective Demo', description: 'Demo existing cafeteria interior and exterior wall section', status: 'completed', pricing_mode: 'fixed', work_type: 'demolition', created_at: '2025-08-20T00:00:00Z', final_price: 24000, labor_total: 19000, material_total: 5000 },
  { id: 'demo-wo-5b', project_id: 'demo-proj-5', title: 'Foundation & Slab', description: 'New addition slab on grade with thickened edges', status: 'completed', pricing_mode: 'fixed', work_type: 'concrete', created_at: '2025-08-25T00:00:00Z', final_price: 68000, labor_total: 42000, material_total: 26000 },
  { id: 'demo-wo-5c', project_id: 'demo-proj-5', title: 'Steel Framing Addition', description: 'Light gauge steel framing 12 classrooms', status: 'active', pricing_mode: 'fixed', work_type: 'steel', created_at: '2025-09-05T00:00:00Z', final_price: 145000, labor_total: 88000, material_total: 57000 },
  { id: 'demo-wo-5d', project_id: 'demo-proj-5', title: 'Plumbing Rough-In', description: 'New restrooms and classroom sinks', status: 'active', pricing_mode: 'tm', work_type: 'plumbing', created_at: '2025-09-10T00:00:00Z', final_price: 42000, labor_total: 28000, material_total: 14000 },
  { id: 'demo-wo-5e', project_id: 'demo-proj-5', title: 'HVAC New Classrooms', description: 'RTU installation and ductwork for addition', status: 'active', pricing_mode: 'fixed', work_type: 'hvac', created_at: '2025-09-15T00:00:00Z', final_price: 86000, labor_total: 52000, material_total: 34000 },
  { id: 'demo-wo-5f', project_id: 'demo-proj-5', title: 'Electrical Distribution', description: 'New panels and circuits for addition', status: 'active', pricing_mode: 'tm', work_type: 'electrical', created_at: '2025-09-20T00:00:00Z', final_price: 58000, labor_total: 36000, material_total: 22000 },
  { id: 'demo-wo-5g', project_id: 'demo-proj-5', title: 'Roofing New Addition', description: 'Standing seam metal roof on addition', status: 'draft', pricing_mode: 'fixed', work_type: 'roofing', created_at: '2025-09-25T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-5h', project_id: 'demo-proj-5', title: 'Cafeteria Kitchen Equipment', description: 'Install commercial kitchen equipment and hood', status: 'draft', pricing_mode: 'fixed', work_type: 'equipment', created_at: '2025-10-01T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-5i', project_id: 'demo-proj-5', title: 'Fire Alarm System', description: 'New fire alarm for addition, tie into existing', status: 'active', pricing_mode: 'fixed', work_type: 'fire_protection', created_at: '2025-10-05T00:00:00Z', final_price: 28000, labor_total: 18000, material_total: 10000 },

  // ── Project 6: Westlake Hills Estate ──
  { id: 'demo-wo-6a', project_id: 'demo-proj-6', title: 'Foundation & Retaining Walls', description: 'Pier and beam foundation with limestone retaining walls', status: 'completed', pricing_mode: 'fixed', work_type: 'concrete', created_at: '2025-10-20T00:00:00Z', final_price: 185000, labor_total: 110000, material_total: 75000 },
  { id: 'demo-wo-6b', project_id: 'demo-proj-6', title: 'Structural Framing', description: 'Heavy timber and engineered lumber framing', status: 'active', pricing_mode: 'fixed', work_type: 'framing', created_at: '2025-10-28T00:00:00Z', final_price: 245000, labor_total: 145000, material_total: 100000 },
  { id: 'demo-wo-6c', project_id: 'demo-proj-6', title: 'Plumbing Rough-In', description: 'PEX repipe, radiant floor, and pool plumbing', status: 'active', pricing_mode: 'tm', work_type: 'plumbing', created_at: '2025-11-05T00:00:00Z', final_price: 68000, labor_total: 42000, material_total: 26000 },
  { id: 'demo-wo-6d', project_id: 'demo-proj-6', title: 'Electrical & Smart Home', description: 'High-amp service, smart home prewire, and lighting control', status: 'active', pricing_mode: 'tm', work_type: 'electrical', created_at: '2025-11-08T00:00:00Z', final_price: 92000, labor_total: 58000, material_total: 34000 },
  { id: 'demo-wo-6e', project_id: 'demo-proj-6', title: 'HVAC Zoned System', description: 'Multi-zone VRF system with dedicated wine room unit', status: 'draft', pricing_mode: 'fixed', work_type: 'hvac', created_at: '2025-11-12T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-6f', project_id: 'demo-proj-6', title: 'Stone Masonry Exterior', description: 'Texas limestone veneer and natural stone accents', status: 'draft', pricing_mode: 'fixed', work_type: 'masonry', created_at: '2025-11-15T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-6g', project_id: 'demo-proj-6', title: 'Pool & Outdoor Kitchen', description: 'Infinity edge pool, spa, and outdoor kitchen build', status: 'draft', pricing_mode: 'fixed', work_type: 'specialty', created_at: '2025-11-18T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-6h', project_id: 'demo-proj-6', title: 'Custom Millwork', description: 'Built-in cabinetry, library shelving, wine storage', status: 'draft', pricing_mode: 'fixed', work_type: 'millwork', created_at: '2025-11-22T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-6i', project_id: 'demo-proj-6', title: 'Standing Seam Metal Roof', description: 'Copper-patina standing seam roof all structures', status: 'active', pricing_mode: 'fixed', work_type: 'roofing', created_at: '2025-11-25T00:00:00Z', final_price: 125000, labor_total: 72000, material_total: 53000 },
  { id: 'demo-wo-6j', project_id: 'demo-proj-6', title: 'Tile & Stone Bathrooms', description: 'Custom tile in 8 bathrooms with heated floors', status: 'draft', pricing_mode: 'fixed', work_type: 'tile', created_at: '2025-11-28T00:00:00Z', final_price: null, labor_total: null, material_total: null },

  // ── Project 7: East Side Brewery ──
  { id: 'demo-wo-7a', project_id: 'demo-proj-7', title: 'Structural Reinforcement', description: 'Add steel beams and columns for mezzanine', status: 'completed', pricing_mode: 'fixed', work_type: 'steel', created_at: '2025-11-05T00:00:00Z', final_price: 42000, labor_total: 28000, material_total: 14000 },
  { id: 'demo-wo-7b', project_id: 'demo-proj-7', title: 'Plumbing for Brewing Equipment', description: 'Install glycol lines, floor drains, and process piping', status: 'active', pricing_mode: 'tm', work_type: 'plumbing', created_at: '2025-11-10T00:00:00Z', final_price: 35000, labor_total: 22000, material_total: 13000 },
  { id: 'demo-wo-7c', project_id: 'demo-proj-7', title: 'Electrical 3-Phase Upgrade', description: 'New 400A 3-phase service for brewing equipment', status: 'active', pricing_mode: 'fixed', work_type: 'electrical', created_at: '2025-11-12T00:00:00Z', final_price: 28000, labor_total: 18000, material_total: 10000 },
  { id: 'demo-wo-7d', project_id: 'demo-proj-7', title: 'HVAC & Ventilation', description: 'Taproom HVAC and brewery ventilation/exhaust', status: 'active', pricing_mode: 'fixed', work_type: 'hvac', created_at: '2025-11-15T00:00:00Z', final_price: 52000, labor_total: 32000, material_total: 20000 },
  { id: 'demo-wo-7e', project_id: 'demo-proj-7', title: 'Concrete Floor Polish', description: 'Grind and polish existing warehouse slab', status: 'draft', pricing_mode: 'fixed', work_type: 'concrete', created_at: '2025-11-18T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-7f', project_id: 'demo-proj-7', title: 'Taproom Build-Out', description: 'Bar construction, millwork, and finishes', status: 'draft', pricing_mode: 'fixed', work_type: 'finishes', created_at: '2025-11-20T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-7g', project_id: 'demo-proj-7', title: 'Walk-In Cooler Install', description: 'Build walk-in cooler and keg storage', status: 'draft', pricing_mode: 'fixed', work_type: 'refrigeration', created_at: '2025-11-22T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-7h', project_id: 'demo-proj-7', title: 'ADA Restroom Build', description: 'Construct 2 ADA-compliant restrooms', status: 'active', pricing_mode: 'fixed', work_type: 'plumbing', created_at: '2025-11-25T00:00:00Z', final_price: 18000, labor_total: 12000, material_total: 6000 },

  // ── Project 8: South Congress Retail Center ──
  { id: 'demo-wo-8a', project_id: 'demo-proj-8', title: 'Site Grading & Utilities', description: 'Mass grading and underground utility installation', status: 'completed', pricing_mode: 'fixed', work_type: 'sitework', created_at: '2025-09-20T00:00:00Z', final_price: 95000, labor_total: 62000, material_total: 33000 },
  { id: 'demo-wo-8b', project_id: 'demo-proj-8', title: 'Concrete Slab & Foundation', description: 'Monolithic slab pour with turn-down footings', status: 'completed', pricing_mode: 'fixed', work_type: 'concrete', created_at: '2025-09-28T00:00:00Z', final_price: 78000, labor_total: 48000, material_total: 30000 },
  { id: 'demo-wo-8c', project_id: 'demo-proj-8', title: 'Tilt-Wall Panel Erection', description: 'Cast and erect 32 tilt-wall panels', status: 'active', pricing_mode: 'fixed', work_type: 'concrete', created_at: '2025-10-05T00:00:00Z', final_price: 145000, labor_total: 85000, material_total: 60000 },
  { id: 'demo-wo-8d', project_id: 'demo-proj-8', title: 'Structural Steel & Joists', description: 'Bar joists and steel connections for roof structure', status: 'active', pricing_mode: 'fixed', work_type: 'steel', created_at: '2025-10-12T00:00:00Z', final_price: 68000, labor_total: 42000, material_total: 26000 },
  { id: 'demo-wo-8e', project_id: 'demo-proj-8', title: 'Roofing', description: 'TPO single-ply membrane roof system', status: 'active', pricing_mode: 'fixed', work_type: 'roofing', created_at: '2025-10-18T00:00:00Z', final_price: 52000, labor_total: 30000, material_total: 22000 },
  { id: 'demo-wo-8f', project_id: 'demo-proj-8', title: 'MEP Shell Rough-In', description: 'Stub-outs and main distribution for tenant spaces', status: 'active', pricing_mode: 'tm', work_type: 'mechanical', created_at: '2025-10-22T00:00:00Z', final_price: 88000, labor_total: 55000, material_total: 33000 },
  { id: 'demo-wo-8g', project_id: 'demo-proj-8', title: 'Storefront Glazing', description: 'Aluminum storefront systems for 8 tenant bays', status: 'draft', pricing_mode: 'fixed', work_type: 'glazing', created_at: '2025-10-28T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-8h', project_id: 'demo-proj-8', title: 'Parking Lot & Striping', description: 'Asphalt paving, striping, and ADA compliance', status: 'draft', pricing_mode: 'fixed', work_type: 'sitework', created_at: '2025-11-02T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-8i', project_id: 'demo-proj-8', title: 'Fire Sprinkler System', description: 'NFPA 13 sprinkler system entire building', status: 'active', pricing_mode: 'fixed', work_type: 'fire_protection', created_at: '2025-11-05T00:00:00Z', final_price: 42000, labor_total: 26000, material_total: 16000 },

  // ── Project 9: Mueller Mixed-Use Block 7 ──
  { id: 'demo-wo-9a', project_id: 'demo-proj-9', title: 'Deep Foundation Piers', description: 'Drilled piers to 40ft for 5-story structure', status: 'completed', pricing_mode: 'fixed', work_type: 'concrete', created_at: '2025-07-10T00:00:00Z', final_price: 320000, labor_total: 195000, material_total: 125000 },
  { id: 'demo-wo-9b', project_id: 'demo-proj-9', title: 'Post-Tension Slab Levels 1-3', description: 'PT slab pour podium and levels 1-3', status: 'completed', pricing_mode: 'fixed', work_type: 'concrete', created_at: '2025-07-25T00:00:00Z', final_price: 480000, labor_total: 290000, material_total: 190000 },
  { id: 'demo-wo-9c', project_id: 'demo-proj-9', title: 'Wood Framing Levels 4-5', description: '5-over-1 wood frame upper residential floors', status: 'active', pricing_mode: 'fixed', work_type: 'framing', created_at: '2025-08-15T00:00:00Z', final_price: 385000, labor_total: 235000, material_total: 150000 },
  { id: 'demo-wo-9d', project_id: 'demo-proj-9', title: 'MEP Rough-In All Floors', description: 'Full mechanical/electrical/plumbing rough-in', status: 'active', pricing_mode: 'tm', work_type: 'mechanical', created_at: '2025-08-28T00:00:00Z', final_price: 520000, labor_total: 320000, material_total: 200000 },
  { id: 'demo-wo-9e', project_id: 'demo-proj-9', title: 'Elevator Installation', description: '2 traction passenger elevators', status: 'active', pricing_mode: 'fixed', work_type: 'elevator', created_at: '2025-09-05T00:00:00Z', final_price: 185000, labor_total: 110000, material_total: 75000 },
  { id: 'demo-wo-9f', project_id: 'demo-proj-9', title: 'Exterior Envelope', description: 'Fiber cement panels, brick veneer, and windows', status: 'active', pricing_mode: 'fixed', work_type: 'exterior', created_at: '2025-09-15T00:00:00Z', final_price: 295000, labor_total: 175000, material_total: 120000 },
  { id: 'demo-wo-9g', project_id: 'demo-proj-9', title: 'Fire Protection System', description: 'NFPA 13R sprinkler system all floors', status: 'active', pricing_mode: 'fixed', work_type: 'fire_protection', created_at: '2025-09-20T00:00:00Z', final_price: 142000, labor_total: 88000, material_total: 54000 },
  { id: 'demo-wo-9h', project_id: 'demo-proj-9', title: 'Retail Shell Build-Out', description: 'Ground floor retail spaces rough-in and demising walls', status: 'draft', pricing_mode: 'fixed', work_type: 'framing', created_at: '2025-09-28T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-9i', project_id: 'demo-proj-9', title: 'Roofing & Waterproofing', description: 'TPO roof and podium deck waterproofing', status: 'draft', pricing_mode: 'fixed', work_type: 'roofing', created_at: '2025-10-02T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-9j', project_id: 'demo-proj-9', title: 'Parking Garage Finishes', description: 'Striping, signage, and MEP in garage levels', status: 'draft', pricing_mode: 'fixed', work_type: 'finishes', created_at: '2025-10-08T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-9k', project_id: 'demo-proj-9', title: 'Unit Interior Finishes', description: 'Drywall, paint, flooring, and fixtures 80 units', status: 'draft', pricing_mode: 'tm', work_type: 'finishes', created_at: '2025-10-15T00:00:00Z', final_price: null, labor_total: null, material_total: null },

  // ── Project 10: Pflugerville Distribution Hub ──
  { id: 'demo-wo-10a', project_id: 'demo-proj-10', title: 'Mass Grading & Paving', description: 'Grade 12-acre site and install storm drainage', status: 'completed', pricing_mode: 'fixed', work_type: 'sitework', created_at: '2025-08-05T00:00:00Z', final_price: 185000, labor_total: 115000, material_total: 70000 },
  { id: 'demo-wo-10b', project_id: 'demo-proj-10', title: 'Slab on Grade', description: 'Pour 120,000 SF warehouse slab with fiber mesh', status: 'completed', pricing_mode: 'fixed', work_type: 'concrete', created_at: '2025-08-15T00:00:00Z', final_price: 280000, labor_total: 170000, material_total: 110000 },
  { id: 'demo-wo-10c', project_id: 'demo-proj-10', title: 'Tilt-Wall Panels', description: 'Cast and erect 48 tilt-wall panels', status: 'active', pricing_mode: 'fixed', work_type: 'concrete', created_at: '2025-08-28T00:00:00Z', final_price: 320000, labor_total: 190000, material_total: 130000 },
  { id: 'demo-wo-10d', project_id: 'demo-proj-10', title: 'Structural Steel & Joists', description: 'Bar joists and purlins for roof structure', status: 'active', pricing_mode: 'fixed', work_type: 'steel', created_at: '2025-09-08T00:00:00Z', final_price: 195000, labor_total: 120000, material_total: 75000 },
  { id: 'demo-wo-10e', project_id: 'demo-proj-10', title: 'Metal Roof Deck & Roofing', description: 'Install metal deck and TPO roofing', status: 'active', pricing_mode: 'fixed', work_type: 'roofing', created_at: '2025-09-15T00:00:00Z', final_price: 145000, labor_total: 85000, material_total: 60000 },
  { id: 'demo-wo-10f', project_id: 'demo-proj-10', title: 'Dock Equipment & Doors', description: 'Install 20 dock levelers, bumpers, and overhead doors', status: 'draft', pricing_mode: 'fixed', work_type: 'equipment', created_at: '2025-09-22T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-10g', project_id: 'demo-proj-10', title: 'Electrical Distribution', description: 'Main switchgear, panels, and warehouse lighting', status: 'active', pricing_mode: 'tm', work_type: 'electrical', created_at: '2025-09-28T00:00:00Z', final_price: 125000, labor_total: 78000, material_total: 47000 },
  { id: 'demo-wo-10h', project_id: 'demo-proj-10', title: 'Fire Sprinkler ESFR', description: 'ESFR sprinkler system for high-pile storage', status: 'active', pricing_mode: 'fixed', work_type: 'fire_protection', created_at: '2025-10-02T00:00:00Z', final_price: 165000, labor_total: 98000, material_total: 67000 },
  { id: 'demo-wo-10i', project_id: 'demo-proj-10', title: 'Office Build-Out', description: '5,000 SF office space within warehouse', status: 'draft', pricing_mode: 'fixed', work_type: 'finishes', created_at: '2025-10-08T00:00:00Z', final_price: null, labor_total: null, material_total: null },
  { id: 'demo-wo-10j', project_id: 'demo-proj-10', title: 'Truck Court & Parking', description: 'Concrete truck court and asphalt parking lot', status: 'draft', pricing_mode: 'fixed', work_type: 'sitework', created_at: '2025-10-15T00:00:00Z', final_price: null, labor_total: null, material_total: null },
];

// ════════════════════════════════════════════════════════
// PURCHASE ORDERS (~40 total, 3-5 per project)
// ════════════════════════════════════════════════════════

export const DEMO_PURCHASE_ORDERS: DemoPurchaseOrder[] = [
  // Project 1
  { id: 'demo-po-1a', project_id: 'demo-proj-1', po_number: 'PO-2025-001', supplier_name: 'Austin Lumber Co', status: 'draft', total_amount: 12450, created_at: '2025-12-11T00:00:00Z', items_count: 8 },
  { id: 'demo-po-1b', project_id: 'demo-proj-1', po_number: 'PO-2025-002', supplier_name: 'Metro Electric Supply', status: 'priced', total_amount: 6200, created_at: '2025-12-13T00:00:00Z', items_count: 12 },
  { id: 'demo-po-1c', project_id: 'demo-proj-1', po_number: 'PO-2025-003', supplier_name: 'Texas Plumbing Wholesale', status: 'draft', total_amount: 8800, created_at: '2025-12-15T00:00:00Z', items_count: 9 },
  { id: 'demo-po-1d', project_id: 'demo-proj-1', po_number: 'PO-2025-004', supplier_name: 'Lone Star Insulation', status: 'approved', total_amount: 4500, created_at: '2025-12-21T00:00:00Z', items_count: 4 },
  // Project 2
  { id: 'demo-po-2a', project_id: 'demo-proj-2', po_number: 'PO-2025-005', supplier_name: 'Metro Electric Supply', status: 'priced', total_amount: 8900, created_at: '2025-11-21T00:00:00Z', items_count: 14 },
  { id: 'demo-po-2b', project_id: 'demo-proj-2', po_number: 'PO-2025-006', supplier_name: 'CoolAir HVAC Supply', status: 'approved', total_amount: 18500, created_at: '2025-11-23T00:00:00Z', items_count: 10 },
  { id: 'demo-po-2c', project_id: 'demo-proj-2', po_number: 'PO-2025-007', supplier_name: 'Commercial Tile & Stone', status: 'draft', total_amount: 14200, created_at: '2025-12-06T00:00:00Z', items_count: 8 },
  { id: 'demo-po-2d', project_id: 'demo-proj-2', po_number: 'PO-2025-008', supplier_name: 'Delta Drywall Supply', status: 'draft', total_amount: 9800, created_at: '2025-12-07T00:00:00Z', items_count: 6 },
  // Project 3
  { id: 'demo-po-3a', project_id: 'demo-proj-3', po_number: 'PO-2025-009', supplier_name: 'Hardie Building Products', status: 'approved', total_amount: 31200, created_at: '2025-10-16T00:00:00Z', items_count: 6 },
  { id: 'demo-po-3b', project_id: 'demo-proj-3', po_number: 'PO-2025-010', supplier_name: 'ABC Roofing Supply', status: 'priced', total_amount: 22400, created_at: '2025-10-26T00:00:00Z', items_count: 8 },
  { id: 'demo-po-3c', project_id: 'demo-proj-3', po_number: 'PO-2025-011', supplier_name: 'CoolAir HVAC Supply', status: 'draft', total_amount: 16000, created_at: '2025-10-29T00:00:00Z', items_count: 7 },
  { id: 'demo-po-3d', project_id: 'demo-proj-3', po_number: 'PO-2025-012', supplier_name: 'Austin Lumber Co', status: 'approved', total_amount: 42000, created_at: '2025-10-09T00:00:00Z', items_count: 15 },
  // Project 4
  { id: 'demo-po-4a', project_id: 'demo-proj-4', po_number: 'PO-2025-013', supplier_name: 'Lone Star Steel', status: 'approved', total_amount: 195000, created_at: '2025-09-08T00:00:00Z', items_count: 18 },
  { id: 'demo-po-4b', project_id: 'demo-proj-4', po_number: 'PO-2025-014', supplier_name: 'MedGas Systems Inc', status: 'priced', total_amount: 42000, created_at: '2025-09-26T00:00:00Z', items_count: 12 },
  { id: 'demo-po-4c', project_id: 'demo-proj-4', po_number: 'PO-2025-015', supplier_name: 'Glazing Concepts', status: 'draft', total_amount: 88000, created_at: '2025-10-06T00:00:00Z', items_count: 9 },
  { id: 'demo-po-4d', project_id: 'demo-proj-4', po_number: 'PO-2025-016', supplier_name: 'Metro Electric Supply', status: 'approved', total_amount: 62000, created_at: '2025-09-22T00:00:00Z', items_count: 22 },
  // Project 5
  { id: 'demo-po-5a', project_id: 'demo-proj-5', po_number: 'PO-2025-017', supplier_name: 'Vulcraft Steel Joists', status: 'approved', total_amount: 48000, created_at: '2025-09-03T00:00:00Z', items_count: 8 },
  { id: 'demo-po-5b', project_id: 'demo-proj-5', po_number: 'PO-2025-018', supplier_name: 'Trane HVAC', status: 'priced', total_amount: 34000, created_at: '2025-09-16T00:00:00Z', items_count: 6 },
  { id: 'demo-po-5c', project_id: 'demo-proj-5', po_number: 'PO-2025-019', supplier_name: 'Commercial Kitchen Direct', status: 'draft', total_amount: 58000, created_at: '2025-10-02T00:00:00Z', items_count: 11 },
  // Project 6
  { id: 'demo-po-6a', project_id: 'demo-proj-6', po_number: 'PO-2025-020', supplier_name: 'Hill Country Stone', status: 'approved', total_amount: 72000, created_at: '2025-10-22T00:00:00Z', items_count: 5 },
  { id: 'demo-po-6b', project_id: 'demo-proj-6', po_number: 'PO-2025-021', supplier_name: 'Austin Lumber Co', status: 'approved', total_amount: 95000, created_at: '2025-10-30T00:00:00Z', items_count: 20 },
  { id: 'demo-po-6c', project_id: 'demo-proj-6', po_number: 'PO-2025-022', supplier_name: 'Lutron Electronics', status: 'priced', total_amount: 28000, created_at: '2025-11-09T00:00:00Z', items_count: 15 },
  { id: 'demo-po-6d', project_id: 'demo-proj-6', po_number: 'PO-2025-023', supplier_name: 'ABC Roofing Supply', status: 'draft', total_amount: 48000, created_at: '2025-11-26T00:00:00Z', items_count: 7 },
  // Project 7
  { id: 'demo-po-7a', project_id: 'demo-proj-7', po_number: 'PO-2025-024', supplier_name: 'Lone Star Steel', status: 'approved', total_amount: 14000, created_at: '2025-11-06T00:00:00Z', items_count: 4 },
  { id: 'demo-po-7b', project_id: 'demo-proj-7', po_number: 'PO-2025-025', supplier_name: 'BrewTech Equipment', status: 'priced', total_amount: 85000, created_at: '2025-11-11T00:00:00Z', items_count: 8 },
  { id: 'demo-po-7c', project_id: 'demo-proj-7', po_number: 'PO-2025-026', supplier_name: 'Metro Electric Supply', status: 'draft', total_amount: 10500, created_at: '2025-11-13T00:00:00Z', items_count: 9 },
  // Project 8
  { id: 'demo-po-8a', project_id: 'demo-proj-8', po_number: 'PO-2025-027', supplier_name: 'Texas Concrete Supply', status: 'approved', total_amount: 58000, created_at: '2025-09-26T00:00:00Z', items_count: 5 },
  { id: 'demo-po-8b', project_id: 'demo-proj-8', po_number: 'PO-2025-028', supplier_name: 'Lone Star Steel', status: 'approved', total_amount: 26000, created_at: '2025-10-10T00:00:00Z', items_count: 6 },
  { id: 'demo-po-8c', project_id: 'demo-proj-8', po_number: 'PO-2025-029', supplier_name: 'Kawneer Storefront', status: 'draft', total_amount: 45000, created_at: '2025-10-29T00:00:00Z', items_count: 8 },
  { id: 'demo-po-8d', project_id: 'demo-proj-8', po_number: 'PO-2025-030', supplier_name: 'ABC Roofing Supply', status: 'priced', total_amount: 18500, created_at: '2025-10-19T00:00:00Z', items_count: 5 },
  // Project 9
  { id: 'demo-po-9a', project_id: 'demo-proj-9', po_number: 'PO-2025-031', supplier_name: 'Texas Concrete Supply', status: 'approved', total_amount: 185000, created_at: '2025-07-08T00:00:00Z', items_count: 12 },
  { id: 'demo-po-9b', project_id: 'demo-proj-9', po_number: 'PO-2025-032', supplier_name: 'Austin Lumber Co', status: 'approved', total_amount: 142000, created_at: '2025-08-12T00:00:00Z', items_count: 25 },
  { id: 'demo-po-9c', project_id: 'demo-proj-9', po_number: 'PO-2025-033', supplier_name: 'Nichiha Fiber Cement', status: 'priced', total_amount: 95000, created_at: '2025-09-12T00:00:00Z', items_count: 8 },
  { id: 'demo-po-9d', project_id: 'demo-proj-9', po_number: 'PO-2025-034', supplier_name: 'Metro Electric Supply', status: 'draft', total_amount: 78000, created_at: '2025-08-30T00:00:00Z', items_count: 18 },
  { id: 'demo-po-9e', project_id: 'demo-proj-9', po_number: 'PO-2025-035', supplier_name: 'ThyssenKrupp Elevator', status: 'approved', total_amount: 72000, created_at: '2025-09-06T00:00:00Z', items_count: 3 },
  // Project 10
  { id: 'demo-po-10a', project_id: 'demo-proj-10', po_number: 'PO-2025-036', supplier_name: 'Texas Concrete Supply', status: 'approved', total_amount: 105000, created_at: '2025-08-12T00:00:00Z', items_count: 8 },
  { id: 'demo-po-10b', project_id: 'demo-proj-10', po_number: 'PO-2025-037', supplier_name: 'Lone Star Steel', status: 'approved', total_amount: 72000, created_at: '2025-09-06T00:00:00Z', items_count: 10 },
  { id: 'demo-po-10c', project_id: 'demo-proj-10', po_number: 'PO-2025-038', supplier_name: 'Rite-Hite Dock Equipment', status: 'priced', total_amount: 95000, created_at: '2025-09-23T00:00:00Z', items_count: 20 },
  { id: 'demo-po-10d', project_id: 'demo-proj-10', po_number: 'PO-2025-039', supplier_name: 'ABC Roofing Supply', status: 'draft', total_amount: 55000, created_at: '2025-09-16T00:00:00Z', items_count: 6 },
];

// ════════════════════════════════════════════════════════
// INVOICES (~60 total, 5-8 per project)
// ════════════════════════════════════════════════════════

export const DEMO_INVOICES: DemoInvoice[] = [
  // Project 1
  { id: 'demo-inv-1a', project_id: 'demo-proj-1', invoice_number: 'INV-001', status: 'submitted', total_amount: 15000, billing_period_start: '2025-12-01', billing_period_end: '2025-12-31', created_at: '2026-01-02T00:00:00Z' },
  { id: 'demo-inv-1b', project_id: 'demo-proj-1', invoice_number: 'INV-002', status: 'draft', total_amount: 8500, billing_period_start: '2026-01-01', billing_period_end: '2026-01-31', created_at: '2026-02-01T00:00:00Z' },
  { id: 'demo-inv-1c', project_id: 'demo-proj-1', invoice_number: 'INV-003', status: 'approved', total_amount: 22000, billing_period_start: '2025-12-15', billing_period_end: '2026-01-15', created_at: '2026-01-18T00:00:00Z' },
  { id: 'demo-inv-1d', project_id: 'demo-proj-1', invoice_number: 'INV-004', status: 'draft', total_amount: 12800, billing_period_start: '2026-01-15', billing_period_end: '2026-02-15', created_at: '2026-02-18T00:00:00Z' },
  { id: 'demo-inv-1e', project_id: 'demo-proj-1', invoice_number: 'INV-005', status: 'paid', total_amount: 42000, billing_period_start: '2025-12-01', billing_period_end: '2025-12-31', created_at: '2026-01-05T00:00:00Z' },
  // Project 2
  { id: 'demo-inv-2a', project_id: 'demo-proj-2', invoice_number: 'INV-006', status: 'approved', total_amount: 45000, billing_period_start: '2025-11-01', billing_period_end: '2025-11-30', created_at: '2025-12-01T00:00:00Z' },
  { id: 'demo-inv-2b', project_id: 'demo-proj-2', invoice_number: 'INV-007', status: 'submitted', total_amount: 32000, billing_period_start: '2025-12-01', billing_period_end: '2025-12-31', created_at: '2026-01-02T00:00:00Z' },
  { id: 'demo-inv-2c', project_id: 'demo-proj-2', invoice_number: 'INV-008', status: 'paid', total_amount: 18500, billing_period_start: '2025-11-20', billing_period_end: '2025-12-20', created_at: '2025-12-22T00:00:00Z' },
  { id: 'demo-inv-2d', project_id: 'demo-proj-2', invoice_number: 'INV-009', status: 'draft', total_amount: 28000, billing_period_start: '2026-01-01', billing_period_end: '2026-01-31', created_at: '2026-02-02T00:00:00Z' },
  { id: 'demo-inv-2e', project_id: 'demo-proj-2', invoice_number: 'INV-010', status: 'submitted', total_amount: 14200, billing_period_start: '2025-11-28', billing_period_end: '2025-12-28', created_at: '2025-12-30T00:00:00Z' },
  { id: 'demo-inv-2f', project_id: 'demo-proj-2', invoice_number: 'INV-011', status: 'draft', total_amount: 45000, billing_period_start: '2026-01-15', billing_period_end: '2026-02-15', created_at: '2026-02-18T00:00:00Z' },
  // Project 3
  { id: 'demo-inv-3a', project_id: 'demo-proj-3', invoice_number: 'INV-012', status: 'paid', total_amount: 62000, billing_period_start: '2025-10-01', billing_period_end: '2025-10-31', created_at: '2025-11-01T00:00:00Z' },
  { id: 'demo-inv-3b', project_id: 'demo-proj-3', invoice_number: 'INV-013', status: 'draft', total_amount: 28000, billing_period_start: '2025-11-01', billing_period_end: '2025-11-30', created_at: '2025-12-02T00:00:00Z' },
  { id: 'demo-inv-3c', project_id: 'demo-proj-3', invoice_number: 'INV-014', status: 'approved', total_amount: 86000, billing_period_start: '2025-10-08', billing_period_end: '2025-11-08', created_at: '2025-11-10T00:00:00Z' },
  { id: 'demo-inv-3d', project_id: 'demo-proj-3', invoice_number: 'INV-015', status: 'submitted', total_amount: 48000, billing_period_start: '2025-11-15', billing_period_end: '2025-12-15', created_at: '2025-12-18T00:00:00Z' },
  { id: 'demo-inv-3e', project_id: 'demo-proj-3', invoice_number: 'INV-016', status: 'paid', total_amount: 38000, billing_period_start: '2025-10-28', billing_period_end: '2025-11-28', created_at: '2025-12-01T00:00:00Z' },
  { id: 'demo-inv-3f', project_id: 'demo-proj-3', invoice_number: 'INV-017', status: 'draft', total_amount: 26400, billing_period_start: '2025-12-01', billing_period_end: '2025-12-31', created_at: '2026-01-02T00:00:00Z' },
  // Project 4
  { id: 'demo-inv-4a', project_id: 'demo-proj-4', invoice_number: 'INV-018', status: 'paid', total_amount: 220000, billing_period_start: '2025-09-01', billing_period_end: '2025-09-30', created_at: '2025-10-02T00:00:00Z' },
  { id: 'demo-inv-4b', project_id: 'demo-proj-4', invoice_number: 'INV-019', status: 'paid', total_amount: 485000, billing_period_start: '2025-09-10', billing_period_end: '2025-10-10', created_at: '2025-10-12T00:00:00Z' },
  { id: 'demo-inv-4c', project_id: 'demo-proj-4', invoice_number: 'INV-020', status: 'approved', total_amount: 380000, billing_period_start: '2025-10-01', billing_period_end: '2025-10-31', created_at: '2025-11-02T00:00:00Z' },
  { id: 'demo-inv-4d', project_id: 'demo-proj-4', invoice_number: 'INV-021', status: 'submitted', total_amount: 210000, billing_period_start: '2025-10-05', billing_period_end: '2025-11-05', created_at: '2025-11-08T00:00:00Z' },
  { id: 'demo-inv-4e', project_id: 'demo-proj-4', invoice_number: 'INV-022', status: 'submitted', total_amount: 165000, billing_period_start: '2025-10-15', billing_period_end: '2025-11-15', created_at: '2025-11-18T00:00:00Z' },
  { id: 'demo-inv-4f', project_id: 'demo-proj-4', invoice_number: 'INV-023', status: 'draft', total_amount: 340000, billing_period_start: '2025-11-01', billing_period_end: '2025-11-30', created_at: '2025-12-02T00:00:00Z' },
  { id: 'demo-inv-4g', project_id: 'demo-proj-4', invoice_number: 'INV-024', status: 'draft', total_amount: 128000, billing_period_start: '2025-11-15', billing_period_end: '2025-12-15', created_at: '2025-12-18T00:00:00Z' },
  // Project 5
  { id: 'demo-inv-5a', project_id: 'demo-proj-5', invoice_number: 'INV-025', status: 'paid', total_amount: 24000, billing_period_start: '2025-08-15', billing_period_end: '2025-09-15', created_at: '2025-09-18T00:00:00Z' },
  { id: 'demo-inv-5b', project_id: 'demo-proj-5', invoice_number: 'INV-026', status: 'paid', total_amount: 68000, billing_period_start: '2025-08-25', billing_period_end: '2025-09-25', created_at: '2025-09-28T00:00:00Z' },
  { id: 'demo-inv-5c', project_id: 'demo-proj-5', invoice_number: 'INV-027', status: 'approved', total_amount: 145000, billing_period_start: '2025-09-05', billing_period_end: '2025-10-05', created_at: '2025-10-08T00:00:00Z' },
  { id: 'demo-inv-5d', project_id: 'demo-proj-5', invoice_number: 'INV-028', status: 'submitted', total_amount: 86000, billing_period_start: '2025-10-01', billing_period_end: '2025-10-31', created_at: '2025-11-02T00:00:00Z' },
  { id: 'demo-inv-5e', project_id: 'demo-proj-5', invoice_number: 'INV-029', status: 'draft', total_amount: 42000, billing_period_start: '2025-10-15', billing_period_end: '2025-11-15', created_at: '2025-11-18T00:00:00Z' },
  // Project 6
  { id: 'demo-inv-6a', project_id: 'demo-proj-6', invoice_number: 'INV-030', status: 'paid', total_amount: 185000, billing_period_start: '2025-10-15', billing_period_end: '2025-11-15', created_at: '2025-11-18T00:00:00Z' },
  { id: 'demo-inv-6b', project_id: 'demo-proj-6', invoice_number: 'INV-031', status: 'approved', total_amount: 245000, billing_period_start: '2025-10-28', billing_period_end: '2025-11-28', created_at: '2025-12-01T00:00:00Z' },
  { id: 'demo-inv-6c', project_id: 'demo-proj-6', invoice_number: 'INV-032', status: 'submitted', total_amount: 68000, billing_period_start: '2025-11-05', billing_period_end: '2025-12-05', created_at: '2025-12-08T00:00:00Z' },
  { id: 'demo-inv-6d', project_id: 'demo-proj-6', invoice_number: 'INV-033', status: 'submitted', total_amount: 92000, billing_period_start: '2025-11-08', billing_period_end: '2025-12-08', created_at: '2025-12-11T00:00:00Z' },
  { id: 'demo-inv-6e', project_id: 'demo-proj-6', invoice_number: 'INV-034', status: 'draft', total_amount: 125000, billing_period_start: '2025-11-25', billing_period_end: '2025-12-25', created_at: '2025-12-28T00:00:00Z' },
  { id: 'demo-inv-6f', project_id: 'demo-proj-6', invoice_number: 'INV-035', status: 'draft', total_amount: 72000, billing_period_start: '2025-12-01', billing_period_end: '2025-12-31', created_at: '2026-01-03T00:00:00Z' },
  // Project 7
  { id: 'demo-inv-7a', project_id: 'demo-proj-7', invoice_number: 'INV-036', status: 'paid', total_amount: 42000, billing_period_start: '2025-11-01', billing_period_end: '2025-11-30', created_at: '2025-12-02T00:00:00Z' },
  { id: 'demo-inv-7b', project_id: 'demo-proj-7', invoice_number: 'INV-037', status: 'approved', total_amount: 35000, billing_period_start: '2025-11-10', billing_period_end: '2025-12-10', created_at: '2025-12-12T00:00:00Z' },
  { id: 'demo-inv-7c', project_id: 'demo-proj-7', invoice_number: 'INV-038', status: 'submitted', total_amount: 52000, billing_period_start: '2025-11-15', billing_period_end: '2025-12-15', created_at: '2025-12-18T00:00:00Z' },
  { id: 'demo-inv-7d', project_id: 'demo-proj-7', invoice_number: 'INV-039', status: 'draft', total_amount: 28000, billing_period_start: '2025-12-01', billing_period_end: '2025-12-31', created_at: '2026-01-02T00:00:00Z' },
  { id: 'demo-inv-7e', project_id: 'demo-proj-7', invoice_number: 'INV-040', status: 'draft', total_amount: 18000, billing_period_start: '2025-12-15', billing_period_end: '2026-01-15', created_at: '2026-01-18T00:00:00Z' },
  // Project 8
  { id: 'demo-inv-8a', project_id: 'demo-proj-8', invoice_number: 'INV-041', status: 'paid', total_amount: 95000, billing_period_start: '2025-09-15', billing_period_end: '2025-10-15', created_at: '2025-10-18T00:00:00Z' },
  { id: 'demo-inv-8b', project_id: 'demo-proj-8', invoice_number: 'INV-042', status: 'paid', total_amount: 78000, billing_period_start: '2025-09-28', billing_period_end: '2025-10-28', created_at: '2025-10-30T00:00:00Z' },
  { id: 'demo-inv-8c', project_id: 'demo-proj-8', invoice_number: 'INV-043', status: 'approved', total_amount: 145000, billing_period_start: '2025-10-05', billing_period_end: '2025-11-05', created_at: '2025-11-08T00:00:00Z' },
  { id: 'demo-inv-8d', project_id: 'demo-proj-8', invoice_number: 'INV-044', status: 'submitted', total_amount: 88000, billing_period_start: '2025-10-22', billing_period_end: '2025-11-22', created_at: '2025-11-25T00:00:00Z' },
  { id: 'demo-inv-8e', project_id: 'demo-proj-8', invoice_number: 'INV-045', status: 'submitted', total_amount: 52000, billing_period_start: '2025-10-18', billing_period_end: '2025-11-18', created_at: '2025-11-20T00:00:00Z' },
  { id: 'demo-inv-8f', project_id: 'demo-proj-8', invoice_number: 'INV-046', status: 'draft', total_amount: 42000, billing_period_start: '2025-11-05', billing_period_end: '2025-12-05', created_at: '2025-12-08T00:00:00Z' },
  // Project 9
  { id: 'demo-inv-9a', project_id: 'demo-proj-9', invoice_number: 'INV-047', status: 'paid', total_amount: 320000, billing_period_start: '2025-07-01', billing_period_end: '2025-07-31', created_at: '2025-08-02T00:00:00Z' },
  { id: 'demo-inv-9b', project_id: 'demo-proj-9', invoice_number: 'INV-048', status: 'paid', total_amount: 480000, billing_period_start: '2025-07-25', billing_period_end: '2025-08-25', created_at: '2025-08-28T00:00:00Z' },
  { id: 'demo-inv-9c', project_id: 'demo-proj-9', invoice_number: 'INV-049', status: 'approved', total_amount: 385000, billing_period_start: '2025-08-15', billing_period_end: '2025-09-15', created_at: '2025-09-18T00:00:00Z' },
  { id: 'demo-inv-9d', project_id: 'demo-proj-9', invoice_number: 'INV-050', status: 'submitted', total_amount: 520000, billing_period_start: '2025-09-01', billing_period_end: '2025-09-30', created_at: '2025-10-02T00:00:00Z' },
  { id: 'demo-inv-9e', project_id: 'demo-proj-9', invoice_number: 'INV-051', status: 'submitted', total_amount: 295000, billing_period_start: '2025-09-15', billing_period_end: '2025-10-15', created_at: '2025-10-18T00:00:00Z' },
  { id: 'demo-inv-9f', project_id: 'demo-proj-9', invoice_number: 'INV-052', status: 'approved', total_amount: 185000, billing_period_start: '2025-09-05', billing_period_end: '2025-10-05', created_at: '2025-10-08T00:00:00Z' },
  { id: 'demo-inv-9g', project_id: 'demo-proj-9', invoice_number: 'INV-053', status: 'draft', total_amount: 142000, billing_period_start: '2025-10-01', billing_period_end: '2025-10-31', created_at: '2025-11-02T00:00:00Z' },
  { id: 'demo-inv-9h', project_id: 'demo-proj-9', invoice_number: 'INV-054', status: 'draft', total_amount: 250000, billing_period_start: '2025-10-15', billing_period_end: '2025-11-15', created_at: '2025-11-18T00:00:00Z' },
  // Project 10
  { id: 'demo-inv-10a', project_id: 'demo-proj-10', invoice_number: 'INV-055', status: 'paid', total_amount: 185000, billing_period_start: '2025-08-01', billing_period_end: '2025-08-31', created_at: '2025-09-02T00:00:00Z' },
  { id: 'demo-inv-10b', project_id: 'demo-proj-10', invoice_number: 'INV-056', status: 'paid', total_amount: 280000, billing_period_start: '2025-08-15', billing_period_end: '2025-09-15', created_at: '2025-09-18T00:00:00Z' },
  { id: 'demo-inv-10c', project_id: 'demo-proj-10', invoice_number: 'INV-057', status: 'approved', total_amount: 320000, billing_period_start: '2025-08-28', billing_period_end: '2025-09-28', created_at: '2025-10-01T00:00:00Z' },
  { id: 'demo-inv-10d', project_id: 'demo-proj-10', invoice_number: 'INV-058', status: 'submitted', total_amount: 195000, billing_period_start: '2025-09-08', billing_period_end: '2025-10-08', created_at: '2025-10-10T00:00:00Z' },
  { id: 'demo-inv-10e', project_id: 'demo-proj-10', invoice_number: 'INV-059', status: 'submitted', total_amount: 145000, billing_period_start: '2025-09-15', billing_period_end: '2025-10-15', created_at: '2025-10-18T00:00:00Z' },
  { id: 'demo-inv-10f', project_id: 'demo-proj-10', invoice_number: 'INV-060', status: 'draft', total_amount: 125000, billing_period_start: '2025-10-01', billing_period_end: '2025-10-31', created_at: '2025-11-02T00:00:00Z' },
];

// ════════════════════════════════════════════════════════
// CONTRACTS (~15 total)
// ════════════════════════════════════════════════════════

export const DEMO_CONTRACTS: DemoContract[] = [
  { id: 'demo-c-1', project_id: 'demo-proj-1', title: 'GC–TC Framing Contract', from_org: 'Summit Builders (GC)', to_org: 'Peak Framing (TC)', contract_value: 185000, status: 'executed' },
  { id: 'demo-c-2', project_id: 'demo-proj-2', title: 'GC–TC Mechanical Contract', from_org: 'Summit Builders (GC)', to_org: 'CoolAir HVAC (TC)', contract_value: 320000, status: 'executed' },
  { id: 'demo-c-3', project_id: 'demo-proj-3', title: 'GC–TC Exterior Package', from_org: 'Summit Builders (GC)', to_org: 'AllSide Exteriors (TC)', contract_value: 412000, status: 'approved' },
  { id: 'demo-c-4', project_id: 'demo-proj-4', title: 'GC–TC Steel Erection', from_org: 'Summit Builders (GC)', to_org: 'Ironwork Pros (TC)', contract_value: 680000, status: 'executed' },
  { id: 'demo-c-4b', project_id: 'demo-proj-4', title: 'GC–TC MEP Package', from_org: 'Summit Builders (GC)', to_org: 'MedBuild Mechanical (TC)', contract_value: 890000, status: 'executed' },
  { id: 'demo-c-5', project_id: 'demo-proj-5', title: 'GC–TC General Trades', from_org: 'Summit Builders (GC)', to_org: 'Scholastic Builders (TC)', contract_value: 520000, status: 'executed' },
  { id: 'demo-c-6', project_id: 'demo-proj-6', title: 'GC–TC Luxury Build Package', from_org: 'Summit Builders (GC)', to_org: 'Prestige Custom Homes (TC)', contract_value: 1250000, status: 'executed' },
  { id: 'demo-c-6b', project_id: 'demo-proj-6', title: 'GC–TC Stone & Masonry', from_org: 'Summit Builders (GC)', to_org: 'Hill Country Masons (TC)', contract_value: 185000, status: 'approved' },
  { id: 'demo-c-7', project_id: 'demo-proj-7', title: 'GC–TC Brewery Build-Out', from_org: 'Summit Builders (GC)', to_org: 'ATX Commercial (TC)', contract_value: 380000, status: 'executed' },
  { id: 'demo-c-8', project_id: 'demo-proj-8', title: 'GC–TC Shell Construction', from_org: 'Summit Builders (GC)', to_org: 'Metro Concrete (TC)', contract_value: 620000, status: 'executed' },
  { id: 'demo-c-9', project_id: 'demo-proj-9', title: 'GC–TC Concrete & Structure', from_org: 'Summit Builders (GC)', to_org: 'Metro Concrete (TC)', contract_value: 1450000, status: 'executed' },
  { id: 'demo-c-9b', project_id: 'demo-proj-9', title: 'GC–TC Wood Frame', from_org: 'Summit Builders (GC)', to_org: 'Peak Framing (TC)', contract_value: 580000, status: 'executed' },
  { id: 'demo-c-10', project_id: 'demo-proj-10', title: 'GC–TC Tilt-Wall & Steel', from_org: 'Summit Builders (GC)', to_org: 'Ironwork Pros (TC)', contract_value: 780000, status: 'executed' },
  { id: 'demo-c-10b', project_id: 'demo-proj-10', title: 'GC–TC Site & Paving', from_org: 'Summit Builders (GC)', to_org: 'Roadway Construction (TC)', contract_value: 340000, status: 'approved' },
];

// ════════════════════════════════════════════════════════
// SOV ITEMS (~80 total, 6-10 per project)
// ════════════════════════════════════════════════════════

export const DEMO_SOV_ITEMS: DemoSOVItem[] = [
  // Project 1
  { id: 'demo-sov-1a', project_id: 'demo-proj-1', code: '01', title: 'General Conditions', scheduled_value: 18500, billed_to_date: 9250, retainage: 925 },
  { id: 'demo-sov-1b', project_id: 'demo-proj-1', code: '03', title: 'Concrete / Foundation', scheduled_value: 42000, billed_to_date: 42000, retainage: 4200 },
  { id: 'demo-sov-1c', project_id: 'demo-proj-1', code: '06', title: 'Wood & Plastics', scheduled_value: 68000, billed_to_date: 15000, retainage: 1500 },
  { id: 'demo-sov-1d', project_id: 'demo-proj-1', code: '16', title: 'Electrical', scheduled_value: 35000, billed_to_date: 8500, retainage: 850 },
  { id: 'demo-sov-1e', project_id: 'demo-proj-1', code: '15', title: 'Plumbing', scheduled_value: 28000, billed_to_date: 12800, retainage: 1280 },
  { id: 'demo-sov-1f', project_id: 'demo-proj-1', code: '15A', title: 'HVAC', scheduled_value: 32000, billed_to_date: 0, retainage: 0 },
  { id: 'demo-sov-1g', project_id: 'demo-proj-1', code: '07', title: 'Insulation & Moisture', scheduled_value: 14000, billed_to_date: 0, retainage: 0 },
  { id: 'demo-sov-1h', project_id: 'demo-proj-1', code: '09', title: 'Finishes', scheduled_value: 45000, billed_to_date: 0, retainage: 0 },
  // Project 2
  { id: 'demo-sov-2a', project_id: 'demo-proj-2', code: '02', title: 'Demolition', scheduled_value: 55000, billed_to_date: 55000, retainage: 2750 },
  { id: 'demo-sov-2b', project_id: 'demo-proj-2', code: '15', title: 'Mechanical / HVAC', scheduled_value: 120000, billed_to_date: 45000, retainage: 2250 },
  { id: 'demo-sov-2c', project_id: 'demo-proj-2', code: '16', title: 'Electrical', scheduled_value: 85000, billed_to_date: 32000, retainage: 1600 },
  { id: 'demo-sov-2d', project_id: 'demo-proj-2', code: '13', title: 'Fire Protection', scheduled_value: 28000, billed_to_date: 14200, retainage: 710 },
  { id: 'demo-sov-2e', project_id: 'demo-proj-2', code: '05', title: 'Metal Framing', scheduled_value: 42000, billed_to_date: 28000, retainage: 1400 },
  { id: 'demo-sov-2f', project_id: 'demo-proj-2', code: '09', title: 'Drywall & Ceilings', scheduled_value: 65000, billed_to_date: 0, retainage: 0 },
  { id: 'demo-sov-2g', project_id: 'demo-proj-2', code: '09B', title: 'Flooring', scheduled_value: 48000, billed_to_date: 0, retainage: 0 },
  { id: 'demo-sov-2h', project_id: 'demo-proj-2', code: '14', title: 'Elevator', scheduled_value: 75000, billed_to_date: 0, retainage: 0 },
  // Project 3
  { id: 'demo-sov-3a', project_id: 'demo-proj-3', code: '07', title: 'Thermal & Moisture', scheduled_value: 98000, billed_to_date: 62000, retainage: 6200 },
  { id: 'demo-sov-3b', project_id: 'demo-proj-3', code: '15', title: 'Plumbing', scheduled_value: 145000, billed_to_date: 18200, retainage: 1820 },
  { id: 'demo-sov-3c', project_id: 'demo-proj-3', code: '06', title: 'Wood Framing', scheduled_value: 186000, billed_to_date: 86000, retainage: 8600 },
  { id: 'demo-sov-3d', project_id: 'demo-proj-3', code: '16', title: 'Electrical', scheduled_value: 95000, billed_to_date: 26400, retainage: 2640 },
  { id: 'demo-sov-3e', project_id: 'demo-proj-3', code: '07A', title: 'Roofing', scheduled_value: 72000, billed_to_date: 48000, retainage: 4800 },
  { id: 'demo-sov-3f', project_id: 'demo-proj-3', code: '15A', title: 'HVAC', scheduled_value: 68000, billed_to_date: 38000, retainage: 3800 },
  { id: 'demo-sov-3g', project_id: 'demo-proj-3', code: '03', title: 'Concrete Flatwork', scheduled_value: 42000, billed_to_date: 0, retainage: 0 },
  { id: 'demo-sov-3h', project_id: 'demo-proj-3', code: '09', title: 'Painting', scheduled_value: 38000, billed_to_date: 0, retainage: 0 },
  // Project 4
  { id: 'demo-sov-4a', project_id: 'demo-proj-4', code: '03', title: 'Concrete Foundations', scheduled_value: 240000, billed_to_date: 220000, retainage: 22000 },
  { id: 'demo-sov-4b', project_id: 'demo-proj-4', code: '05', title: 'Structural Steel', scheduled_value: 520000, billed_to_date: 485000, retainage: 48500 },
  { id: 'demo-sov-4c', project_id: 'demo-proj-4', code: '15', title: 'MEP Rough-In', scheduled_value: 420000, billed_to_date: 380000, retainage: 38000 },
  { id: 'demo-sov-4d', project_id: 'demo-proj-4', code: '15B', title: 'Medical Gas', scheduled_value: 105000, billed_to_date: 95000, retainage: 9500 },
  { id: 'demo-sov-4e', project_id: 'demo-proj-4', code: '13', title: 'Fire Protection', scheduled_value: 140000, billed_to_date: 128000, retainage: 12800 },
  { id: 'demo-sov-4f', project_id: 'demo-proj-4', code: '08', title: 'Curtain Wall & Glazing', scheduled_value: 230000, billed_to_date: 210000, retainage: 21000 },
  { id: 'demo-sov-4g', project_id: 'demo-proj-4', code: '07', title: 'Roofing & Waterproofing', scheduled_value: 180000, billed_to_date: 165000, retainage: 16500 },
  { id: 'demo-sov-4h', project_id: 'demo-proj-4', code: '03B', title: 'Parking Garage', scheduled_value: 380000, billed_to_date: 340000, retainage: 34000 },
  { id: 'demo-sov-4i', project_id: 'demo-proj-4', code: '14', title: 'Elevators', scheduled_value: 195000, billed_to_date: 0, retainage: 0 },
  { id: 'demo-sov-4j', project_id: 'demo-proj-4', code: '16', title: 'Electrical & Generator', scheduled_value: 185000, billed_to_date: 0, retainage: 0 },
  // Project 5
  { id: 'demo-sov-5a', project_id: 'demo-proj-5', code: '02', title: 'Selective Demo', scheduled_value: 28000, billed_to_date: 24000, retainage: 2400 },
  { id: 'demo-sov-5b', project_id: 'demo-proj-5', code: '03', title: 'Foundation & Slab', scheduled_value: 75000, billed_to_date: 68000, retainage: 6800 },
  { id: 'demo-sov-5c', project_id: 'demo-proj-5', code: '05', title: 'Steel Framing', scheduled_value: 160000, billed_to_date: 145000, retainage: 14500 },
  { id: 'demo-sov-5d', project_id: 'demo-proj-5', code: '15', title: 'Plumbing', scheduled_value: 48000, billed_to_date: 42000, retainage: 4200 },
  { id: 'demo-sov-5e', project_id: 'demo-proj-5', code: '15A', title: 'HVAC', scheduled_value: 95000, billed_to_date: 86000, retainage: 8600 },
  { id: 'demo-sov-5f', project_id: 'demo-proj-5', code: '16', title: 'Electrical', scheduled_value: 65000, billed_to_date: 58000, retainage: 5800 },
  { id: 'demo-sov-5g', project_id: 'demo-proj-5', code: '07', title: 'Roofing', scheduled_value: 52000, billed_to_date: 0, retainage: 0 },
  { id: 'demo-sov-5h', project_id: 'demo-proj-5', code: '13', title: 'Fire Alarm', scheduled_value: 32000, billed_to_date: 28000, retainage: 2800 },
  // Project 6
  { id: 'demo-sov-6a', project_id: 'demo-proj-6', code: '03', title: 'Foundation & Retaining', scheduled_value: 200000, billed_to_date: 185000, retainage: 18500 },
  { id: 'demo-sov-6b', project_id: 'demo-proj-6', code: '06', title: 'Structural Framing', scheduled_value: 265000, billed_to_date: 245000, retainage: 24500 },
  { id: 'demo-sov-6c', project_id: 'demo-proj-6', code: '15', title: 'Plumbing & Radiant', scheduled_value: 78000, billed_to_date: 68000, retainage: 6800 },
  { id: 'demo-sov-6d', project_id: 'demo-proj-6', code: '16', title: 'Electrical & Smart Home', scheduled_value: 105000, billed_to_date: 92000, retainage: 9200 },
  { id: 'demo-sov-6e', project_id: 'demo-proj-6', code: '15A', title: 'HVAC VRF System', scheduled_value: 95000, billed_to_date: 0, retainage: 0 },
  { id: 'demo-sov-6f', project_id: 'demo-proj-6', code: '04', title: 'Stone Masonry', scheduled_value: 145000, billed_to_date: 0, retainage: 0 },
  { id: 'demo-sov-6g', project_id: 'demo-proj-6', code: '07', title: 'Standing Seam Roof', scheduled_value: 138000, billed_to_date: 125000, retainage: 12500 },
  { id: 'demo-sov-6h', project_id: 'demo-proj-6', code: '13', title: 'Pool & Outdoor', scheduled_value: 180000, billed_to_date: 0, retainage: 0 },
  // Project 7
  { id: 'demo-sov-7a', project_id: 'demo-proj-7', code: '05', title: 'Structural Reinforcement', scheduled_value: 48000, billed_to_date: 42000, retainage: 2100 },
  { id: 'demo-sov-7b', project_id: 'demo-proj-7', code: '15', title: 'Process Plumbing', scheduled_value: 42000, billed_to_date: 35000, retainage: 1750 },
  { id: 'demo-sov-7c', project_id: 'demo-proj-7', code: '16', title: 'Electrical 3-Phase', scheduled_value: 32000, billed_to_date: 28000, retainage: 1400 },
  { id: 'demo-sov-7d', project_id: 'demo-proj-7', code: '15A', title: 'HVAC & Ventilation', scheduled_value: 58000, billed_to_date: 52000, retainage: 2600 },
  { id: 'demo-sov-7e', project_id: 'demo-proj-7', code: '03', title: 'Concrete Floor', scheduled_value: 22000, billed_to_date: 0, retainage: 0 },
  { id: 'demo-sov-7f', project_id: 'demo-proj-7', code: '09', title: 'Taproom Finishes', scheduled_value: 65000, billed_to_date: 0, retainage: 0 },
  // Project 8
  { id: 'demo-sov-8a', project_id: 'demo-proj-8', code: '02', title: 'Site Grading & Utilities', scheduled_value: 105000, billed_to_date: 95000, retainage: 4750 },
  { id: 'demo-sov-8b', project_id: 'demo-proj-8', code: '03', title: 'Concrete Slab & Foundation', scheduled_value: 88000, billed_to_date: 78000, retainage: 3900 },
  { id: 'demo-sov-8c', project_id: 'demo-proj-8', code: '03B', title: 'Tilt-Wall Panels', scheduled_value: 160000, billed_to_date: 145000, retainage: 7250 },
  { id: 'demo-sov-8d', project_id: 'demo-proj-8', code: '05', title: 'Steel & Joists', scheduled_value: 75000, billed_to_date: 68000, retainage: 3400 },
  { id: 'demo-sov-8e', project_id: 'demo-proj-8', code: '07', title: 'Roofing', scheduled_value: 58000, billed_to_date: 52000, retainage: 2600 },
  { id: 'demo-sov-8f', project_id: 'demo-proj-8', code: '15', title: 'MEP Shell', scheduled_value: 98000, billed_to_date: 88000, retainage: 4400 },
  { id: 'demo-sov-8g', project_id: 'demo-proj-8', code: '08', title: 'Storefront Glazing', scheduled_value: 52000, billed_to_date: 0, retainage: 0 },
  { id: 'demo-sov-8h', project_id: 'demo-proj-8', code: '13', title: 'Fire Sprinkler', scheduled_value: 48000, billed_to_date: 42000, retainage: 2100 },
  // Project 9
  { id: 'demo-sov-9a', project_id: 'demo-proj-9', code: '03A', title: 'Deep Foundations', scheduled_value: 350000, billed_to_date: 320000, retainage: 32000 },
  { id: 'demo-sov-9b', project_id: 'demo-proj-9', code: '03B', title: 'PT Slabs Levels 1-3', scheduled_value: 520000, billed_to_date: 480000, retainage: 48000 },
  { id: 'demo-sov-9c', project_id: 'demo-proj-9', code: '06', title: 'Wood Framing L4-5', scheduled_value: 420000, billed_to_date: 385000, retainage: 38500 },
  { id: 'demo-sov-9d', project_id: 'demo-proj-9', code: '15', title: 'MEP Rough-In', scheduled_value: 580000, billed_to_date: 520000, retainage: 52000 },
  { id: 'demo-sov-9e', project_id: 'demo-proj-9', code: '14', title: 'Elevators', scheduled_value: 200000, billed_to_date: 185000, retainage: 18500 },
  { id: 'demo-sov-9f', project_id: 'demo-proj-9', code: '07', title: 'Exterior Envelope', scheduled_value: 320000, billed_to_date: 295000, retainage: 29500 },
  { id: 'demo-sov-9g', project_id: 'demo-proj-9', code: '13', title: 'Fire Protection', scheduled_value: 155000, billed_to_date: 142000, retainage: 14200 },
  { id: 'demo-sov-9h', project_id: 'demo-proj-9', code: '05', title: 'Retail Shell', scheduled_value: 120000, billed_to_date: 0, retainage: 0 },
  { id: 'demo-sov-9i', project_id: 'demo-proj-9', code: '07A', title: 'Roofing & Waterproofing', scheduled_value: 185000, billed_to_date: 0, retainage: 0 },
  { id: 'demo-sov-9j', project_id: 'demo-proj-9', code: '09', title: 'Unit Interiors', scheduled_value: 680000, billed_to_date: 0, retainage: 0 },
  // Project 10
  { id: 'demo-sov-10a', project_id: 'demo-proj-10', code: '02', title: 'Mass Grading & Drainage', scheduled_value: 200000, billed_to_date: 185000, retainage: 9250 },
  { id: 'demo-sov-10b', project_id: 'demo-proj-10', code: '03', title: 'Slab on Grade', scheduled_value: 310000, billed_to_date: 280000, retainage: 14000 },
  { id: 'demo-sov-10c', project_id: 'demo-proj-10', code: '03B', title: 'Tilt-Wall Panels', scheduled_value: 350000, billed_to_date: 320000, retainage: 16000 },
  { id: 'demo-sov-10d', project_id: 'demo-proj-10', code: '05', title: 'Steel & Joists', scheduled_value: 215000, billed_to_date: 195000, retainage: 9750 },
  { id: 'demo-sov-10e', project_id: 'demo-proj-10', code: '07', title: 'Roofing', scheduled_value: 160000, billed_to_date: 145000, retainage: 7250 },
  { id: 'demo-sov-10f', project_id: 'demo-proj-10', code: '16', title: 'Electrical', scheduled_value: 140000, billed_to_date: 125000, retainage: 6250 },
  { id: 'demo-sov-10g', project_id: 'demo-proj-10', code: '13', title: 'Fire Sprinkler ESFR', scheduled_value: 180000, billed_to_date: 165000, retainage: 8250 },
  { id: 'demo-sov-10h', project_id: 'demo-proj-10', code: '11', title: 'Dock Equipment', scheduled_value: 105000, billed_to_date: 0, retainage: 0 },
];

// ════════════════════════════════════════════════════════
// ATTENTION ITEMS (~30 total)
// ════════════════════════════════════════════════════════

export const DEMO_ATTENTION_ITEMS: DemoAttentionItem[] = [
  // Project 1
  { id: 'att-1', project_id: 'demo-proj-1', type: 'work_order', title: 'Foundation Framing WO needs pricing', description: 'Draft work order awaiting cost entry', urgency: 'high', role_visibility: ['GC', 'TC'] },
  { id: 'att-2', project_id: 'demo-proj-1', type: 'invoice', title: 'Invoice INV-001 awaiting approval', description: 'Submitted 3 days ago — no action taken', urgency: 'high', role_visibility: ['GC'] },
  { id: 'att-3', project_id: 'demo-proj-1', type: 'purchase_order', title: 'PO-2025-001 not yet sent to supplier', description: 'Lumber order drafted but unsent', urgency: 'medium', role_visibility: ['GC', 'TC', 'SUPPLIER'] },
  // Project 2
  { id: 'att-4', project_id: 'demo-proj-2', type: 'work_order', title: 'Drywall WO missing assignment', description: 'No field crew assigned to drywall scope', urgency: 'high', role_visibility: ['GC', 'TC'] },
  { id: 'att-5', project_id: 'demo-proj-2', type: 'invoice', title: 'Invoice INV-007 submitted — review needed', description: 'December billing submitted by TC', urgency: 'high', role_visibility: ['GC'] },
  { id: 'att-6', project_id: 'demo-proj-2', type: 'purchase_order', title: 'PO-2025-005 priced — ready for approval', description: 'Supplier has entered pricing', urgency: 'medium', role_visibility: ['GC', 'TC', 'SUPPLIER'] },
  // Project 3
  { id: 'att-7', project_id: 'demo-proj-3', type: 'work_order', title: 'Siding WO needs scope finalized', description: 'Draft — scope description incomplete', urgency: 'high', role_visibility: ['GC', 'TC', 'FC'] },
  { id: 'att-8', project_id: 'demo-proj-3', type: 'invoice', title: 'Invoice INV-013 still in draft', description: 'November billing not yet submitted', urgency: 'medium', role_visibility: ['TC', 'FC'] },
  { id: 'att-9', project_id: 'demo-proj-3', type: 'rfi', title: 'Open RFI: Siding color clarification', description: 'Architect response pending', urgency: 'high', role_visibility: ['GC', 'TC', 'FC'] },
  // Project 4
  { id: 'att-10', project_id: 'demo-proj-4', type: 'invoice', title: 'Parking garage invoice INV-023 in draft', description: '$340K billing period not yet submitted', urgency: 'high', role_visibility: ['GC', 'TC'] },
  { id: 'att-11', project_id: 'demo-proj-4', type: 'work_order', title: 'Elevator WO needs subcontractor assignment', description: 'Draft elevator installation WO', urgency: 'high', role_visibility: ['GC'] },
  { id: 'att-12', project_id: 'demo-proj-4', type: 'purchase_order', title: 'Glazing PO-2025-015 awaiting pricing', description: '$88K curtain wall order needs supplier quote', urgency: 'medium', role_visibility: ['GC', 'SUPPLIER'] },
  // Project 5
  { id: 'att-13', project_id: 'demo-proj-5', type: 'work_order', title: 'Kitchen equipment WO not started', description: 'Commercial kitchen scope needs review', urgency: 'medium', role_visibility: ['GC', 'TC'] },
  { id: 'att-14', project_id: 'demo-proj-5', type: 'invoice', title: 'Invoice INV-028 needs GC approval', description: 'October billing submitted by TC', urgency: 'high', role_visibility: ['GC'] },
  // Project 6
  { id: 'att-15', project_id: 'demo-proj-6', type: 'work_order', title: 'Pool WO needs scope definition', description: 'Infinity edge pool design not finalized', urgency: 'high', role_visibility: ['GC', 'TC'] },
  { id: 'att-16', project_id: 'demo-proj-6', type: 'invoice', title: 'Two invoices submitted awaiting review', description: 'INV-032 and INV-033 need approval', urgency: 'high', role_visibility: ['GC'] },
  { id: 'att-17', project_id: 'demo-proj-6', type: 'purchase_order', title: 'Roofing PO still in draft', description: 'Copper standing seam materials not ordered', urgency: 'medium', role_visibility: ['GC', 'TC', 'SUPPLIER'] },
  // Project 7
  { id: 'att-18', project_id: 'demo-proj-7', type: 'work_order', title: 'Walk-in cooler WO needs pricing', description: 'Draft — refrigeration scope incomplete', urgency: 'medium', role_visibility: ['GC', 'TC'] },
  { id: 'att-19', project_id: 'demo-proj-7', type: 'invoice', title: 'Invoice INV-038 awaiting approval', description: 'HVAC work billing submitted', urgency: 'high', role_visibility: ['GC'] },
  // Project 8
  { id: 'att-20', project_id: 'demo-proj-8', type: 'work_order', title: 'Storefront glazing WO in draft', description: 'Need to finalize tenant bay specifications', urgency: 'medium', role_visibility: ['GC', 'TC'] },
  { id: 'att-21', project_id: 'demo-proj-8', type: 'invoice', title: 'Two invoices submitted — review needed', description: 'INV-044 and INV-045 awaiting GC approval', urgency: 'high', role_visibility: ['GC'] },
  { id: 'att-22', project_id: 'demo-proj-8', type: 'purchase_order', title: 'Storefront PO awaiting vendor response', description: 'PO-2025-029 sent to Kawneer — no response', urgency: 'medium', role_visibility: ['GC', 'SUPPLIER'] },
  // Project 9
  { id: 'att-23', project_id: 'demo-proj-9', type: 'invoice', title: 'MEP invoice INV-050 under review', description: '$520K MEP billing needs verification', urgency: 'high', role_visibility: ['GC'] },
  { id: 'att-24', project_id: 'demo-proj-9', type: 'work_order', title: 'Retail shell build-out not started', description: '3 WOs in draft for retail spaces', urgency: 'medium', role_visibility: ['GC', 'TC'] },
  { id: 'att-25', project_id: 'demo-proj-9', type: 'rfi', title: 'Open RFI: Unit layout revision', description: 'Owner requested layout changes on L4 units', urgency: 'high', role_visibility: ['GC', 'TC', 'FC'] },
  // Project 10
  { id: 'att-26', project_id: 'demo-proj-10', type: 'work_order', title: 'Dock equipment WO needs finalization', description: '20 dock positions need configuration details', urgency: 'high', role_visibility: ['GC', 'TC'] },
  { id: 'att-27', project_id: 'demo-proj-10', type: 'invoice', title: 'Steel invoice INV-058 needs review', description: '$195K steel work billing submitted', urgency: 'high', role_visibility: ['GC'] },
  { id: 'att-28', project_id: 'demo-proj-10', type: 'purchase_order', title: 'Roofing PO in draft', description: 'PO-2025-039 for TPO materials not finalized', urgency: 'medium', role_visibility: ['GC', 'TC', 'SUPPLIER'] },
];

// ════════════════════════════════════════════════════════
// TEAM MEMBERS (~20)
// ════════════════════════════════════════════════════════

export const DEMO_TEAM: DemoTeamMember[] = [
  { id: 'tm-1', name: 'Alex Rivera', role: 'GC', email: 'alex@summitbuilders.com', org_name: 'Summit Builders' },
  { id: 'tm-2', name: 'Jordan Lee', role: 'TC', email: 'jordan@peakframing.com', org_name: 'Peak Framing' },
  { id: 'tm-3', name: 'Sam Torres', role: 'FC', email: 'sam@fieldcrew.com', org_name: 'Torres Field Crew' },
  { id: 'tm-4', name: 'Casey Nguyen', role: 'SUPPLIER', email: 'casey@austinlumber.com', org_name: 'Austin Lumber Co' },
  { id: 'tm-5', name: 'Morgan Chen', role: 'GC', email: 'morgan@summitbuilders.com', org_name: 'Summit Builders' },
  { id: 'tm-6', name: 'Taylor Brooks', role: 'TC', email: 'taylor@coolairhvac.com', org_name: 'CoolAir HVAC' },
  { id: 'tm-7', name: 'Riley Martinez', role: 'FC', email: 'riley@fieldcrew.com', org_name: 'Martinez Field Services' },
  { id: 'tm-8', name: 'Avery Patel', role: 'SUPPLIER', email: 'avery@metroelectric.com', org_name: 'Metro Electric Supply' },
  { id: 'tm-9', name: 'Dakota Kim', role: 'TC', email: 'dakota@ironworkpros.com', org_name: 'Ironwork Pros' },
  { id: 'tm-10', name: 'Jamie Sullivan', role: 'GC', email: 'jamie@summitbuilders.com', org_name: 'Summit Builders' },
  { id: 'tm-11', name: 'Quinn Adams', role: 'TC', email: 'quinn@allsideexteriors.com', org_name: 'AllSide Exteriors' },
  { id: 'tm-12', name: 'Skyler Reeves', role: 'FC', email: 'skyler@torrescrew.com', org_name: 'Torres Field Crew' },
  { id: 'tm-13', name: 'Drew Watkins', role: 'SUPPLIER', email: 'drew@abcroofing.com', org_name: 'ABC Roofing Supply' },
  { id: 'tm-14', name: 'Blake Harrison', role: 'TC', email: 'blake@medbuildmech.com', org_name: 'MedBuild Mechanical' },
  { id: 'tm-15', name: 'Cameron Ortiz', role: 'FC', email: 'cameron@ortizelectric.com', org_name: 'Ortiz Electrical Services' },
  { id: 'tm-16', name: 'Hayden Price', role: 'SUPPLIER', email: 'hayden@texasconcrete.com', org_name: 'Texas Concrete Supply' },
  { id: 'tm-17', name: 'Rowan Fischer', role: 'TC', email: 'rowan@metroconcrete.com', org_name: 'Metro Concrete' },
  { id: 'tm-18', name: 'Parker Simmons', role: 'GC', email: 'parker@summitbuilders.com', org_name: 'Summit Builders' },
  { id: 'tm-19', name: 'Reese Thornton', role: 'SUPPLIER', email: 'reese@lonestarsteel.com', org_name: 'Lone Star Steel' },
  { id: 'tm-20', name: 'Finley Grant', role: 'FC', email: 'finley@grantfield.com', org_name: 'Grant Field Services' },
];

// ════════════════════════════════════════════════════════
// PO LINE ITEMS (~120 total, 3-4 per PO)
// ════════════════════════════════════════════════════════

export const DEMO_PO_LINE_ITEMS: DemoPOLineItem[] = [
  // PO 1a
  { id: 'poli-1a1', po_id: 'demo-po-1a', description: '2x6 SPF Studs 8ft', quantity: 240, uom: 'EA', unit_price: 8.50 },
  { id: 'poli-1a2', po_id: 'demo-po-1a', description: '2x10 SPF Joists 12ft', quantity: 80, uom: 'EA', unit_price: 18.75 },
  { id: 'poli-1a3', po_id: 'demo-po-1a', description: '3/4" Plywood Sheathing 4x8', quantity: 45, uom: 'SHT', unit_price: 52.00 },
  { id: 'poli-1a4', po_id: 'demo-po-1a', description: 'Simpson Strong-Tie H10A', quantity: 120, uom: 'EA', unit_price: 3.25 },
  // PO 1b
  { id: 'poli-1b1', po_id: 'demo-po-1b', description: '12/2 NM-B Romex 250ft', quantity: 8, uom: 'ROLL', unit_price: 185.00 },
  { id: 'poli-1b2', po_id: 'demo-po-1b', description: '14/2 NM-B Romex 250ft', quantity: 12, uom: 'ROLL', unit_price: 145.00 },
  { id: 'poli-1b3', po_id: 'demo-po-1b', description: '4" Square Boxes', quantity: 60, uom: 'EA', unit_price: 2.85 },
  // PO 1c
  { id: 'poli-1c1', po_id: 'demo-po-1c', description: '3/4" PEX-A Tubing 300ft', quantity: 6, uom: 'ROLL', unit_price: 425.00 },
  { id: 'poli-1c2', po_id: 'demo-po-1c', description: '1/2" PEX-A Tubing 300ft', quantity: 8, uom: 'ROLL', unit_price: 285.00 },
  { id: 'poli-1c3', po_id: 'demo-po-1c', description: '3" PVC DWV Pipe 10ft', quantity: 40, uom: 'PC', unit_price: 18.50 },
  // PO 1d
  { id: 'poli-1d1', po_id: 'demo-po-1d', description: 'R-38 Blown-In Bags', quantity: 45, uom: 'BAG', unit_price: 42.00 },
  { id: 'poli-1d2', po_id: 'demo-po-1d', description: 'R-19 Kraft Faced Batts', quantity: 80, uom: 'PC', unit_price: 28.50 },
  // PO 2a
  { id: 'poli-2a1', po_id: 'demo-po-2a', description: '10/3 MC Cable 250ft', quantity: 6, uom: 'ROLL', unit_price: 380.00 },
  { id: 'poli-2a2', po_id: 'demo-po-2a', description: '200A Load Center Panel', quantity: 3, uom: 'EA', unit_price: 425.00 },
  { id: 'poli-2a3', po_id: 'demo-po-2a', description: '20A GFCI Receptacles', quantity: 48, uom: 'EA', unit_price: 18.50 },
  { id: 'poli-2a4', po_id: 'demo-po-2a', description: '4" Square Boxes w/ Covers', quantity: 120, uom: 'EA', unit_price: 3.85 },
  // PO 2b
  { id: 'poli-2b1', po_id: 'demo-po-2b', description: '14" Flex Duct 25ft', quantity: 40, uom: 'PC', unit_price: 85.00 },
  { id: 'poli-2b2', po_id: 'demo-po-2b', description: '3-Ton RTU', quantity: 2, uom: 'EA', unit_price: 4200.00 },
  { id: 'poli-2b3', po_id: 'demo-po-2b', description: '5-Ton RTU', quantity: 1, uom: 'EA', unit_price: 6500.00 },
  // PO 2c
  { id: 'poli-2c1', po_id: 'demo-po-2c', description: '12x24 Porcelain Tile', quantity: 800, uom: 'SF', unit_price: 8.50 },
  { id: 'poli-2c2', po_id: 'demo-po-2c', description: 'Tile Adhesive 50lb', quantity: 20, uom: 'BAG', unit_price: 45.00 },
  { id: 'poli-2c3', po_id: 'demo-po-2c', description: 'Grout Unsanded 25lb', quantity: 15, uom: 'BAG', unit_price: 22.00 },
  // PO 2d
  { id: 'poli-2d1', po_id: 'demo-po-2d', description: '5/8" Type X Drywall 4x8', quantity: 320, uom: 'SHT', unit_price: 18.50 },
  { id: 'poli-2d2', po_id: 'demo-po-2d', description: '3-5/8" Metal Studs 10ft', quantity: 400, uom: 'EA', unit_price: 6.25 },
  { id: 'poli-2d3', po_id: 'demo-po-2d', description: 'Joint Compound 5gal', quantity: 24, uom: 'PAIL', unit_price: 28.00 },
  // PO 3a
  { id: 'poli-3a1', po_id: 'demo-po-3a', description: 'Hardie Plank 8.25" Cedarmill 12ft', quantity: 400, uom: 'PC', unit_price: 14.50 },
  { id: 'poli-3a2', po_id: 'demo-po-3a', description: 'Hardie Trim 5/4x4 12ft', quantity: 120, uom: 'PC', unit_price: 22.00 },
  { id: 'poli-3a3', po_id: 'demo-po-3a', description: 'Hardie Corner Boards 3x3 10ft', quantity: 48, uom: 'PC', unit_price: 28.50 },
  // PO 3b
  { id: 'poli-3b1', po_id: 'demo-po-3b', description: 'Architectural Shingles', quantity: 240, uom: 'BDL', unit_price: 42.00 },
  { id: 'poli-3b2', po_id: 'demo-po-3b', description: '30lb Felt Underlayment', quantity: 24, uom: 'ROLL', unit_price: 65.00 },
  { id: 'poli-3b3', po_id: 'demo-po-3b', description: 'Ridge Cap Shingles', quantity: 18, uom: 'BDL', unit_price: 52.00 },
  { id: 'poli-3b4', po_id: 'demo-po-3b', description: 'Drip Edge 10ft', quantity: 80, uom: 'PC', unit_price: 8.50 },
  // PO 3c
  { id: 'poli-3c1', po_id: 'demo-po-3c', description: '2-Ton Mini Split System', quantity: 6, uom: 'EA', unit_price: 1800.00 },
  { id: 'poli-3c2', po_id: 'demo-po-3c', description: 'Refrigerant Line Set 25ft', quantity: 12, uom: 'SET', unit_price: 185.00 },
  { id: 'poli-3c3', po_id: 'demo-po-3c', description: 'Condensate Pump', quantity: 6, uom: 'EA', unit_price: 125.00 },
  // PO 3d
  { id: 'poli-3d1', po_id: 'demo-po-3d', description: '2x6 SPF Studs 8ft', quantity: 600, uom: 'EA', unit_price: 8.50 },
  { id: 'poli-3d2', po_id: 'demo-po-3d', description: '2x12 LVL Beams 16ft', quantity: 48, uom: 'EA', unit_price: 125.00 },
  { id: 'poli-3d3', po_id: 'demo-po-3d', description: 'TJI 230 Joists 14ft', quantity: 180, uom: 'EA', unit_price: 32.00 },
  { id: 'poli-3d4', po_id: 'demo-po-3d', description: '7/16" OSB 4x8', quantity: 280, uom: 'SHT', unit_price: 28.00 },
  // PO 4a
  { id: 'poli-4a1', po_id: 'demo-po-4a', description: 'W14x48 Wide Flange Beam', quantity: 42, uom: 'EA', unit_price: 2800.00 },
  { id: 'poli-4a2', po_id: 'demo-po-4a', description: 'W10x22 Columns', quantity: 28, uom: 'EA', unit_price: 1850.00 },
  { id: 'poli-4a3', po_id: 'demo-po-4a', description: '3" Metal Deck 36" x 12ft', quantity: 450, uom: 'SHT', unit_price: 45.00 },
  // PO 4b
  { id: 'poli-4b1', po_id: 'demo-po-4b', description: 'Medical Oxygen Copper Pipe 1"', quantity: 400, uom: 'LF', unit_price: 28.00 },
  { id: 'poli-4b2', po_id: 'demo-po-4b', description: 'Vacuum System Zone Valve', quantity: 12, uom: 'EA', unit_price: 450.00 },
  { id: 'poli-4b3', po_id: 'demo-po-4b', description: 'Medical Gas Alarm Panel', quantity: 4, uom: 'EA', unit_price: 2200.00 },
  // PO 4c
  { id: 'poli-4c1', po_id: 'demo-po-4c', description: 'Curtain Wall Framing Extrusion', quantity: 280, uom: 'LF', unit_price: 145.00 },
  { id: 'poli-4c2', po_id: 'demo-po-4c', description: '1" Insulated Glass Unit', quantity: 120, uom: 'EA', unit_price: 385.00 },
  { id: 'poli-4c3', po_id: 'demo-po-4c', description: 'Spandrel Panel', quantity: 45, uom: 'EA', unit_price: 220.00 },
  // PO 4d
  { id: 'poli-4d1', po_id: 'demo-po-4d', description: '400A Switchgear', quantity: 1, uom: 'EA', unit_price: 18500.00 },
  { id: 'poli-4d2', po_id: 'demo-po-4d', description: '200A Distribution Panel', quantity: 8, uom: 'EA', unit_price: 2800.00 },
  { id: 'poli-4d3', po_id: 'demo-po-4d', description: 'LED Troffer 2x4', quantity: 240, uom: 'EA', unit_price: 85.00 },
  // PO 5a-5c (abbreviated — 3 items each)
  { id: 'poli-5a1', po_id: 'demo-po-5a', description: 'Light Gauge Steel Studs 3-5/8" 10ft', quantity: 800, uom: 'EA', unit_price: 6.50 },
  { id: 'poli-5a2', po_id: 'demo-po-5a', description: 'Steel Track 3-5/8" 10ft', quantity: 200, uom: 'EA', unit_price: 5.80 },
  { id: 'poli-5a3', po_id: 'demo-po-5a', description: 'Steel Angle Clip', quantity: 400, uom: 'EA', unit_price: 2.25 },
  { id: 'poli-5b1', po_id: 'demo-po-5b', description: '7.5-Ton RTU', quantity: 2, uom: 'EA', unit_price: 12500.00 },
  { id: 'poli-5b2', po_id: 'demo-po-5b', description: '12" Spiral Duct 10ft', quantity: 60, uom: 'PC', unit_price: 85.00 },
  { id: 'poli-5b3', po_id: 'demo-po-5b', description: 'Diffuser 24x24', quantity: 24, uom: 'EA', unit_price: 42.00 },
  { id: 'poli-5c1', po_id: 'demo-po-5c', description: 'Commercial Range 6-Burner', quantity: 2, uom: 'EA', unit_price: 8500.00 },
  { id: 'poli-5c2', po_id: 'demo-po-5c', description: 'Type I Exhaust Hood 12ft', quantity: 1, uom: 'EA', unit_price: 14500.00 },
  { id: 'poli-5c3', po_id: 'demo-po-5c', description: 'Walk-In Cooler 10x12', quantity: 1, uom: 'EA', unit_price: 18500.00 },
  // PO 6a-6d
  { id: 'poli-6a1', po_id: 'demo-po-6a', description: 'Texas Limestone Veneer', quantity: 2400, uom: 'SF', unit_price: 22.00 },
  { id: 'poli-6a2', po_id: 'demo-po-6a', description: 'Limestone Cap Stone', quantity: 120, uom: 'LF', unit_price: 45.00 },
  { id: 'poli-6a3', po_id: 'demo-po-6a', description: 'Stone Mortar Mix', quantity: 80, uom: 'BAG', unit_price: 18.00 },
  { id: 'poli-6b1', po_id: 'demo-po-6b', description: 'Douglas Fir Timber 8x8 20ft', quantity: 24, uom: 'EA', unit_price: 850.00 },
  { id: 'poli-6b2', po_id: 'demo-po-6b', description: 'Glulam Beam 6-3/4x18 24ft', quantity: 12, uom: 'EA', unit_price: 2200.00 },
  { id: 'poli-6b3', po_id: 'demo-po-6b', description: 'TJI 560 Joists 16ft', quantity: 280, uom: 'EA', unit_price: 48.00 },
  { id: 'poli-6c1', po_id: 'demo-po-6c', description: 'Lutron HomeWorks System', quantity: 1, uom: 'SYS', unit_price: 18000.00 },
  { id: 'poli-6c2', po_id: 'demo-po-6c', description: 'Lutron Keypads', quantity: 32, uom: 'EA', unit_price: 185.00 },
  { id: 'poli-6c3', po_id: 'demo-po-6c', description: 'Dimming Module', quantity: 18, uom: 'EA', unit_price: 125.00 },
  { id: 'poli-6d1', po_id: 'demo-po-6d', description: '24ga Copper-Patina Standing Seam', quantity: 4800, uom: 'SF', unit_price: 8.50 },
  { id: 'poli-6d2', po_id: 'demo-po-6d', description: 'Underlayment Ice & Water', quantity: 48, uom: 'ROLL', unit_price: 95.00 },
  // PO 7a-7c
  { id: 'poli-7a1', po_id: 'demo-po-7a', description: 'W10x22 Steel Beam', quantity: 4, uom: 'EA', unit_price: 1850.00 },
  { id: 'poli-7a2', po_id: 'demo-po-7a', description: 'HSS 6x6x1/4 Column', quantity: 6, uom: 'EA', unit_price: 920.00 },
  { id: 'poli-7b1', po_id: 'demo-po-7b', description: '15BBL Brewhouse System', quantity: 1, uom: 'SYS', unit_price: 65000.00 },
  { id: 'poli-7b2', po_id: 'demo-po-7b', description: '15BBL Fermenter', quantity: 4, uom: 'EA', unit_price: 4200.00 },
  { id: 'poli-7b3', po_id: 'demo-po-7b', description: 'Glycol Chiller 5HP', quantity: 1, uom: 'EA', unit_price: 3200.00 },
  { id: 'poli-7c1', po_id: 'demo-po-7c', description: '400A 3-Phase Panel', quantity: 1, uom: 'EA', unit_price: 4200.00 },
  { id: 'poli-7c2', po_id: 'demo-po-7c', description: '6/3 THHN Wire 500ft', quantity: 4, uom: 'ROLL', unit_price: 680.00 },
  { id: 'poli-7c3', po_id: 'demo-po-7c', description: '2" EMT Conduit 10ft', quantity: 40, uom: 'PC', unit_price: 28.00 },
  // PO 8a-8d
  { id: 'poli-8a1', po_id: 'demo-po-8a', description: 'Ready-Mix Concrete 4000psi', quantity: 380, uom: 'CY', unit_price: 145.00 },
  { id: 'poli-8a2', po_id: 'demo-po-8a', description: '#5 Rebar 20ft', quantity: 600, uom: 'EA', unit_price: 12.50 },
  { id: 'poli-8a3', po_id: 'demo-po-8a', description: 'Wire Mesh 6x6-W2.9', quantity: 120, uom: 'SHT', unit_price: 42.00 },
  { id: 'poli-8b1', po_id: 'demo-po-8b', description: '28K Bar Joists 40ft', quantity: 32, uom: 'EA', unit_price: 520.00 },
  { id: 'poli-8b2', po_id: 'demo-po-8b', description: 'Joist Girder 40ft', quantity: 8, uom: 'EA', unit_price: 1150.00 },
  { id: 'poli-8c1', po_id: 'demo-po-8c', description: 'Storefront System 5" x 2"', quantity: 320, uom: 'LF', unit_price: 85.00 },
  { id: 'poli-8c2', po_id: 'demo-po-8c', description: '1" Insulated Glass', quantity: 64, uom: 'EA', unit_price: 285.00 },
  { id: 'poli-8c3', po_id: 'demo-po-8c', description: 'Entrance Door Assembly', quantity: 8, uom: 'EA', unit_price: 1200.00 },
  { id: 'poli-8d1', po_id: 'demo-po-8d', description: 'TPO Membrane 60mil', quantity: 22000, uom: 'SF', unit_price: 0.65 },
  { id: 'poli-8d2', po_id: 'demo-po-8d', description: 'ISO Insulation Board 3"', quantity: 22000, uom: 'SF', unit_price: 0.18 },
  // PO 9a-9e
  { id: 'poli-9a1', po_id: 'demo-po-9a', description: 'Ready-Mix 5000psi', quantity: 850, uom: 'CY', unit_price: 165.00 },
  { id: 'poli-9a2', po_id: 'demo-po-9a', description: '#8 Rebar 20ft', quantity: 1200, uom: 'EA', unit_price: 22.00 },
  { id: 'poli-9a3', po_id: 'demo-po-9a', description: 'PT Strand 1/2" 7-Wire', quantity: 48000, uom: 'LF', unit_price: 0.85 },
  { id: 'poli-9b1', po_id: 'demo-po-9b', description: '2x6 SPF Studs 8ft', quantity: 4800, uom: 'EA', unit_price: 8.50 },
  { id: 'poli-9b2', po_id: 'demo-po-9b', description: 'TJI 360 Joists 14ft', quantity: 640, uom: 'EA', unit_price: 38.00 },
  { id: 'poli-9b3', po_id: 'demo-po-9b', description: '7/16" OSB 4x8', quantity: 1200, uom: 'SHT', unit_price: 28.00 },
  { id: 'poli-9b4', po_id: 'demo-po-9b', description: 'Glulam Beam 5-1/8x12 20ft', quantity: 40, uom: 'EA', unit_price: 1400.00 },
  { id: 'poli-9c1', po_id: 'demo-po-9c', description: 'Nichiha Fiber Cement Panel 4x8', quantity: 800, uom: 'SHT', unit_price: 85.00 },
  { id: 'poli-9c2', po_id: 'demo-po-9c', description: 'Aluminum Channel Trim', quantity: 600, uom: 'LF', unit_price: 12.50 },
  { id: 'poli-9d1', po_id: 'demo-po-9d', description: '800A Main Switchgear', quantity: 1, uom: 'EA', unit_price: 32000.00 },
  { id: 'poli-9d2', po_id: 'demo-po-9d', description: '200A Sub Panel', quantity: 12, uom: 'EA', unit_price: 2800.00 },
  { id: 'poli-9e1', po_id: 'demo-po-9e', description: 'Traction Elevator Car Assembly', quantity: 2, uom: 'EA', unit_price: 28000.00 },
  { id: 'poli-9e2', po_id: 'demo-po-9e', description: 'Elevator Controller', quantity: 2, uom: 'EA', unit_price: 8000.00 },
  // PO 10a-10d
  { id: 'poli-10a1', po_id: 'demo-po-10a', description: 'Ready-Mix 4000psi', quantity: 520, uom: 'CY', unit_price: 145.00 },
  { id: 'poli-10a2', po_id: 'demo-po-10a', description: 'Fiber Mesh Additive', quantity: 520, uom: 'CY', unit_price: 12.00 },
  { id: 'poli-10a3', po_id: 'demo-po-10a', description: '#5 Rebar 20ft', quantity: 800, uom: 'EA', unit_price: 12.50 },
  { id: 'poli-10b1', po_id: 'demo-po-10b', description: '28K Bar Joists 60ft', quantity: 48, uom: 'EA', unit_price: 850.00 },
  { id: 'poli-10b2', po_id: 'demo-po-10b', description: 'Steel Purlins Z 8" 25ft', quantity: 120, uom: 'EA', unit_price: 185.00 },
  { id: 'poli-10b3', po_id: 'demo-po-10b', description: 'Joist Girder 60ft', quantity: 12, uom: 'EA', unit_price: 2200.00 },
  { id: 'poli-10c1', po_id: 'demo-po-10c', description: 'Dock Leveler 6x8 30K', quantity: 20, uom: 'EA', unit_price: 3200.00 },
  { id: 'poli-10c2', po_id: 'demo-po-10c', description: 'Dock Bumper Molded', quantity: 20, uom: 'EA', unit_price: 185.00 },
  { id: 'poli-10c3', po_id: 'demo-po-10c', description: '12x14 Overhead Door Insulated', quantity: 20, uom: 'EA', unit_price: 1250.00 },
  { id: 'poli-10d1', po_id: 'demo-po-10d', description: 'TPO 60mil White 10ft Wide', quantity: 120000, uom: 'SF', unit_price: 0.38 },
  { id: 'poli-10d2', po_id: 'demo-po-10d', description: 'ISO Board 2.5"', quantity: 120000, uom: 'SF', unit_price: 0.14 },
  { id: 'poli-10d3', po_id: 'demo-po-10d', description: 'Roof Drain Assembly', quantity: 24, uom: 'EA', unit_price: 185.00 },
];

// ════════════════════════════════════════════════════════
// RFIs (~40 total, 3-5 per project)
// ════════════════════════════════════════════════════════

export const DEMO_RFIS: DemoRFI[] = [
  // Project 1
  { id: 'rfi-1a', project_id: 'demo-proj-1', rfi_number: 'RFI-001', subject: 'Foundation anchor bolt spacing', question: 'Plans show 6ft spacing but code requires 4ft max for seismic zone. Please clarify.', status: 'open', priority: 'high', created_by: 'Jordan Lee', assigned_to: 'Architect', created_at: '2025-12-15T00:00:00Z', answered_at: null },
  { id: 'rfi-1b', project_id: 'demo-proj-1', rfi_number: 'RFI-002', subject: 'Electrical panel location', question: 'Can we relocate main panel from garage to utility room per owner request?', status: 'answered', priority: 'medium', created_by: 'Alex Rivera', assigned_to: 'Engineer', created_at: '2025-12-18T00:00:00Z', answered_at: '2025-12-20T00:00:00Z' },
  { id: 'rfi-1c', project_id: 'demo-proj-1', rfi_number: 'RFI-003', subject: 'ADU ceiling height', question: 'Plans show 9ft but trusses delivered are 8ft profile. Confirm ceiling height.', status: 'open', priority: 'high', created_by: 'Jordan Lee', assigned_to: 'Architect', created_at: '2025-12-22T00:00:00Z', answered_at: null },
  { id: 'rfi-1d', project_id: 'demo-proj-1', rfi_number: 'RFI-004', subject: 'Plumbing fixture finish', question: 'Owner wants brushed gold but spec shows chrome. Confirm finish selection.', status: 'answered', priority: 'low', created_by: 'Sam Torres', assigned_to: 'Architect', created_at: '2025-12-24T00:00:00Z', answered_at: '2025-12-26T00:00:00Z' },
  // Project 2
  { id: 'rfi-2a', project_id: 'demo-proj-2', rfi_number: 'RFI-005', subject: 'Existing ductwork reuse', question: 'Floor 2 existing return duct in good condition. Can we reuse instead of replacing?', status: 'open', priority: 'medium', created_by: 'Jordan Lee', assigned_to: 'Engineer', created_at: '2025-11-25T00:00:00Z', answered_at: null },
  { id: 'rfi-2b', project_id: 'demo-proj-2', rfi_number: 'RFI-006', subject: 'Floor 3 structural concern', question: 'Found deteriorated beam at grid C-4. Engineer to review and advise.', status: 'open', priority: 'high', created_by: 'Alex Rivera', assigned_to: 'Engineer', created_at: '2025-11-28T00:00:00Z', answered_at: null },
  { id: 'rfi-2c', project_id: 'demo-proj-2', rfi_number: 'RFI-007', subject: 'Elevator pit depth', question: 'Existing pit is 4ft but modernization requires 5ft. Options?', status: 'answered', priority: 'high', created_by: 'Dakota Kim', assigned_to: 'Engineer', created_at: '2025-12-02T00:00:00Z', answered_at: '2025-12-05T00:00:00Z' },
  { id: 'rfi-2d', project_id: 'demo-proj-2', rfi_number: 'RFI-008', subject: 'Lobby stone substitution', question: 'Specified Calacatta marble 12-week lead time. Can we substitute Statuario?', status: 'open', priority: 'medium', created_by: 'Alex Rivera', assigned_to: 'Architect', created_at: '2025-12-10T00:00:00Z', answered_at: null },
  // Project 3
  { id: 'rfi-3a', project_id: 'demo-proj-3', rfi_number: 'RFI-009', subject: 'Siding color selection', question: 'Owner wants Arctic White but plans show Iron Gray. Which color for Units 1-6?', status: 'open', priority: 'high', created_by: 'Sam Torres', assigned_to: 'Architect', created_at: '2025-10-20T00:00:00Z', answered_at: null },
  { id: 'rfi-3b', project_id: 'demo-proj-3', rfi_number: 'RFI-010', subject: 'Plumbing stub-out height', question: 'Vanity rough-in height 19" or 21"? Different specs on A3.2 vs P2.1.', status: 'answered', priority: 'low', created_by: 'Jordan Lee', assigned_to: 'Architect', created_at: '2025-10-22T00:00:00Z', answered_at: '2025-10-25T00:00:00Z' },
  { id: 'rfi-3c', project_id: 'demo-proj-3', rfi_number: 'RFI-011', subject: 'Garage door header size', question: 'Plan calls for 4x12 header but span requires engineered lumber. Confirm.', status: 'open', priority: 'medium', created_by: 'Jordan Lee', assigned_to: 'Engineer', created_at: '2025-11-05T00:00:00Z', answered_at: null },
  { id: 'rfi-3d', project_id: 'demo-proj-3', rfi_number: 'RFI-012', subject: 'Driveway slope exceeds 8%', question: 'Units 9-12 driveway grade at 10.2%. Need retaining wall or regrading.', status: 'open', priority: 'high', created_by: 'Sam Torres', assigned_to: 'Engineer', created_at: '2025-11-08T00:00:00Z', answered_at: null },
  // Project 4
  { id: 'rfi-4a', project_id: 'demo-proj-4', rfi_number: 'RFI-013', subject: 'Surgery suite HVAC requirements', question: 'ASHRAE 170 requires 20 ACH for surgery. Plans show 15. Confirm design.', status: 'open', priority: 'high', created_by: 'Blake Harrison', assigned_to: 'Engineer', created_at: '2025-09-28T00:00:00Z', answered_at: null },
  { id: 'rfi-4b', project_id: 'demo-proj-4', rfi_number: 'RFI-014', subject: 'Medical gas zone valve locations', question: 'Need confirmation of zone valve box locations for O2 and vacuum.', status: 'answered', priority: 'medium', created_by: 'Blake Harrison', assigned_to: 'Engineer', created_at: '2025-10-02T00:00:00Z', answered_at: '2025-10-05T00:00:00Z' },
  { id: 'rfi-4c', project_id: 'demo-proj-4', rfi_number: 'RFI-015', subject: 'Parking garage clearance', question: 'Level 2 clear height 7ft-8in. Ambulance bay needs 9ft minimum.', status: 'open', priority: 'high', created_by: 'Alex Rivera', assigned_to: 'Engineer', created_at: '2025-10-15T00:00:00Z', answered_at: null },
  { id: 'rfi-4d', project_id: 'demo-proj-4', rfi_number: 'RFI-016', subject: 'Emergency generator fuel tank size', question: 'Plans show 500gal but code requires 72hr run time = 750gal minimum.', status: 'open', priority: 'high', created_by: 'Cameron Ortiz', assigned_to: 'Engineer', created_at: '2025-11-02T00:00:00Z', answered_at: null },
  { id: 'rfi-4e', project_id: 'demo-proj-4', rfi_number: 'RFI-017', subject: 'Curtain wall wind load rating', question: 'Design wind speed 130mph but specified system rated for 110mph. Confirm.', status: 'answered', priority: 'high', created_by: 'Dakota Kim', assigned_to: 'Engineer', created_at: '2025-10-08T00:00:00Z', answered_at: '2025-10-12T00:00:00Z' },
  // Project 5
  { id: 'rfi-5a', project_id: 'demo-proj-5', rfi_number: 'RFI-018', subject: 'Cafeteria hood exhaust route', question: 'Existing roof penetration blocked by new steel. Alternate route needed.', status: 'open', priority: 'high', created_by: 'Taylor Brooks', assigned_to: 'Engineer', created_at: '2025-10-08T00:00:00Z', answered_at: null },
  { id: 'rfi-5b', project_id: 'demo-proj-5', rfi_number: 'RFI-019', subject: 'ADA ramp grade at new entry', question: 'Existing grade creates 1:10 slope. Code requires 1:12. Need retaining.', status: 'open', priority: 'high', created_by: 'Alex Rivera', assigned_to: 'Architect', created_at: '2025-09-22T00:00:00Z', answered_at: null },
  { id: 'rfi-5c', project_id: 'demo-proj-5', rfi_number: 'RFI-020', subject: 'Classroom acoustics', question: 'STC 50 specified but CMU wall only achieves STC 45. Add isolation?', status: 'answered', priority: 'medium', created_by: 'Jordan Lee', assigned_to: 'Architect', created_at: '2025-09-25T00:00:00Z', answered_at: '2025-09-28T00:00:00Z' },
  // Project 6
  { id: 'rfi-6a', project_id: 'demo-proj-6', rfi_number: 'RFI-021', subject: 'Pool infinity edge detail', question: 'Edge detail not shown on plans. Need structural engineer detail for cantilever.', status: 'open', priority: 'high', created_by: 'Sam Torres', assigned_to: 'Engineer', created_at: '2025-11-20T00:00:00Z', answered_at: null },
  { id: 'rfi-6b', project_id: 'demo-proj-6', rfi_number: 'RFI-022', subject: 'Wine room cooling unit location', question: 'VRF head placement conflicts with custom racking. Relocate unit?', status: 'open', priority: 'medium', created_by: 'Taylor Brooks', assigned_to: 'Architect', created_at: '2025-11-25T00:00:00Z', answered_at: null },
  { id: 'rfi-6c', project_id: 'demo-proj-6', rfi_number: 'RFI-023', subject: 'Retaining wall drainage', question: 'Geotech report calls for french drain but plans show none. Confirm.', status: 'answered', priority: 'high', created_by: 'Alex Rivera', assigned_to: 'Engineer', created_at: '2025-10-25T00:00:00Z', answered_at: '2025-10-28T00:00:00Z' },
  { id: 'rfi-6d', project_id: 'demo-proj-6', rfi_number: 'RFI-024', subject: 'Guest quarters electrical service', question: 'Plans show 100A sub-panel but load calc requires 200A. Confirm sizing.', status: 'open', priority: 'medium', created_by: 'Cameron Ortiz', assigned_to: 'Engineer', created_at: '2025-11-10T00:00:00Z', answered_at: null },
  // Project 7
  { id: 'rfi-7a', project_id: 'demo-proj-7', rfi_number: 'RFI-025', subject: 'Floor drain sizing for brewhouse', question: 'Plans show 4" drains but brewhouse requires 6" for cleaning volume.', status: 'open', priority: 'high', created_by: 'Jordan Lee', assigned_to: 'Engineer', created_at: '2025-11-15T00:00:00Z', answered_at: null },
  { id: 'rfi-7b', project_id: 'demo-proj-7', rfi_number: 'RFI-026', subject: 'Taproom occupancy load', question: 'Mezzanine adds 1,200 SF. Need updated occupancy calc for exits.', status: 'open', priority: 'high', created_by: 'Alex Rivera', assigned_to: 'Architect', created_at: '2025-11-18T00:00:00Z', answered_at: null },
  { id: 'rfi-7c', project_id: 'demo-proj-7', rfi_number: 'RFI-027', subject: '3-phase transformer location', question: 'POCO requires 10ft clearance. Only 7ft available at planned location.', status: 'answered', priority: 'medium', created_by: 'Cameron Ortiz', assigned_to: 'Engineer', created_at: '2025-11-20T00:00:00Z', answered_at: '2025-11-22T00:00:00Z' },
  // Project 8
  { id: 'rfi-8a', project_id: 'demo-proj-8', rfi_number: 'RFI-028', subject: 'Tilt-wall panel thickness', question: 'Plans show 7-1/4" but structural calc requires 9-1/4" for 32ft height.', status: 'open', priority: 'high', created_by: 'Rowan Fischer', assigned_to: 'Engineer', created_at: '2025-10-08T00:00:00Z', answered_at: null },
  { id: 'rfi-8b', project_id: 'demo-proj-8', rfi_number: 'RFI-029', subject: 'ADA parking count', question: 'Current layout shows 4 ADA spaces. Code requires 7 for 180 total spaces.', status: 'answered', priority: 'medium', created_by: 'Alex Rivera', assigned_to: 'Architect', created_at: '2025-10-12T00:00:00Z', answered_at: '2025-10-15T00:00:00Z' },
  { id: 'rfi-8c', project_id: 'demo-proj-8', rfi_number: 'RFI-030', subject: 'Grease interceptor size', question: 'Restaurant tenant requires 1,500gal interceptor. Plans show 750gal.', status: 'open', priority: 'high', created_by: 'Jordan Lee', assigned_to: 'Engineer', created_at: '2025-11-02T00:00:00Z', answered_at: null },
  // Project 9
  { id: 'rfi-9a', project_id: 'demo-proj-9', rfi_number: 'RFI-031', subject: 'PT slab pour sequence', question: 'Level 3 pour conflicts with elevator shaft forming. Need revised sequence.', status: 'answered', priority: 'high', created_by: 'Rowan Fischer', assigned_to: 'Engineer', created_at: '2025-08-05T00:00:00Z', answered_at: '2025-08-08T00:00:00Z' },
  { id: 'rfi-9b', project_id: 'demo-proj-9', rfi_number: 'RFI-032', subject: 'Unit layout revision L4', question: 'Owner wants to convert 4 studios to 2 two-bedrooms on Level 4. Feasible?', status: 'open', priority: 'high', created_by: 'Alex Rivera', assigned_to: 'Architect', created_at: '2025-09-18T00:00:00Z', answered_at: null },
  { id: 'rfi-9c', project_id: 'demo-proj-9', rfi_number: 'RFI-033', subject: 'Retail grease trap location', question: 'Restaurant tenant needs grease trap but it conflicts with parking below.', status: 'open', priority: 'high', created_by: 'Jordan Lee', assigned_to: 'Engineer', created_at: '2025-09-22T00:00:00Z', answered_at: null },
  { id: 'rfi-9d', project_id: 'demo-proj-9', rfi_number: 'RFI-034', subject: 'Podium waterproofing detail', question: 'Traffic-bearing membrane spec unclear at planter transitions. Need detail.', status: 'open', priority: 'medium', created_by: 'Rowan Fischer', assigned_to: 'Architect', created_at: '2025-10-05T00:00:00Z', answered_at: null },
  { id: 'rfi-9e', project_id: 'demo-proj-9', rfi_number: 'RFI-035', subject: 'Exterior balcony railing height', question: 'Plans show 36" but code requires 42" for residential above grade. Confirm.', status: 'answered', priority: 'medium', created_by: 'Quinn Adams', assigned_to: 'Architect', created_at: '2025-09-28T00:00:00Z', answered_at: '2025-10-01T00:00:00Z' },
  // Project 10
  { id: 'rfi-10a', project_id: 'demo-proj-10', rfi_number: 'RFI-036', subject: 'Dock door clear height', question: 'Plans show 12ft clear but tenant requires 14ft for truck loading. Options?', status: 'open', priority: 'high', created_by: 'Dakota Kim', assigned_to: 'Architect', created_at: '2025-09-25T00:00:00Z', answered_at: null },
  { id: 'rfi-10b', project_id: 'demo-proj-10', rfi_number: 'RFI-037', subject: 'Slab flatness requirement', question: 'Tenant wants FF50/FL25 for narrow aisle racking. Plans show FF35/FL20.', status: 'open', priority: 'high', created_by: 'Rowan Fischer', assigned_to: 'Engineer', created_at: '2025-08-20T00:00:00Z', answered_at: null },
  { id: 'rfi-10c', project_id: 'demo-proj-10', rfi_number: 'RFI-038', subject: 'ESFR sprinkler ceiling clearance', question: 'ESFR heads require 36" clearance to top of storage. Confirm rack height limits.', status: 'answered', priority: 'high', created_by: 'Blake Harrison', assigned_to: 'Engineer', created_at: '2025-10-05T00:00:00Z', answered_at: '2025-10-08T00:00:00Z' },
  { id: 'rfi-10d', project_id: 'demo-proj-10', rfi_number: 'RFI-039', subject: 'Truck court turning radius', question: 'WB-67 trucks need 45ft radius. Current layout shows 38ft. Expand court?', status: 'open', priority: 'medium', created_by: 'Alex Rivera', assigned_to: 'Engineer', created_at: '2025-10-12T00:00:00Z', answered_at: null },
];

// ════════════════════════════════════════════════════════
// INVOICE LINE ITEMS (~120 total, 2 per invoice)
// ════════════════════════════════════════════════════════

export const DEMO_INVOICE_LINE_ITEMS: DemoInvoiceLineItem[] = [
  // Project 1 invoices
  { id: 'ili-1a1', invoice_id: 'demo-inv-1a', sov_code: '01', description: 'General Conditions', scheduled_value: 18500, previous_billed: 0, current_billed: 9250, retainage_percent: 10 },
  { id: 'ili-1a2', invoice_id: 'demo-inv-1a', sov_code: '06', description: 'Wood & Plastics', scheduled_value: 68000, previous_billed: 0, current_billed: 5750, retainage_percent: 10 },
  { id: 'ili-1b1', invoice_id: 'demo-inv-1b', sov_code: '16', description: 'Electrical', scheduled_value: 35000, previous_billed: 0, current_billed: 8500, retainage_percent: 10 },
  { id: 'ili-1c1', invoice_id: 'demo-inv-1c', sov_code: '06', description: 'Roof Framing', scheduled_value: 68000, previous_billed: 5750, current_billed: 22000, retainage_percent: 10 },
  { id: 'ili-1d1', invoice_id: 'demo-inv-1d', sov_code: '15', description: 'Plumbing', scheduled_value: 28000, previous_billed: 0, current_billed: 12800, retainage_percent: 10 },
  { id: 'ili-1e1', invoice_id: 'demo-inv-1e', sov_code: '03', description: 'Concrete / Foundation', scheduled_value: 42000, previous_billed: 0, current_billed: 42000, retainage_percent: 10 },
  // Project 2 invoices
  { id: 'ili-2a1', invoice_id: 'demo-inv-2a', sov_code: '02', description: 'Demolition', scheduled_value: 55000, previous_billed: 0, current_billed: 45000, retainage_percent: 5 },
  { id: 'ili-2b1', invoice_id: 'demo-inv-2b', sov_code: '15', description: 'Mechanical / HVAC', scheduled_value: 120000, previous_billed: 0, current_billed: 32000, retainage_percent: 5 },
  { id: 'ili-2c1', invoice_id: 'demo-inv-2c', sov_code: '02', description: 'Demolition Complete', scheduled_value: 55000, previous_billed: 45000, current_billed: 10000, retainage_percent: 5 },
  { id: 'ili-2c2', invoice_id: 'demo-inv-2c', sov_code: '05', description: 'Metal Framing', scheduled_value: 42000, previous_billed: 0, current_billed: 8500, retainage_percent: 5 },
  { id: 'ili-2d1', invoice_id: 'demo-inv-2d', sov_code: '16', description: 'Electrical', scheduled_value: 85000, previous_billed: 0, current_billed: 28000, retainage_percent: 5 },
  { id: 'ili-2e1', invoice_id: 'demo-inv-2e', sov_code: '13', description: 'Fire Protection', scheduled_value: 28000, previous_billed: 0, current_billed: 14200, retainage_percent: 5 },
  { id: 'ili-2f1', invoice_id: 'demo-inv-2f', sov_code: '15', description: 'Restroom Plumbing', scheduled_value: 120000, previous_billed: 32000, current_billed: 45000, retainage_percent: 5 },
  // Project 3 invoices
  { id: 'ili-3a1', invoice_id: 'demo-inv-3a', sov_code: '07', description: 'Thermal & Moisture', scheduled_value: 98000, previous_billed: 0, current_billed: 62000, retainage_percent: 10 },
  { id: 'ili-3b1', invoice_id: 'demo-inv-3b', sov_code: '15', description: 'Plumbing', scheduled_value: 145000, previous_billed: 0, current_billed: 28000, retainage_percent: 10 },
  { id: 'ili-3c1', invoice_id: 'demo-inv-3c', sov_code: '06', description: 'Wood Framing', scheduled_value: 186000, previous_billed: 0, current_billed: 86000, retainage_percent: 10 },
  { id: 'ili-3d1', invoice_id: 'demo-inv-3d', sov_code: '07A', description: 'Roofing', scheduled_value: 72000, previous_billed: 0, current_billed: 48000, retainage_percent: 10 },
  { id: 'ili-3e1', invoice_id: 'demo-inv-3e', sov_code: '15A', description: 'HVAC', scheduled_value: 68000, previous_billed: 0, current_billed: 38000, retainage_percent: 10 },
  { id: 'ili-3f1', invoice_id: 'demo-inv-3f', sov_code: '16', description: 'Electrical', scheduled_value: 95000, previous_billed: 0, current_billed: 26400, retainage_percent: 10 },
  // Project 4 invoices
  { id: 'ili-4a1', invoice_id: 'demo-inv-4a', sov_code: '03', description: 'Concrete Foundations', scheduled_value: 240000, previous_billed: 0, current_billed: 220000, retainage_percent: 10 },
  { id: 'ili-4b1', invoice_id: 'demo-inv-4b', sov_code: '05', description: 'Structural Steel', scheduled_value: 520000, previous_billed: 0, current_billed: 485000, retainage_percent: 10 },
  { id: 'ili-4c1', invoice_id: 'demo-inv-4c', sov_code: '15', description: 'MEP Rough-In', scheduled_value: 420000, previous_billed: 0, current_billed: 380000, retainage_percent: 10 },
  { id: 'ili-4d1', invoice_id: 'demo-inv-4d', sov_code: '08', description: 'Curtain Wall', scheduled_value: 230000, previous_billed: 0, current_billed: 210000, retainage_percent: 10 },
  { id: 'ili-4e1', invoice_id: 'demo-inv-4e', sov_code: '07', description: 'Roofing & Waterproofing', scheduled_value: 180000, previous_billed: 0, current_billed: 165000, retainage_percent: 10 },
  { id: 'ili-4f1', invoice_id: 'demo-inv-4f', sov_code: '03B', description: 'Parking Garage', scheduled_value: 380000, previous_billed: 0, current_billed: 340000, retainage_percent: 10 },
  { id: 'ili-4g1', invoice_id: 'demo-inv-4g', sov_code: '13', description: 'Fire Protection', scheduled_value: 140000, previous_billed: 0, current_billed: 128000, retainage_percent: 10 },
  // Project 5 invoices
  { id: 'ili-5a1', invoice_id: 'demo-inv-5a', sov_code: '02', description: 'Selective Demo', scheduled_value: 28000, previous_billed: 0, current_billed: 24000, retainage_percent: 10 },
  { id: 'ili-5b1', invoice_id: 'demo-inv-5b', sov_code: '03', description: 'Foundation & Slab', scheduled_value: 75000, previous_billed: 0, current_billed: 68000, retainage_percent: 10 },
  { id: 'ili-5c1', invoice_id: 'demo-inv-5c', sov_code: '05', description: 'Steel Framing', scheduled_value: 160000, previous_billed: 0, current_billed: 145000, retainage_percent: 10 },
  { id: 'ili-5d1', invoice_id: 'demo-inv-5d', sov_code: '15A', description: 'HVAC', scheduled_value: 95000, previous_billed: 0, current_billed: 86000, retainage_percent: 10 },
  { id: 'ili-5e1', invoice_id: 'demo-inv-5e', sov_code: '15', description: 'Plumbing', scheduled_value: 48000, previous_billed: 0, current_billed: 42000, retainage_percent: 10 },
  // Project 6 invoices
  { id: 'ili-6a1', invoice_id: 'demo-inv-6a', sov_code: '03', description: 'Foundation & Retaining', scheduled_value: 200000, previous_billed: 0, current_billed: 185000, retainage_percent: 10 },
  { id: 'ili-6b1', invoice_id: 'demo-inv-6b', sov_code: '06', description: 'Structural Framing', scheduled_value: 265000, previous_billed: 0, current_billed: 245000, retainage_percent: 10 },
  { id: 'ili-6c1', invoice_id: 'demo-inv-6c', sov_code: '15', description: 'Plumbing & Radiant', scheduled_value: 78000, previous_billed: 0, current_billed: 68000, retainage_percent: 10 },
  { id: 'ili-6d1', invoice_id: 'demo-inv-6d', sov_code: '16', description: 'Electrical & Smart Home', scheduled_value: 105000, previous_billed: 0, current_billed: 92000, retainage_percent: 10 },
  { id: 'ili-6e1', invoice_id: 'demo-inv-6e', sov_code: '07', description: 'Standing Seam Roof', scheduled_value: 138000, previous_billed: 0, current_billed: 125000, retainage_percent: 10 },
  { id: 'ili-6f1', invoice_id: 'demo-inv-6f', sov_code: '15', description: 'Plumbing Progress', scheduled_value: 78000, previous_billed: 68000, current_billed: 72000, retainage_percent: 10 },
  // Project 7 invoices
  { id: 'ili-7a1', invoice_id: 'demo-inv-7a', sov_code: '05', description: 'Structural Reinforcement', scheduled_value: 48000, previous_billed: 0, current_billed: 42000, retainage_percent: 5 },
  { id: 'ili-7b1', invoice_id: 'demo-inv-7b', sov_code: '15', description: 'Process Plumbing', scheduled_value: 42000, previous_billed: 0, current_billed: 35000, retainage_percent: 5 },
  { id: 'ili-7c1', invoice_id: 'demo-inv-7c', sov_code: '15A', description: 'HVAC & Ventilation', scheduled_value: 58000, previous_billed: 0, current_billed: 52000, retainage_percent: 5 },
  { id: 'ili-7d1', invoice_id: 'demo-inv-7d', sov_code: '16', description: 'Electrical 3-Phase', scheduled_value: 32000, previous_billed: 0, current_billed: 28000, retainage_percent: 5 },
  { id: 'ili-7e1', invoice_id: 'demo-inv-7e', sov_code: '15', description: 'ADA Restrooms', scheduled_value: 42000, previous_billed: 35000, current_billed: 18000, retainage_percent: 5 },
  // Project 8 invoices
  { id: 'ili-8a1', invoice_id: 'demo-inv-8a', sov_code: '02', description: 'Site Grading & Utilities', scheduled_value: 105000, previous_billed: 0, current_billed: 95000, retainage_percent: 5 },
  { id: 'ili-8b1', invoice_id: 'demo-inv-8b', sov_code: '03', description: 'Concrete Slab', scheduled_value: 88000, previous_billed: 0, current_billed: 78000, retainage_percent: 5 },
  { id: 'ili-8c1', invoice_id: 'demo-inv-8c', sov_code: '03B', description: 'Tilt-Wall Panels', scheduled_value: 160000, previous_billed: 0, current_billed: 145000, retainage_percent: 5 },
  { id: 'ili-8d1', invoice_id: 'demo-inv-8d', sov_code: '15', description: 'MEP Shell', scheduled_value: 98000, previous_billed: 0, current_billed: 88000, retainage_percent: 5 },
  { id: 'ili-8e1', invoice_id: 'demo-inv-8e', sov_code: '07', description: 'Roofing', scheduled_value: 58000, previous_billed: 0, current_billed: 52000, retainage_percent: 5 },
  { id: 'ili-8f1', invoice_id: 'demo-inv-8f', sov_code: '13', description: 'Fire Sprinkler', scheduled_value: 48000, previous_billed: 0, current_billed: 42000, retainage_percent: 5 },
  // Project 9 invoices
  { id: 'ili-9a1', invoice_id: 'demo-inv-9a', sov_code: '03A', description: 'Deep Foundations', scheduled_value: 350000, previous_billed: 0, current_billed: 320000, retainage_percent: 10 },
  { id: 'ili-9b1', invoice_id: 'demo-inv-9b', sov_code: '03B', description: 'PT Slabs', scheduled_value: 520000, previous_billed: 0, current_billed: 480000, retainage_percent: 10 },
  { id: 'ili-9c1', invoice_id: 'demo-inv-9c', sov_code: '06', description: 'Wood Framing L4-5', scheduled_value: 420000, previous_billed: 0, current_billed: 385000, retainage_percent: 10 },
  { id: 'ili-9d1', invoice_id: 'demo-inv-9d', sov_code: '15', description: 'MEP Rough-In', scheduled_value: 580000, previous_billed: 0, current_billed: 520000, retainage_percent: 10 },
  { id: 'ili-9e1', invoice_id: 'demo-inv-9e', sov_code: '07', description: 'Exterior Envelope', scheduled_value: 320000, previous_billed: 0, current_billed: 295000, retainage_percent: 10 },
  { id: 'ili-9f1', invoice_id: 'demo-inv-9f', sov_code: '14', description: 'Elevators', scheduled_value: 200000, previous_billed: 0, current_billed: 185000, retainage_percent: 10 },
  { id: 'ili-9g1', invoice_id: 'demo-inv-9g', sov_code: '13', description: 'Fire Protection', scheduled_value: 155000, previous_billed: 0, current_billed: 142000, retainage_percent: 10 },
  { id: 'ili-9h1', invoice_id: 'demo-inv-9h', sov_code: '06', description: 'Framing Progress', scheduled_value: 420000, previous_billed: 385000, current_billed: 250000, retainage_percent: 10 },
  // Project 10 invoices
  { id: 'ili-10a1', invoice_id: 'demo-inv-10a', sov_code: '02', description: 'Mass Grading', scheduled_value: 200000, previous_billed: 0, current_billed: 185000, retainage_percent: 5 },
  { id: 'ili-10b1', invoice_id: 'demo-inv-10b', sov_code: '03', description: 'Slab on Grade', scheduled_value: 310000, previous_billed: 0, current_billed: 280000, retainage_percent: 5 },
  { id: 'ili-10c1', invoice_id: 'demo-inv-10c', sov_code: '03B', description: 'Tilt-Wall Panels', scheduled_value: 350000, previous_billed: 0, current_billed: 320000, retainage_percent: 5 },
  { id: 'ili-10d1', invoice_id: 'demo-inv-10d', sov_code: '05', description: 'Steel & Joists', scheduled_value: 215000, previous_billed: 0, current_billed: 195000, retainage_percent: 5 },
  { id: 'ili-10e1', invoice_id: 'demo-inv-10e', sov_code: '07', description: 'Roofing', scheduled_value: 160000, previous_billed: 0, current_billed: 145000, retainage_percent: 5 },
  { id: 'ili-10f1', invoice_id: 'demo-inv-10f', sov_code: '16', description: 'Electrical', scheduled_value: 140000, previous_billed: 0, current_billed: 125000, retainage_percent: 5 },
];

// ════════════════════════════════════════════════════════
// WORK ORDER DETAILS (one per WO — abbreviated to key WOs)
// ════════════════════════════════════════════════════════

const CL = (loc: boolean, scope: boolean, tc: boolean, mat: boolean, fc: boolean) => [
  { label: 'Location set', done: loc },
  { label: 'Scope written', done: scope },
  { label: 'TC pricing entered', done: tc },
  { label: 'Materials priced', done: mat },
  { label: 'FC hours locked', done: fc },
];

export const DEMO_WORK_ORDER_DETAILS: DemoWorkOrderDetail[] = [
  // Project 1
  { id: 'demo-wo-1a', location: 'Main House — Level 1', work_type_label: 'Framing', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-1b', location: 'Main House — Level 1 & 2', work_type_label: 'Electrical', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-1c', location: 'Main House — All Levels', work_type_label: 'Plumbing', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-1d', location: 'Main House — All Levels', work_type_label: 'HVAC', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-1e', location: 'Main House — Roof', work_type_label: 'Framing', checklist: CL(true, true, true, true, true) },
  { id: 'demo-wo-1f', location: 'Main House & ADU', work_type_label: 'Insulation', checklist: CL(true, true, false, false, false) },
  { id: 'demo-wo-1g', location: 'Main House — All Levels', work_type_label: 'Drywall', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-1h', location: 'Main House — Exterior', work_type_label: 'Exterior', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-1i', location: 'Main House — Interior', work_type_label: 'Painting', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-1j', location: 'Main House — Level 1 & 2', work_type_label: 'Flooring', checklist: CL(true, false, false, false, false) },
  // Project 2
  { id: 'demo-wo-2a', location: 'Floors 1-3 Interior', work_type_label: 'Demolition', checklist: CL(true, true, true, true, true) },
  { id: 'demo-wo-2b', location: 'Floors 1-3 Mechanical Room', work_type_label: 'HVAC', checklist: CL(true, true, true, true, true) },
  { id: 'demo-wo-2c', location: 'Floors 1-2', work_type_label: 'Electrical', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-2d', location: 'All Floors', work_type_label: 'Fire Protection', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-2e', location: 'All Floors', work_type_label: 'Metal Framing', checklist: CL(true, true, true, true, true) },
  { id: 'demo-wo-2f', location: 'All Floors', work_type_label: 'Drywall', checklist: CL(true, true, false, false, false) },
  { id: 'demo-wo-2g', location: 'All Floors', work_type_label: 'Flooring', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-2h', location: 'All Floors — 6 Restrooms', work_type_label: 'Plumbing', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-2i', location: 'Elevator Shaft', work_type_label: 'Elevator', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-2j', location: 'Ground Floor Lobby', work_type_label: 'Finishes', checklist: CL(true, false, false, false, false) },
  // Project 3
  { id: 'demo-wo-3a', location: 'Units 1-6 Exterior', work_type_label: 'Siding', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-3b', location: 'Units 1-12 All Levels', work_type_label: 'Plumbing', checklist: CL(true, true, true, false, false) },
  { id: 'demo-wo-3c', location: 'Units 7-12', work_type_label: 'Electrical', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-3d', location: 'Units 7-12', work_type_label: 'Framing', checklist: CL(true, true, true, true, true) },
  { id: 'demo-wo-3e', location: 'All Units — Roof', work_type_label: 'Roofing', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-3f', location: 'Units 1-6', work_type_label: 'HVAC', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-3g', location: 'Common Areas', work_type_label: 'Concrete', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-3h', location: 'Units 1-6 Interior', work_type_label: 'Painting', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-3i', location: 'Common Grounds', work_type_label: 'Sitework', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-3j', location: 'All Units — Garages', work_type_label: 'Doors', checklist: CL(true, false, false, false, false) },
  // Project 4
  { id: 'demo-wo-4a', location: 'Main Building', work_type_label: 'Steel', checklist: CL(true, true, true, true, true) },
  { id: 'demo-wo-4b', location: 'Main Building — Foundations', work_type_label: 'Concrete', checklist: CL(true, true, true, true, true) },
  { id: 'demo-wo-4c', location: 'All Floors', work_type_label: 'MEP', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-4d', location: 'Surgery & Patient Areas', work_type_label: 'Medical Gas', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-4e', location: 'Entire Building', work_type_label: 'Fire Protection', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-4f', location: 'Building Exterior', work_type_label: 'Glazing', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-4g', location: 'Elevator Shafts', work_type_label: 'Elevator', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-4h', location: 'Roof — All Areas', work_type_label: 'Roofing', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-4i', location: 'All Patient Areas', work_type_label: 'Framing', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-4j', location: 'Parking Garage', work_type_label: 'Concrete', checklist: CL(true, true, true, true, true) },
  { id: 'demo-wo-4k', location: 'Mechanical Yard', work_type_label: 'Electrical', checklist: CL(true, false, false, false, false) },
  // Project 5
  { id: 'demo-wo-5a', location: 'Existing Cafeteria', work_type_label: 'Demolition', checklist: CL(true, true, true, true, true) },
  { id: 'demo-wo-5b', location: 'New Addition', work_type_label: 'Concrete', checklist: CL(true, true, true, true, true) },
  { id: 'demo-wo-5c', location: 'New Wing — 12 Classrooms', work_type_label: 'Steel', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-5d', location: 'Addition & Cafeteria', work_type_label: 'Plumbing', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-5e', location: 'Addition — Roof', work_type_label: 'HVAC', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-5f', location: 'Addition — All Rooms', work_type_label: 'Electrical', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-5g', location: 'New Wing — Roof', work_type_label: 'Roofing', checklist: CL(true, true, false, false, false) },
  { id: 'demo-wo-5h', location: 'Cafeteria Kitchen', work_type_label: 'Equipment', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-5i', location: 'Addition & Existing', work_type_label: 'Fire Alarm', checklist: CL(true, true, true, true, false) },
  // Project 6
  { id: 'demo-wo-6a', location: 'Site — All Structures', work_type_label: 'Concrete', checklist: CL(true, true, true, true, true) },
  { id: 'demo-wo-6b', location: 'Main Residence', work_type_label: 'Framing', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-6c', location: 'All Structures', work_type_label: 'Plumbing', checklist: CL(true, true, true, false, false) },
  { id: 'demo-wo-6d', location: 'All Structures', work_type_label: 'Electrical', checklist: CL(true, true, true, false, false) },
  { id: 'demo-wo-6e', location: 'All Structures', work_type_label: 'HVAC', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-6f', location: 'Main Residence Exterior', work_type_label: 'Masonry', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-6g', location: 'Pool Area & Patio', work_type_label: 'Specialty', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-6h', location: 'Main Residence Interior', work_type_label: 'Millwork', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-6i', location: 'All Structures — Roof', work_type_label: 'Roofing', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-6j', location: '8 Bathrooms', work_type_label: 'Tile', checklist: CL(true, false, false, false, false) },
  // Project 7
  { id: 'demo-wo-7a', location: 'Warehouse — Mezzanine', work_type_label: 'Steel', checklist: CL(true, true, true, true, true) },
  { id: 'demo-wo-7b', location: 'Brewhouse Area', work_type_label: 'Plumbing', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-7c', location: 'Entire Building', work_type_label: 'Electrical', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-7d', location: 'Taproom & Brewhouse', work_type_label: 'HVAC', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-7e', location: 'Entire Warehouse Floor', work_type_label: 'Concrete', checklist: CL(true, true, false, false, false) },
  { id: 'demo-wo-7f', location: 'Taproom Area', work_type_label: 'Finishes', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-7g', location: 'Cold Storage Area', work_type_label: 'Refrigeration', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-7h', location: 'Main Floor', work_type_label: 'Plumbing', checklist: CL(true, true, true, true, false) },
  // Project 8
  { id: 'demo-wo-8a', location: 'Entire Site', work_type_label: 'Sitework', checklist: CL(true, true, true, true, true) },
  { id: 'demo-wo-8b', location: 'Building Footprint', work_type_label: 'Concrete', checklist: CL(true, true, true, true, true) },
  { id: 'demo-wo-8c', location: 'Building Perimeter', work_type_label: 'Tilt-Wall', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-8d', location: 'Roof Structure', work_type_label: 'Steel', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-8e', location: 'Entire Roof', work_type_label: 'Roofing', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-8f', location: 'All Tenant Spaces', work_type_label: 'MEP', checklist: CL(true, true, true, false, false) },
  { id: 'demo-wo-8g', location: 'Tenant Storefronts', work_type_label: 'Glazing', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-8h', location: 'Parking Areas', work_type_label: 'Paving', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-8i', location: 'Entire Building', work_type_label: 'Fire Protection', checklist: CL(true, true, true, true, false) },
  // Project 9
  { id: 'demo-wo-9a', location: 'Below Grade', work_type_label: 'Foundations', checklist: CL(true, true, true, true, true) },
  { id: 'demo-wo-9b', location: 'Podium & Levels 1-3', work_type_label: 'PT Concrete', checklist: CL(true, true, true, true, true) },
  { id: 'demo-wo-9c', location: 'Levels 4-5', work_type_label: 'Wood Framing', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-9d', location: 'All Floors', work_type_label: 'MEP', checklist: CL(true, true, true, false, false) },
  { id: 'demo-wo-9e', location: 'Elevator Shafts', work_type_label: 'Elevator', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-9f', location: 'Building Exterior', work_type_label: 'Envelope', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-9g', location: 'All Floors', work_type_label: 'Fire Protection', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-9h', location: 'Ground Floor', work_type_label: 'Retail Shell', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-9i', location: 'Roof & Podium Deck', work_type_label: 'Waterproofing', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-9j', location: 'Below Grade Garage', work_type_label: 'Garage Finishes', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-9k', location: '80 Residential Units', work_type_label: 'Unit Finishes', checklist: CL(true, false, false, false, false) },
  // Project 10
  { id: 'demo-wo-10a', location: 'Entire 12-Acre Site', work_type_label: 'Sitework', checklist: CL(true, true, true, true, true) },
  { id: 'demo-wo-10b', location: 'Building Footprint', work_type_label: 'Slab', checklist: CL(true, true, true, true, true) },
  { id: 'demo-wo-10c', location: 'Building Perimeter', work_type_label: 'Tilt-Wall', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-10d', location: 'Roof Structure', work_type_label: 'Steel', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-10e', location: 'Entire Roof', work_type_label: 'Roofing', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-10f', location: 'Dock Area — 20 Positions', work_type_label: 'Equipment', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-10g', location: 'Warehouse & Office', work_type_label: 'Electrical', checklist: CL(true, true, true, false, false) },
  { id: 'demo-wo-10h', location: 'Entire Warehouse', work_type_label: 'Fire Sprinkler', checklist: CL(true, true, true, true, false) },
  { id: 'demo-wo-10i', location: 'Office Area', work_type_label: 'Office Build-Out', checklist: CL(true, false, false, false, false) },
  { id: 'demo-wo-10j', location: 'Truck Court & Lot', work_type_label: 'Paving', checklist: CL(true, false, false, false, false) },
];

// ════════════════════════════════════════════════════════
// DEMO PROJECT SCOPE (for wizard)
// ════════════════════════════════════════════════════════

export const DEMO_PROJECT_SCOPE = {
  structures: [
    { id: 'ds-1', name: 'Main House', levels: ['Level 1', 'Level 2', 'Attic'] },
    { id: 'ds-2', name: 'ADU', levels: ['Level 1'] },
    { id: 'ds-3', name: 'Garage', levels: ['Level 1'] },
  ],
  exterior_features: ['Front Porch', 'Rear Deck', 'Driveway', 'Landscaping'],
};

// ════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════

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
  const rfis = DEMO_RFIS.filter(r => r.project_id === projectId);
  const poLineItems = DEMO_PO_LINE_ITEMS.filter(li => purchaseOrders.some(po => po.id === li.po_id));
  const invoiceLineItems = DEMO_INVOICE_LINE_ITEMS.filter(li => invoices.some(inv => inv.id === li.invoice_id));
  const workOrderDetails = DEMO_WORK_ORDER_DETAILS.filter(d => workOrders.some(wo => wo.id === d.id));

  return { attentionItems, workOrders, purchaseOrders, invoices, contracts, sovItems, rfis, poLineItems, invoiceLineItems, workOrderDetails };
}

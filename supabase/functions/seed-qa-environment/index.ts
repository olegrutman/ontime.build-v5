import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Test account constants ──────────────────────────────────────────
const GC_USER_ID  = 'ef6822a5-c7c0-4a0d-8ac6-3e8647d0452a'
const TC_USER_ID  = '5ee21ec7-775e-413b-9999-c941ed21a431'
const FC_USER_ID  = '038e7252-b863-439a-8e21-895e37ec731f'
const SUPP_USER_ID = '2844b6d1-0a99-41ce-9aed-4eca7598e32a'

const GC_ORG_ID   = '96a802b8-72a4-42e5-aa00-b7c675a9bb62'
const TC_ORG_ID   = 'ab07e031-1ea7-4ee9-be15-8c1d7a19dcd6'
const FC_ORG_ID   = '6e563ffc-32f1-4f52-a8f9-95e274cad56f'
const SUPP_ORG_ID = '12b5d7de-1bd1-431d-9601-93ba3d56870b'
const SUPPLIER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

function uuid() { return crypto.randomUUID() }

// ── 7 Project definitions ───────────────────────────────────────────
interface ProjectDef {
  name: string; project_type: string; build_type: string; contract_mode: string;
  city: string; state: string; zip: string; street: string;
  home_type: string; healthy: boolean;
  scope: object; structures: object[];
  scopeDetails: Record<string, unknown>;
  gcContract: number; tcContract: number; retainage: number;
  trade: string; phase: string;
  poNames: [string, string]; // supplier-themed PO names
  coConfigs: { title: string; reason: string; pricing: string; status: string; gcBudget: number; tcPrice: number | null }[];
  invoiceConfigs: { status: string; desc: string; pct: number }[];
  rfiSubjects: [string, string];
}

const PROJECTS: ProjectDef[] = [
  // ── 1. Cherry Hills Park (Single-Family Custom) ──
  {
    name: '5 Cherry Hills Park', project_type: 'residential', build_type: 'new_construction', contract_mode: 'fixed',
    city: 'Cherry Hills Village', state: 'CO', zip: '80113', street: '5 Cherry Hills Park Dr',
    home_type: 'custom_home', healthy: true, trade: 'Framing', phase: 'Framing (L2-4)',
    scope: { framing: true, exterior: true, windows: true },
    structures: [{ label: 'Main House', floors: 2 }],
    scopeDetails: { home_type: 'custom_home', floors: 2, stories: 2, bedrooms: 5, bathrooms: 4, foundation_type: 'slab_on_grade', garage_type: 'attached', garage_cars: 3, total_sqft: 5800, framing_method: 'stick', roof_type: 'hip', has_balconies: true, balcony_type: 'cantilevered', fascia_included: true, soffit_included: true, windows_included: true },
    gcContract: 420000, tcContract: 290000, retainage: 10,
    poNames: ['Cascade Lumber — Framing Package', 'White Cap — Fasteners & Connectors'],
    coConfigs: [
      { title: 'L3 Scope Addition — Master Suite Expansion', reason: 'owner_requested', pricing: 'fixed', status: 'approved', gcBudget: 12000, tcPrice: 14500 }, // over-budget edge case
      { title: 'Blueprint Change — Load-Bearing Wall L2', reason: 'blueprint_change', pricing: 'tm', status: 'completed', gcBudget: 8200, tcPrice: 7100 },
    ],
    invoiceConfigs: [
      { status: 'REJECTED', desc: 'Progress Draw #1 — Mobilization + 1st Floor (line items disputed)', pct: 25 },
      { status: 'PAID', desc: 'Progress Draw #0 — Deposit', pct: 10 },
    ],
    rfiSubjects: ['Beam size discrepancy — kitchen header at 14ft span', 'Exterior trim material substitution — cedar vs PVC'],
  },
  // ── 2. Tower 14 Phase 2 (Multi-Family Mid-Rise) ──
  {
    name: 'Tower 14 Phase 2', project_type: 'residential', build_type: 'new_construction', contract_mode: 'fixed',
    city: 'Denver', state: 'CO', zip: '80205', street: '2800 Walnut St',
    home_type: 'apartments_mf', healthy: true, trade: 'Structural Steel + Framing', phase: 'Structural (L6-9)',
    scope: { framing: true, exterior: true, windows: true },
    structures: [{ label: 'Tower 14 Bldg B', floors: 9, units: 96 }],
    scopeDetails: { home_type: 'apartments_mf', floors: 9, stories: 9, num_buildings: 1, num_units: 96, has_elevator: true, construction_type: 'steel_frame', total_sqft: 112000, framing_method: 'stick', roof_type: 'flat', has_balconies: true, balcony_type: 'hung', fascia_included: true, soffit_included: true, windows_included: true },
    gcContract: 680000, tcContract: 465000, retainage: 10,
    poNames: ['Steel & Pipe Supply — Structural Steel', 'HD Supply — Decking & Fasteners'],
    coConfigs: [
      { title: 'Window Rough-In Adjustment L7', reason: 'field_condition', pricing: 'fixed', status: 'submitted', gcBudget: 3200, tcPrice: 2800 },
      { title: 'Elevator Shaft Reinforcement', reason: 'blueprint_change', pricing: 'tm', status: 'approved', gcBudget: 9500, tcPrice: 8200 },
    ],
    invoiceConfigs: [
      { status: 'APPROVED', desc: 'Progress Draw #1 — Structural Steel L6-L7', pct: 30 },
      { status: 'SUBMITTED', desc: 'Progress Draw #2 — Framing L8 Rough-In', pct: 20 },
    ],
    rfiSubjects: ['Steel connection detail at L7 transfer beam', 'Fire-rated assembly at elevator lobby — UL U465 vs U419'],
  },
  // ── 3. Mesa Logistics Hub (Industrial Warehouse) ──
  {
    name: 'Mesa Logistics Hub', project_type: 'commercial', build_type: 'new_construction', contract_mode: 'fixed',
    city: 'Mesa', state: 'AZ', zip: '85201', street: '4400 E Main St',
    home_type: 'custom_home', healthy: false, trade: 'MEP', phase: 'MEP Rough-in → Closeout',
    scope: { framing: true, exterior: true },
    structures: [{ label: 'Warehouse A', floors: 1 }],
    scopeDetails: { home_type: 'custom_home', floors: 1, stories: 1, total_sqft: 48000, framing_method: 'stick', roof_type: 'flat', foundation_type: 'slab_on_grade', fascia_included: true, soffit_included: true },
    gcContract: 290000, tcContract: 198000, retainage: 10,
    poNames: ['Ferguson — MEP Fittings & Valves', 'Graybar — Electrical Conduit & Wire'],
    coConfigs: [
      { title: 'Short Delivery — Conduit Bundle (18 of 20)', reason: 'field_condition', pricing: 'fixed', status: 'submitted', gcBudget: 1200, tcPrice: 980 },
      { title: 'Dock Leveler MEP Relocation', reason: 'design_conflict', pricing: 'tm', status: 'draft', gcBudget: 4500, tcPrice: null },
    ],
    invoiceConfigs: [
      { status: 'SUBMITTED', desc: 'Progress Draw #1 — MEP Rough-In Phase 1', pct: 35 },
      { status: 'DRAFT', desc: 'Progress Draw #2 — Closeout Punch List', pct: 15 },
    ],
    rfiSubjects: ['Fire sprinkler head spacing — NFPA 13 warehouse standard', 'Overhead crane power feed routing — NEC 610'],
  },
  // ── 4. Apex Retail Center (Commercial Ground-Up) ──
  {
    name: 'Apex Retail Center', project_type: 'commercial', build_type: 'new_construction', contract_mode: 'fixed',
    city: 'Aurora', state: 'CO', zip: '80012', street: '14200 E Alameda Ave',
    home_type: 'custom_home', healthy: true, trade: 'Concrete + Site', phase: 'Pre-construction / Setup',
    scope: { framing: true, exterior: true, windows: true },
    structures: [{ label: 'Retail Building A', floors: 2 }, { label: 'Retail Building B', floors: 1 }],
    scopeDetails: { home_type: 'custom_home', floors: 2, stories: 2, total_sqft: 32000, framing_method: 'stick', roof_type: 'flat', foundation_type: 'slab_on_grade', fascia_included: true, soffit_included: true, windows_included: true },
    gcContract: 520000, tcContract: 355000, retainage: 10,
    poNames: ['Sunbelt Rentals — Equipment & Forming', 'CRH Americas — Concrete & Rebar'],
    coConfigs: [
      { title: 'Foundation Redesign — Soil Report Update', reason: 'field_condition', pricing: 'fixed', status: 'approved', gcBudget: 18000, tcPrice: 15200 },
      { title: 'Storefront Rough-In — Tenant A', reason: 'owner_requested', pricing: 'fixed', status: 'pending_approval', gcBudget: 6500, tcPrice: 5400 },
    ],
    invoiceConfigs: [
      { status: 'APPROVED', desc: 'Progress Draw #1 — Mobilization & Site Prep', pct: 15 },
      { status: 'PAID', desc: 'Progress Draw #0 — Pre-Construction Services', pct: 5 },
    ],
    rfiSubjects: ['Concrete mix design — 4500 PSI vs 5000 PSI per structural', 'Rebar lap splice length at foundation corners'],
  },
  // ── 5. Hyatt Studios DEN (Hospitality Exterior) — T&M ──
  {
    name: 'Hyatt Studios DEN', project_type: 'commercial', build_type: 'new_construction', contract_mode: 'tm',
    city: 'Denver', state: 'CO', zip: '80249', street: '24500 E 78th Ave',
    home_type: 'hotel_hospitality', healthy: true, trade: 'Exterior / EIFS', phase: 'EIFS Exterior (L2-4)',
    scope: { framing: true, exterior: true, windows: true },
    structures: [{ label: 'Hotel Tower', floors: 4, units: 120 }],
    scopeDetails: { home_type: 'hotel_hospitality', floors: 4, stories: 4, num_buildings: 1, num_units: 120, has_elevator: true, construction_type: 'steel_frame', total_sqft: 86000, roof_type: 'flat', fascia_included: true, soffit_included: true, windows_included: true },
    gcContract: 740000, tcContract: 505000, retainage: 5,
    poNames: ['Dryvit — EIFS Base Coat & Finish', 'ABC Supply — Flashing & Accessories'],
    coConfigs: [
      { title: 'EIFS Color Change — South Elevation', reason: 'owner_requested', pricing: 'tm', status: 'approved', gcBudget: 5500, tcPrice: 4800 },
      { title: 'Balcony Waterproofing Detail Addition', reason: 'blueprint_change', pricing: 'tm', status: 'completed', gcBudget: 11000, tcPrice: 9200 },
    ],
    invoiceConfigs: [
      { status: 'SUBMITTED', desc: 'T&M Invoice #1 — EIFS Application L2-L3', pct: 28 },
      { status: 'APPROVED', desc: 'T&M Invoice #2 — Flashing & WRB Install', pct: 18 },
    ],
    rfiSubjects: ['EIFS base coat thickness at window returns — ASTM E2568', 'Expansion joint spacing on south elevation — 40ft max?'],
  },
  // ── 6. Beacon Heights TI (Tenant Improvement) — T&M ──
  {
    name: 'Beacon Heights TI', project_type: 'commercial', build_type: 'renovation', contract_mode: 'tm',
    city: 'Lone Tree', state: 'CO', zip: '80124', street: '9800 Pyramid Ct',
    home_type: 'custom_home', healthy: false, trade: 'Drywall + Finish Carpentry', phase: 'Demo → Drywall → Finish',
    scope: { framing: true, exterior: false },
    structures: [{ label: 'Suite 200', floors: 1 }],
    scopeDetails: { home_type: 'custom_home', floors: 1, stories: 1, total_sqft: 4200, framing_method: 'stick', roof_type: 'flat', fascia_included: false, soffit_included: false },
    gcContract: 185000, tcContract: 126000, retainage: 5,
    poNames: ['USG — Drywall & Compound', 'Sherwin-Williams — Paint & Primer'],
    coConfigs: [
      { title: 'Deductive CO — Removed Soffit Work (scope reduction)', reason: 'owner_requested', pricing: 'fixed', status: 'approved', gcBudget: -3200, tcPrice: -2800 }, // deductive
      { title: 'Additional Demo — Concealed Asbestos Abatement', reason: 'field_condition', pricing: 'tm', status: 'submitted', gcBudget: 8500, tcPrice: 7200 },
    ],
    invoiceConfigs: [
      { status: 'SUBMITTED', desc: 'T&M Invoice — Demo & Drywall Phase (exceeds WO est.)', pct: 45 }, // over WO value edge
      { status: 'DRAFT', desc: 'T&M Invoice — Finish Carpentry (incomplete)', pct: 20 },
    ],
    rfiSubjects: ['Drywall finishing level — Level 4 vs Level 5 at lobby', 'Existing header capacity above new opening — Suite 200'],
  },
  // ── 7. Westfield Medical Renovation (Healthcare Reno) — T&M ──
  {
    name: 'Westfield Medical Renovation', project_type: 'commercial', build_type: 'renovation', contract_mode: 'tm',
    city: 'Westminster', state: 'CO', zip: '80031', street: '3550 W 72nd Ave',
    home_type: 'custom_home', healthy: false, trade: 'MEP + Drywall', phase: 'MEP + Drywall, Occupied Bldg',
    scope: { framing: true, exterior: false },
    structures: [{ label: 'Medical Office Wing B', floors: 2 }],
    scopeDetails: { home_type: 'custom_home', floors: 2, stories: 2, total_sqft: 9600, framing_method: 'stick', roof_type: 'flat', fascia_included: false, soffit_included: false },
    gcContract: 340000, tcContract: 232000, retainage: 10,
    poNames: ['Ferguson — Medical Gas & Plumbing', 'USG — Type X Drywall & Sealant'],
    coConfigs: [
      { title: 'Revised CO — Hidden Rot at L2 Rim Joist (re-drafted after rejection)', reason: 'field_condition', pricing: 'fixed', status: 'submitted', gcBudget: 6800, tcPrice: 5900 },
      { title: 'Damaged Delivery — Credit Memo Flow', reason: 'damage_by_others', pricing: 'fixed', status: 'rejected', gcBudget: 2400, tcPrice: 1950 },
    ],
    invoiceConfigs: [
      { status: 'APPROVED', desc: 'Progress Draw #1 — MEP Rough-In Phase 1', pct: 30 },
      { status: 'REJECTED', desc: 'Progress Draw #2 — Drywall (amounts inconsistent with SOV)', pct: 20 },
    ],
    rfiSubjects: ['Medical gas outlet placement — NFPA 99 compliance', 'Occupied building work hours restriction — infection control'],
  },
]

// ── SOV templates (7-phase) ─────────────────────────────────────────
function buildSOVItems(sovId: string, projectId: string, contractValue: number) {
  const phases = [
    { name: 'Mobilization & Layout', group: 'Mobilization', pct: 3 },
    { name: '1st Floor Framing', group: 'Structural Framing', pct: 22 },
    { name: '2nd Floor Framing', group: 'Structural Framing', pct: 20 },
    { name: 'Roof Framing & Sheathing', group: 'Structural Framing', pct: 18 },
    { name: 'Exterior Sheathing & WRB', group: 'Building Envelope', pct: 12 },
    { name: 'Window & Door Install', group: 'Building Envelope', pct: 10 },
    { name: 'Fascia, Soffit & Trim', group: 'Exterior Finish', pct: 15 },
  ]
  return phases.map((p, i) => ({
    id: uuid(), sov_id: sovId, project_id: projectId,
    sort_order: i + 1, item_name: p.name, item_group: p.group,
    default_enabled: true, source: 'ai',
    percent_of_contract: p.pct,
    value_amount: Math.round(contractValue * p.pct / 100),
    scheduled_value: Math.round(contractValue * p.pct / 100),
    billed_to_date: 0, remaining_amount: Math.round(contractValue * p.pct / 100),
    total_billed_amount: 0, total_completion_percent: 0,
    billing_status: 'not_started', is_locked: false,
  }))
}

// ── Material data by category ───────────────────────────────────────
const LUMBER_ITEMS = [
  { desc: '2x6x16 SPF #2 Studs', sku: 'LBR-2616', uom: 'EA', qty: 240, price: 8.95 },
  { desc: '2x4x8 SPF #2 Studs', sku: 'LBR-2408', uom: 'EA', qty: 520, price: 4.25 },
  { desc: 'LVL 1-3/4x11-7/8x24', sku: 'LVL-11824', uom: 'EA', qty: 12, price: 185.00 },
  { desc: '3/4 CDX Plywood 4x8', sku: 'PLY-3448', uom: 'EA', qty: 180, price: 42.50 },
  { desc: '7/16 OSB Sheathing 4x8', sku: 'OSB-71648', uom: 'EA', qty: 220, price: 28.75 },
  { desc: '2x10x12 #2 SYP Floor Joist', sku: 'LBR-21012', uom: 'EA', qty: 88, price: 16.40 },
  { desc: '2x12x16 Doug Fir #1 Ridge', sku: 'LBR-21216', uom: 'EA', qty: 8, price: 32.50 },
  { desc: 'TJI 230 11-7/8x16 I-Joist', sku: 'TJI-23016', uom: 'EA', qty: 42, price: 28.90 },
]

const HARDWARE_ITEMS = [
  { desc: 'Simpson HDU2 Hold-Down', sku: 'SMP-HDU2', uom: 'EA', qty: 16, price: 42.80 },
  { desc: 'Simpson LTP4 Tie Plate', sku: 'SMP-LTP4', uom: 'EA', qty: 48, price: 3.25 },
  { desc: 'USP A35 Framing Angle', sku: 'USP-A35', uom: 'EA', qty: 120, price: 1.85 },
  { desc: '1/2x10 Anchor Bolt w/Nut', sku: 'HW-AB510', uom: 'EA', qty: 64, price: 4.50 },
  { desc: 'Simpson H10A Hurricane Tie', sku: 'SMP-H10A', uom: 'EA', qty: 96, price: 2.10 },
  { desc: '3x.131 Framing Nail (5000ct)', sku: 'NL-3131', uom: 'BX', qty: 8, price: 65.00 },
]

const MEP_ITEMS = [
  { desc: '3/4" Type L Copper Pipe 10ft', sku: 'MEP-CU34', uom: 'EA', qty: 60, price: 28.50 },
  { desc: '1/2" PEX-A Tubing 100ft Coil', sku: 'MEP-PEX12', uom: 'EA', qty: 24, price: 42.00 },
  { desc: '3/4" EMT Conduit 10ft', sku: 'MEP-EMT34', uom: 'EA', qty: 200, price: 4.85 },
  { desc: '#12 THHN Wire 500ft Spool', sku: 'MEP-THN12', uom: 'EA', qty: 8, price: 125.00 },
  { desc: '4" PVC DWV Pipe 10ft', sku: 'MEP-PVC4', uom: 'EA', qty: 40, price: 18.90 },
  { desc: 'Med Gas Outlet (O2)?"x?"', sku: 'MEP-MGO2', uom: 'EA', qty: 12, price: 285.00 },
]

const DRYWALL_ITEMS = [
  { desc: '5/8" Type X Gypsum 4x8', sku: 'DW-58X48', uom: 'EA', qty: 320, price: 16.80 },
  { desc: '1/2" Regular Gypsum 4x12', sku: 'DW-12R412', uom: 'EA', qty: 180, price: 14.50 },
  { desc: 'USG Sheetrock All-Purpose 5gal', sku: 'DW-AP5G', uom: 'EA', qty: 24, price: 18.90 },
  { desc: '250ft Paper Joint Tape Roll', sku: 'DW-TAPE', uom: 'EA', qty: 36, price: 4.25 },
  { desc: 'Corner Bead 8ft Metal', sku: 'DW-CB8', uom: 'EA', qty: 80, price: 3.10 },
]

const EIFS_ITEMS = [
  { desc: 'Dryvit Outsulation Plus MD 2"', sku: 'EIFS-OP2', uom: 'SF', qty: 8500, price: 2.85 },
  { desc: 'Dryvit Primus Basecoat 5gal', sku: 'EIFS-PB5', uom: 'EA', qty: 48, price: 68.00 },
  { desc: 'Reinforcing Mesh 38"x150ft', sku: 'EIFS-RM38', uom: 'EA', qty: 24, price: 95.00 },
  { desc: 'Dryvit Sandpebble Fine Finish', sku: 'EIFS-SPF', uom: 'EA', qty: 36, price: 78.00 },
]

const CONCRETE_ITEMS = [
  { desc: '5000 PSI Ready Mix (per CY)', sku: 'CON-5K', uom: 'CY', qty: 180, price: 165.00 },
  { desc: '#5 Rebar 20ft Grade 60', sku: 'CON-RB5', uom: 'EA', qty: 400, price: 12.80 },
  { desc: 'Wire Mesh 6x6 W2.9xW2.9', sku: 'CON-WM6', uom: 'EA', qty: 120, price: 68.00 },
  { desc: 'Form Lumber 2x10x12 SYP', sku: 'CON-FL210', uom: 'EA', qty: 200, price: 16.40 },
]

// Map project index to appropriate material sets
function getMaterialSets(projectIndex: number): [typeof LUMBER_ITEMS, typeof HARDWARE_ITEMS] {
  switch (projectIndex) {
    case 0: return [LUMBER_ITEMS, HARDWARE_ITEMS] // Cherry Hills — framing
    case 1: return [LUMBER_ITEMS, HARDWARE_ITEMS] // Tower 14 — structural
    case 2: return [MEP_ITEMS, MEP_ITEMS.slice(2)] // Mesa — MEP
    case 3: return [CONCRETE_ITEMS, HARDWARE_ITEMS] // Apex — concrete
    case 4: return [EIFS_ITEMS, HARDWARE_ITEMS.slice(0, 4)] // Hyatt — EIFS
    case 5: return [DRYWALL_ITEMS, HARDWARE_ITEMS.slice(0, 3)] // Beacon — drywall
    case 6: return [MEP_ITEMS.slice(0, 4), DRYWALL_ITEMS.slice(0, 4)] // Westfield — MEP+drywall
    default: return [LUMBER_ITEMS, HARDWARE_ITEMS]
  }
}

// ── CO scope items per trade ────────────────────────────────────────
const CO_SCOPE_ITEMS = [
  { name: 'Interior wall framing — 2nd floor bedrooms', category: 'Structural Framing', unit: 'LF' },
  { name: 'Header install — kitchen pass-through', category: 'Structural Framing', unit: 'EA' },
  { name: 'Exterior soffit repair — front elevation', category: 'Exterior Finish', unit: 'SF' },
  { name: 'Balcony railing framing — master bedroom', category: 'Exterior Finish', unit: 'LF' },
  { name: 'Window rough-in — west elevation', category: 'Building Envelope', unit: 'EA' },
  { name: 'Patio door header — rear entry', category: 'Structural Framing', unit: 'EA' },
  { name: 'Stairwell framing — basement access', category: 'Structural Framing', unit: 'LF' },
  { name: 'Fascia board replacement — south gable', category: 'Exterior Finish', unit: 'LF' },
  { name: 'MEP conduit relocation — dock area', category: 'MEP', unit: 'LF' },
  { name: 'Drywall patch & finish — Suite 200', category: 'Interior Finish', unit: 'SF' },
  { name: 'EIFS base coat repair — south elevation', category: 'Exterior Finish', unit: 'SF' },
  { name: 'Medical gas outlet relocation — Exam Room 4', category: 'MEP', unit: 'EA' },
]

// ── Main handler ────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Auth: allow unauthenticated calls (service-level), or require PLATFORM_OWNER if token present
    const authHeader = req.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      // Check if the token is the anon key (from direct invocation) — skip role check
      if (token !== anonKey) {
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        })
        const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token)
        if (!claimsError && claimsData?.claims) {
          const callerId = claimsData.claims.sub as string
          const { data: roleData } = await db.rpc('get_platform_role', { _user_id: callerId })
          if (roleData !== 'PLATFORM_OWNER') {
            return new Response(JSON.stringify({ error: 'Forbidden — PLATFORM_OWNER required' }), { status: 403, headers: corsHeaders })
          }
        }
      }
    }

    const body = await req.json().catch(() => ({}))
    const action = body.action || 'seed'

    // ── CLEAR ───────────────────────────────
    if (action === 'clear') {
      const { data: testProjects } = await db.from('projects').select('id').eq('created_by', GC_USER_ID)
      if (testProjects && testProjects.length > 0) {
        const projectIds = testProjects.map((p: any) => p.id)

        for (const pid of projectIds) {
          // Returns + return items
          const { data: returns } = await db.from('returns').select('id').eq('project_id', pid)
          if (returns?.length) {
            for (const r of returns) {
              await db.from('return_items').delete().eq('return_id', r.id)
            }
            await db.from('returns').delete().eq('project_id', pid)
          }
          // Invoice line items + invoices
          const { data: invoices } = await db.from('invoices').select('id').eq('project_id', pid)
          if (invoices?.length) {
            for (const inv of invoices) {
              await db.from('invoice_line_items').delete().eq('invoice_id', inv.id)
            }
            await db.from('invoices').delete().eq('project_id', pid)
          }
          // CO children
          const { data: cos } = await db.from('change_orders').select('id').eq('project_id', pid)
          if (cos?.length) {
            for (const co of cos) {
              await db.from('co_labor_entries').delete().eq('co_id', co.id)
              await db.from('co_material_items').delete().eq('co_id', co.id)
              await db.from('co_line_items').delete().eq('co_id', co.id)
              await db.from('co_equipment_items').delete().eq('co_id', co.id)
              await db.from('co_activity').delete().eq('co_id', co.id)
            }
            await db.from('change_orders').delete().eq('project_id', pid)
          }
          // PO children
          const { data: pos } = await db.from('purchase_orders').select('id').eq('project_id', pid)
          if (pos?.length) {
            for (const po of pos) {
              await db.from('po_line_items').delete().eq('po_id', po.id)
            }
            await db.from('purchase_orders').delete().eq('project_id', pid)
          }
          // RFIs
          await db.from('project_rfis').delete().eq('project_id', pid)
          // SOV items + SOV
          await db.from('project_sov_items').delete().eq('project_id', pid)
          await db.from('project_sov').delete().eq('project_id', pid)
          // Designated suppliers
          await db.from('project_designated_suppliers').delete().eq('project_id', pid)
          // Contracts, team, participants, scope details
          await db.from('project_contracts').delete().eq('project_id', pid)
          await db.from('project_team').delete().eq('project_id', pid)
          await db.from('project_participants').delete().eq('project_id', pid)
          await db.from('project_scope_details').delete().eq('project_id', pid)
        }
        await db.from('projects').delete().eq('created_by', GC_USER_ID)
      }
      return new Response(JSON.stringify({ success: true, action: 'clear', deleted: testProjects?.length || 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── SEED ────────────────────────────────
    const results: any[] = []

    for (let projectIndex = 0; projectIndex < PROJECTS.length; projectIndex++) {
      const def = PROJECTS[projectIndex]
      const projectId = uuid()
      const now = new Date().toISOString()
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
      const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString()

      // 1. Create project
      const { error: projErr } = await db.from('projects').insert({
        id: projectId, organization_id: GC_ORG_ID, name: def.name,
        project_type: def.project_type, build_type: def.build_type,
        contract_mode: def.contract_mode,
        status: def.healthy ? 'active' : 'setup',
        address: { street: def.street, city: def.city, state: def.state, zip: def.zip },
        city: def.city, state: def.state, zip: def.zip,
        scope: def.scope, structures: def.structures,
        retainage_percent: def.retainage,
        created_by: GC_USER_ID, created_by_org_id: GC_ORG_ID,
        start_date: new Date(Date.now() - 45 * 86400000).toISOString().split('T')[0],
      })
      if (projErr) { results.push({ project: def.name, error: projErr.message }); continue }

      // 2. Scope details
      await db.from('project_scope_details').insert({ id: uuid(), project_id: projectId, ...def.scopeDetails })

      // 3. Participants — ALL ACCEPTED for visibility
      const fcStatus = def.healthy ? 'ACCEPTED' : (projectIndex === 2 ? 'PENDING' : 'ACCEPTED')
      await db.from('project_participants').insert([
        { id: uuid(), project_id: projectId, organization_id: GC_ORG_ID, role: 'GC', invited_by: GC_USER_ID, invite_status: 'ACCEPTED', accepted_at: sixtyDaysAgo, material_responsibility: 'gc' },
        { id: uuid(), project_id: projectId, organization_id: TC_ORG_ID, role: 'TC', invited_by: GC_USER_ID, invite_status: 'ACCEPTED', accepted_at: sixtyDaysAgo },
        { id: uuid(), project_id: projectId, organization_id: FC_ORG_ID, role: 'FC', invited_by: TC_USER_ID, invite_status: fcStatus, accepted_at: fcStatus === 'ACCEPTED' ? thirtyDaysAgo : null },
      ])

      // 4. Team members
      const gcTeamId = uuid(); const tcTeamId = uuid(); const fcTeamId = uuid()
      await db.from('project_team').insert([
        { id: gcTeamId, project_id: projectId, org_id: GC_ORG_ID, user_id: GC_USER_ID, role: 'GC_PM', trade: 'General', status: 'Accepted', invited_by_user_id: GC_USER_ID, invited_email: 'gc@test.com', invited_name: 'John Smith' },
        { id: tcTeamId, project_id: projectId, org_id: TC_ORG_ID, user_id: TC_USER_ID, role: 'TC_PM', trade: def.trade, status: 'Accepted', invited_by_user_id: GC_USER_ID, invited_email: 'tc@test.com', invited_name: 'Mike Gold' },
        { id: fcTeamId, project_id: projectId, org_id: FC_ORG_ID, user_id: FC_USER_ID, role: 'FC_PM', trade: def.trade, status: fcStatus === 'ACCEPTED' ? 'Accepted' : 'Pending', invited_by_user_id: TC_USER_ID, invited_email: 'fc@test.com', invited_name: 'Tim Cook' },
      ])

      // 5. Contracts
      const gcTcContractId = uuid(); const tcFcContractId = uuid()
      await db.from('project_contracts').insert([
        {
          id: gcTcContractId, project_id: projectId,
          from_org_id: GC_ORG_ID, to_org_id: TC_ORG_ID,
          to_project_team_id: tcTeamId,
          from_role: 'GC_PM', to_role: 'TC_PM', trade: def.trade,
          contract_sum: def.gcContract, retainage_percent: def.retainage,
          labor_budget: Math.round(def.gcContract * 0.65),
          material_responsibility: 'gc',
          owner_contract_value: Math.round(def.gcContract * 1.25),
          status: 'accepted', created_by_user_id: GC_USER_ID,
          sent_at: sixtyDaysAgo, accepted_at: sixtyDaysAgo,
        },
        {
          id: tcFcContractId, project_id: projectId,
          from_org_id: TC_ORG_ID, to_org_id: FC_ORG_ID,
          to_project_team_id: fcTeamId,
          from_role: 'TC_PM', to_role: 'FC_PM', trade: def.trade,
          contract_sum: def.tcContract, retainage_percent: def.retainage,
          labor_budget: Math.round(def.tcContract * 0.85),
          material_responsibility: 'tc',
          status: fcStatus === 'ACCEPTED' ? 'accepted' : 'draft',
          created_by_user_id: TC_USER_ID,
          sent_at: fcStatus === 'ACCEPTED' ? thirtyDaysAgo : null,
          accepted_at: fcStatus === 'ACCEPTED' ? thirtyDaysAgo : null,
        },
      ])

      // 6. SOV (healthy projects get full SOV; unhealthy get partial or none for T&M)
      let sovId: string | null = null
      if (def.contract_mode === 'fixed' || def.healthy) {
        sovId = uuid()
        await db.from('project_sov').insert({
          id: sovId, project_id: projectId, contract_id: gcTcContractId,
          sov_name: `${def.name} — Primary SOV`, is_locked: def.healthy, version: 1,
          locked_at: def.healthy ? thirtyDaysAgo : null,
          locked_by: def.healthy ? GC_USER_ID : null,
        })
        const sovItems = buildSOVItems(sovId, projectId, def.gcContract)
        const itemsToInsert = def.healthy ? sovItems : sovItems.slice(0, 4)
        await db.from('project_sov_items').insert(itemsToInsert)
      }

      // 7. Designated suppliers
      await db.from('project_designated_suppliers').insert({
        id: uuid(), project_id: projectId,
        user_id: SUPP_USER_ID,
        invited_email: 'supp@test.com', invited_name: 'Greg Moon',
        status: 'accepted', designated_by: GC_USER_ID,
      })

      // 8. Purchase Orders (2 per project) ───
      const [matSet1, matSet2] = getMaterialSets(projectIndex)
      const poStatuses: string[] = projectIndex < 4
        ? ['SUBMITTED', 'DELIVERED'] // first 4 projects: one submitted, one delivered
        : ['PRICED', 'ORDERED']     // last 3: one priced, one ordered

      for (let pi = 0; pi < 2; pi++) {
        const poId = uuid()
        const status = poStatuses[pi]
        const items = pi === 0 ? matSet1.slice(0, 5) : matSet2.slice(0, 4)
        const poSubtotal = items.reduce((s, it) => s + it.qty * it.price, 0)
        const taxPct = def.state === 'AZ' ? 8.6 : 7.65
        const poTax = Math.round(poSubtotal * taxPct / 100 * 100) / 100
        const poTotal = Math.round((poSubtotal + poTax) * 100) / 100

        await db.from('purchase_orders').insert({
          id: poId, organization_id: GC_ORG_ID, project_id: projectId,
          supplier_id: SUPPLIER_ID,
          po_number: `PO-${def.city.replace(/\s/g, '').slice(0, 4).toUpperCase()}-${projectIndex + 1}${pi + 1}`,
          po_name: def.poNames[pi],
          status, notes: `QA seed PO for ${def.name} — ${def.phase}`,
          created_by_org_id: GC_ORG_ID, pricing_owner_org_id: GC_ORG_ID,
          sales_tax_percent: taxPct,
          po_subtotal_total: poSubtotal, po_tax_total: poTax, po_total: poTotal,
          tax_percent_applied: taxPct,
          submitted_at: ['SUBMITTED', 'PRICED', 'ORDERED', 'DELIVERED'].includes(status) ? thirtyDaysAgo : null,
          submitted_by: ['SUBMITTED', 'PRICED', 'ORDERED', 'DELIVERED'].includes(status) ? GC_USER_ID : null,
          priced_at: ['PRICED', 'ORDERED', 'DELIVERED'].includes(status) ? thirtyDaysAgo : null,
          priced_by: ['PRICED', 'ORDERED', 'DELIVERED'].includes(status) ? SUPP_USER_ID : null,
          ordered_at: ['ORDERED', 'DELIVERED'].includes(status) ? thirtyDaysAgo : null,
          delivered_at: status === 'DELIVERED' ? now : null,
          source_pack_name: pi === 0 ? `${def.trade} Material Pack` : null,
          pack_modified: pi === 0 ? false : null,
        })

        const lineItems = items.map((it, li) => ({
          id: uuid(), po_id: poId, line_number: li + 1,
          supplier_sku: it.sku, description: it.desc,
          quantity: it.qty, uom: it.uom,
          unit_price: ['PRICED', 'ORDERED', 'DELIVERED'].includes(status) ? it.price : null,
          line_total: ['PRICED', 'ORDERED', 'DELIVERED'].includes(status) ? Math.round(it.qty * it.price * 100) / 100 : null,
          price_adjusted_by_supplier: pi === 1 && li === 0,
          original_unit_price: pi === 1 && li === 0 ? it.price * 0.9 : null,
          adjustment_reason: pi === 1 && li === 0 ? 'Price increase effective this month' : null,
          source_pack_name: pi === 0 ? `${def.trade} Material Pack` : null,
        }))
        await db.from('po_line_items').insert(lineItems)
      }

      // 9. Returns (projects 2, 5, 6 with delivered POs)
      if (!def.healthy || projectIndex === 1) {
        const { data: deliveredPOs } = await db.from('purchase_orders').select('id').eq('project_id', projectId).eq('status', 'DELIVERED')
        if (deliveredPOs?.length) {
          const returnPO = deliveredPOs[0]
          const { data: poLines } = await db.from('po_line_items').select('id, description, uom, unit_price').eq('po_id', returnPO.id).limit(2)
          if (poLines?.length) {
            const returnId = uuid()
            const creditSubtotal = (poLines[0].unit_price || 10) * 5
            const restockingTotal = Math.round(creditSubtotal * 0.15 * 100) / 100
            const reasonMap: Record<number, { reason: string; notes: string; wrong_type?: string }> = {
              1: { reason: 'wrong_item', wrong_type: 'wrong_size', notes: 'Received W8x31 instead of W10x33 wide flange' },
              2: { reason: 'wrong_item', wrong_type: 'wrong_size', notes: 'Received 3/4" EMT instead of 1" — 18 of 20 bundles (short delivery)' },
              5: { reason: 'damaged', notes: 'Drywall sheets arrived with water damage — 2 pallets' },
              6: { reason: 'damaged', notes: 'Medical gas outlet damaged in transit — credit memo required' },
            }
            const rInfo = reasonMap[projectIndex] || { reason: 'wrong_item', notes: 'QA test return' }
            await db.from('returns').insert({
              id: returnId, project_id: projectId,
              supplier_org_id: SUPP_ORG_ID, created_by_org_id: GC_ORG_ID, created_by_user_id: GC_USER_ID,
              return_number: `RTN-${projectIndex + 1}01`,
              reason: rInfo.reason, wrong_type: (rInfo as any).wrong_type || null,
              reason_notes: rInfo.notes,
              pickup_type: 'supplier_pickup', pickup_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
              contact_name: 'John Smith', contact_phone: '303-555-0101',
              status: 'submitted', credit_subtotal: creditSubtotal,
              restocking_type: 'percent', restocking_value: 15,
              restocking_total: restockingTotal,
              net_credit_total: Math.round((creditSubtotal - restockingTotal) * 100) / 100,
              pricing_owner_org_id: GC_ORG_ID, urgency: projectIndex === 6 ? 'urgent' : 'standard',
            })
            for (const pl of poLines) {
              await db.from('return_items').insert({
                id: uuid(), return_id: returnId, po_line_item_id: pl.id, po_id: deliveredPOs[0].id,
                description_snapshot: pl.description, uom: pl.uom,
                qty_requested: 5, condition: projectIndex === 5 || projectIndex === 6 ? 'damaged' : 'unopened',
                returnable_flag: 'yes',
                credit_unit_price: pl.unit_price, credit_line_total: (pl.unit_price || 10) * 5,
                original_unit_price: pl.unit_price,
                reason: rInfo.reason, reason_notes: rInfo.notes,
              })
            }
          }
        }
      }

      // 10. Change Orders / Work Orders ──────
      for (let ci = 0; ci < def.coConfigs.length; ci++) {
        const cfg = def.coConfigs[ci]
        const coId = uuid()
        const coNumber = `CO-${def.city.replace(/\s/g, '').slice(0, 4).toUpperCase()}-${projectIndex + 1}${ci + 1}`

        await db.from('change_orders').insert({
          id: coId, project_id: projectId, org_id: TC_ORG_ID,
          created_by_user_id: ci === 0 ? GC_USER_ID : TC_USER_ID,
          created_by_role: ci === 0 ? 'GC_PM' : 'TC_PM',
          co_number: coNumber, title: cfg.title,
          reason: cfg.reason, reason_note: `QA seed: ${cfg.reason} — ${def.phase}`,
          pricing_type: cfg.pricing, status: cfg.status,
          gc_budget: cfg.gcBudget,
          tc_submitted_price: cfg.tcPrice,
          assigned_to_org_id: TC_ORG_ID,
          materials_needed: ci % 2 === 0, materials_responsible: 'gc',
          equipment_needed: false,
          fc_input_needed: true,
          location_tag: CO_SCOPE_ITEMS[(projectIndex * 2 + ci) % CO_SCOPE_ITEMS.length].name.split('—')[1]?.trim() || '1st Floor',
          submitted_at: ['submitted', 'approved', 'completed', 'rejected', 'pending_approval'].includes(cfg.status) ? thirtyDaysAgo : null,
          approved_at: ['approved', 'completed'].includes(cfg.status) ? thirtyDaysAgo : null,
          rejected_at: cfg.status === 'rejected' ? thirtyDaysAgo : null,
          rejection_note: cfg.status === 'rejected' ? 'Pricing exceeds budget — please revise scope or reduce hours' : null,
          completed_at: cfg.status === 'completed' ? now : null,
          draft_shared_with_next: cfg.status !== 'draft',
        })

        // CO line items
        const scopeSlice = CO_SCOPE_ITEMS.slice((projectIndex * 2 + ci) % 10, (projectIndex * 2 + ci) % 10 + 2)
        for (let si = 0; si < scopeSlice.length; si++) {
          const scope = scopeSlice[si]
          await db.from('co_line_items').insert({
            id: uuid(), co_id: coId, org_id: TC_ORG_ID,
            created_by_role: 'TC_PM',
            item_name: scope.name, category_name: scope.category,
            unit: scope.unit, qty: 10 + si * 5,
            sort_order: si + 1,
            location_tag: scope.name.split('—')[1]?.trim() || 'Interior',
          })
        }

        // CO material items
        if (ci % 2 === 0) {
          const [matSet] = getMaterialSets(projectIndex)
          const matItem = matSet[ci % matSet.length]
          await db.from('co_material_items').insert({
            id: uuid(), co_id: coId, org_id: TC_ORG_ID,
            added_by_role: 'TC_PM', description: matItem.desc,
            quantity: Math.ceil(matItem.qty / 10), uom: matItem.uom,
            unit_cost: matItem.price, line_cost: Math.ceil(matItem.qty / 10) * matItem.price,
            markup_percent: 15, markup_amount: Math.round(Math.ceil(matItem.qty / 10) * matItem.price * 0.15 * 100) / 100,
            billed_amount: Math.round(Math.ceil(matItem.qty / 10) * matItem.price * 1.15 * 100) / 100,
            line_number: 1,
          })
        }

        // Labor entries for T&M COs
        if (cfg.pricing === 'tm' && cfg.status !== 'draft') {
          const lineItems = await db.from('co_line_items').select('id').eq('co_id', coId).limit(1)
          if (lineItems.data?.length) {
            const lineId = lineItems.data[0].id
            await db.from('co_labor_entries').insert({
              id: uuid(), co_id: coId, co_line_item_id: lineId,
              org_id: FC_ORG_ID, entered_by_role: 'FC_PM',
              entry_date: thirtyDaysAgo.split('T')[0],
              pricing_mode: 'hourly', hours: 16, hourly_rate: 45,
              line_total: 720, gc_approved: cfg.status === 'approved' || cfg.status === 'completed',
              gc_approved_at: ['approved', 'completed'].includes(cfg.status) ? thirtyDaysAgo : null,
              description: `${def.trade} crew — 2 men x 8 hours`,
              is_actual_cost: false,
            })
            await db.from('co_labor_entries').insert({
              id: uuid(), co_id: coId, co_line_item_id: lineId,
              org_id: TC_ORG_ID, entered_by_role: 'TC_PM',
              entry_date: thirtyDaysAgo.split('T')[0],
              pricing_mode: 'hourly', hours: 16, hourly_rate: 65,
              line_total: 1040, gc_approved: cfg.status === 'approved' || cfg.status === 'completed',
              gc_approved_at: ['approved', 'completed'].includes(cfg.status) ? thirtyDaysAgo : null,
              description: `${def.trade} labor — TC rate applied`,
              is_actual_cost: false,
            })
          }
        }
      }

      // 11. Invoices ─────────────────────────
      for (let ii = 0; ii < def.invoiceConfigs.length; ii++) {
        const icfg = def.invoiceConfigs[ii]
        const invoiceId = uuid()
        const subtotal = Math.round(def.gcContract * icfg.pct / 100)
        const retainageAmt = Math.round(subtotal * def.retainage / 100)
        const totalAmt = subtotal - retainageAmt
        const billingStart = new Date(Date.now() - (60 - ii * 15) * 86400000).toISOString().split('T')[0]
        const billingEnd = new Date(Date.now() - (45 - ii * 15) * 86400000).toISOString().split('T')[0]

        await db.from('invoices').insert({
          id: invoiceId, project_id: projectId,
          invoice_number: `INV-${def.city.replace(/\s/g, '').slice(0, 4).toUpperCase()}-${projectIndex + 1}${ii + 1}`,
          billing_period_start: billingStart, billing_period_end: billingEnd,
          status: icfg.status, subtotal, retainage_amount: retainageAmt, total_amount: totalAmt,
          notes: icfg.desc, created_by: TC_USER_ID,
          contract_id: gcTcContractId, sov_id: sovId,
          submitted_at: icfg.status !== 'DRAFT' ? thirtyDaysAgo : null,
          submitted_by: icfg.status !== 'DRAFT' ? TC_USER_ID : null,
          approved_at: ['APPROVED', 'PAID'].includes(icfg.status) ? thirtyDaysAgo : null,
          approved_by: ['APPROVED', 'PAID'].includes(icfg.status) ? GC_USER_ID : null,
          rejected_at: icfg.status === 'REJECTED' ? thirtyDaysAgo : null,
          rejected_by: icfg.status === 'REJECTED' ? GC_USER_ID : null,
          rejection_reason: icfg.status === 'REJECTED' ? 'Line item amounts do not match approved SOV values — please correct and resubmit' : null,
          paid_at: icfg.status === 'PAID' ? now : null,
          revision_count: icfg.status === 'REJECTED' ? 1 : 0,
        })

        // Invoice line items
        if (sovId) {
          const { data: sovItems } = await db.from('project_sov_items').select('id, item_name, scheduled_value').eq('sov_id', sovId).order('sort_order').limit(3)
          if (sovItems?.length) {
            for (let li = 0; li < Math.min(sovItems.length, 3); li++) {
              const sItem = sovItems[li]
              const currentBilled = Math.round((sItem.scheduled_value || 0) * icfg.pct / 100)
              await db.from('invoice_line_items').insert({
                id: uuid(), invoice_id: invoiceId,
                description: sItem.item_name,
                scheduled_value: sItem.scheduled_value || 0,
                previous_billed: 0, current_billed: currentBilled,
                total_billed: currentBilled,
                retainage_percent: def.retainage,
                retainage_amount: Math.round(currentBilled * def.retainage / 100),
                sort_order: li + 1, sov_item_id: sItem.id,
                billed_percent: icfg.pct,
              })
            }
          }
        }
      }

      // 12. RFIs ─────────────────────────────
      await db.from('project_rfis').insert([
        {
          id: uuid(), project_id: projectId, rfi_number: 1,
          subject: def.rfiSubjects[0],
          question: `${def.rfiSubjects[0]} — requesting clarification for ${def.phase}. Please advise on correct specification.`,
          status: def.healthy ? 'answered' : 'open', priority: 'high',
          submitted_by_org_id: TC_ORG_ID, submitted_by_user_id: TC_USER_ID,
          assigned_to_org_id: GC_ORG_ID,
          answer: def.healthy ? 'Per updated specs and structural calcs. Proceed with revised detail as noted.' : null,
          answered_by_user_id: def.healthy ? GC_USER_ID : null,
          answered_at: def.healthy ? thirtyDaysAgo : null,
          due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          reference_area: '1st Floor',
        },
        {
          id: uuid(), project_id: projectId, rfi_number: 2,
          subject: def.rfiSubjects[1],
          question: `${def.rfiSubjects[1]} — need direction before proceeding. Affects schedule if delayed beyond 5 business days.`,
          status: 'open', priority: 'medium',
          submitted_by_org_id: TC_ORG_ID, submitted_by_user_id: TC_USER_ID,
          assigned_to_org_id: GC_ORG_ID,
          due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          reference_area: 'Exterior',
        },
      ])

      results.push({
        project: def.name, id: projectId, type: def.project_type,
        mode: def.contract_mode, healthy: def.healthy, status: 'seeded',
        fcStatus, hasSov: !!sovId,
        poCount: 2, coCount: def.coConfigs.length, invCount: def.invoiceConfigs.length, rfiCount: 2,
      })
    }

    return new Response(JSON.stringify({ success: true, action: 'seed', projects: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

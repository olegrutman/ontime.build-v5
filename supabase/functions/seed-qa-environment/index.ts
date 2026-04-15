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

// ── Project definitions ─────────────────────────────────────────────
interface ProjectDef {
  name: string; project_type: string; build_type: string; contract_mode: string;
  city: string; state: string; zip: string; healthy: boolean;
  address: object; scope: object; structures: object[];
  scopeDetails: Record<string, unknown>;
  gcContract: number; tcContract: number; retainage: number;
}

const PROJECTS: ProjectDef[] = [
  // ── Single Family ─────────────────────────
  {
    name: 'Barton Creek Custom Home', project_type: 'residential', build_type: 'new_construction', contract_mode: 'fixed',
    city: 'Austin', state: 'TX', zip: '78735', healthy: true,
    address: { street: '4200 Barton Creek Blvd', city: 'Austin', state: 'TX', zip: '78735' },
    scope: { framing: true, exterior: true, windows: true }, structures: [{ label: 'Main House', floors: 2 }],
    scopeDetails: { home_type: 'custom', floors: 2, stories: 2, bedrooms: 4, bathrooms: 3, foundation_type: 'slab_on_grade', basement_type: 'full', garage_type: 'attached', garage_cars: 3, total_sqft: 4200, framing_method: 'stick', roof_type: 'hip', has_balconies: true, balcony_type: 'cantilevered', fascia_included: true, soffit_included: true, windows_included: true },
    gcContract: 285000, tcContract: 195000, retainage: 10,
  },
  {
    name: 'Dripping Springs Spec Home', project_type: 'residential', build_type: 'new_construction', contract_mode: 'fixed',
    city: 'Dripping Springs', state: 'TX', zip: '78620', healthy: false,
    address: { street: '1100 Founders Park Rd', city: 'Dripping Springs', state: 'TX', zip: '78620' },
    scope: { framing: true, exterior: true }, structures: [{ label: 'Main House', floors: 1 }],
    scopeDetails: { home_type: 'production', floors: 1, stories: 1, bedrooms: 3, bathrooms: 2, foundation_type: 'slab_on_grade', garage_type: 'attached', garage_cars: 2, total_sqft: 2400, framing_method: 'stick', roof_type: 'gable', fascia_included: true, soffit_included: true },
    gcContract: 165000, tcContract: 112000, retainage: 10,
  },
  // ── Townhomes ─────────────────────────────
  {
    name: 'Lakeline Townhomes Ph1', project_type: 'residential', build_type: 'new_construction', contract_mode: 'fixed',
    city: 'Cedar Park', state: 'TX', zip: '78613', healthy: true,
    address: { street: '900 Lakeline Blvd', city: 'Cedar Park', state: 'TX', zip: '78613' },
    scope: { framing: true, exterior: true, windows: true }, structures: [{ label: 'Building A', floors: 3, units: 4 }, { label: 'Building B', floors: 3, units: 4 }],
    scopeDetails: { home_type: 'townhome', floors: 3, stories: 3, num_buildings: 2, num_units: 8, stories_per_unit: 3, has_shared_walls: true, total_sqft: 14400, framing_method: 'stick', roof_type: 'gable', has_balconies: true, balcony_type: 'cantilevered', fascia_included: true, soffit_included: true, windows_included: true },
    gcContract: 820000, tcContract: 560000, retainage: 10,
  },
  {
    name: 'Round Rock Townhomes', project_type: 'residential', build_type: 'new_construction', contract_mode: 'fixed',
    city: 'Round Rock', state: 'TX', zip: '78664', healthy: false,
    address: { street: '2500 University Ave', city: 'Round Rock', state: 'TX', zip: '78664' },
    scope: { framing: true, exterior: true }, structures: [{ label: 'Building A', floors: 2, units: 3 }],
    scopeDetails: { home_type: 'townhome', floors: 2, stories: 2, num_buildings: 1, num_units: 3, stories_per_unit: 2, has_shared_walls: true, total_sqft: 5400, framing_method: 'stick', roof_type: 'gable', fascia_included: true, soffit_included: true },
    gcContract: 380000, tcContract: 260000, retainage: 10,
  },
  // ── Apartments ────────────────────────────
  {
    name: 'Domain Apartments Bldg C', project_type: 'residential', build_type: 'new_construction', contract_mode: 'fixed',
    city: 'Austin', state: 'TX', zip: '78758', healthy: true,
    address: { street: '11800 Domain Blvd', city: 'Austin', state: 'TX', zip: '78758' },
    scope: { framing: true, exterior: true, windows: true }, structures: [{ label: 'Building C', floors: 4, units: 24 }],
    scopeDetails: { home_type: 'apartment', floors: 4, stories: 4, num_buildings: 1, num_units: 24, has_elevator: true, construction_type: 'wood_frame', total_sqft: 38400, framing_method: 'stick', roof_type: 'flat', has_balconies: true, balcony_type: 'hung', fascia_included: true, soffit_included: true, windows_included: true },
    gcContract: 1850000, tcContract: 1280000, retainage: 10,
  },
  {
    name: 'Pflugerville Senior Living', project_type: 'residential', build_type: 'new_construction', contract_mode: 'fixed',
    city: 'Pflugerville', state: 'TX', zip: '78660', healthy: false,
    address: { street: '700 Pecan St', city: 'Pflugerville', state: 'TX', zip: '78660' },
    scope: { framing: true, exterior: true }, structures: [{ label: 'Main Building', floors: 3, units: 16 }],
    scopeDetails: { home_type: 'apartment', floors: 3, stories: 3, num_buildings: 1, num_units: 16, has_elevator: true, construction_type: 'wood_frame', total_sqft: 22400, framing_method: 'stick', roof_type: 'flat', fascia_included: true, soffit_included: true },
    gcContract: 1100000, tcContract: 740000, retainage: 10,
  },
  // ── Duplex ────────────────────────────────
  {
    name: 'South Lamar Duplex', project_type: 'residential', build_type: 'new_construction', contract_mode: 'fixed',
    city: 'Austin', state: 'TX', zip: '78704', healthy: true,
    address: { street: '3300 S Lamar Blvd', city: 'Austin', state: 'TX', zip: '78704' },
    scope: { framing: true, exterior: true, windows: true }, structures: [{ label: 'Unit A', floors: 2 }, { label: 'Unit B', floors: 2 }],
    scopeDetails: { home_type: 'duplex', floors: 2, stories: 2, num_units: 2, stories_per_unit: 2, has_shared_walls: true, bedrooms: 3, bathrooms: 2, total_sqft: 3600, framing_method: 'stick', roof_type: 'gable', garage_type: 'attached', garage_cars: 2, fascia_included: true, soffit_included: true, windows_included: true },
    gcContract: 240000, tcContract: 165000, retainage: 10,
  },
  {
    name: 'East Riverside Duplex', project_type: 'residential', build_type: 'new_construction', contract_mode: 'fixed',
    city: 'Austin', state: 'TX', zip: '78741', healthy: false,
    address: { street: '2100 E Riverside Dr', city: 'Austin', state: 'TX', zip: '78741' },
    scope: { framing: true, exterior: true }, structures: [{ label: 'Unit A', floors: 2 }, { label: 'Unit B', floors: 2 }],
    scopeDetails: { home_type: 'duplex', floors: 2, stories: 2, num_units: 2, stories_per_unit: 2, has_shared_walls: true, bedrooms: 2, bathrooms: 2, total_sqft: 2800, framing_method: 'stick', roof_type: 'gable', fascia_included: true, soffit_included: true },
    gcContract: 195000, tcContract: 130000, retainage: 10,
  },
  // ── Hotel ─────────────────────────────────
  {
    name: 'Congress Hotel Renovation', project_type: 'commercial', build_type: 'renovation', contract_mode: 'tm',
    city: 'Austin', state: 'TX', zip: '78701', healthy: true,
    address: { street: '200 Congress Ave', city: 'Austin', state: 'TX', zip: '78701' },
    scope: { framing: true, exterior: true, windows: true }, structures: [{ label: 'Main Tower', floors: 5, units: 60 }],
    scopeDetails: { home_type: 'apartment', floors: 5, stories: 5, num_buildings: 1, num_units: 60, has_elevator: true, construction_type: 'steel_frame', total_sqft: 72000, roof_type: 'flat', fascia_included: true, soffit_included: true, windows_included: true },
    gcContract: 3200000, tcContract: 2100000, retainage: 5,
  },
  {
    name: 'Airport Hotel Express', project_type: 'commercial', build_type: 'renovation', contract_mode: 'tm',
    city: 'Austin', state: 'TX', zip: '78719', healthy: false,
    address: { street: '4500 Presidential Blvd', city: 'Austin', state: 'TX', zip: '78719' },
    scope: { framing: true, exterior: true }, structures: [{ label: 'Main Building', floors: 4, units: 44 }],
    scopeDetails: { home_type: 'apartment', floors: 4, stories: 4, num_buildings: 1, num_units: 44, has_elevator: true, construction_type: 'steel_frame', total_sqft: 48000, roof_type: 'flat', fascia_included: true },
    gcContract: 2400000, tcContract: 1600000, retainage: 5,
  },
  // ── Commercial ────────────────────────────
  {
    name: 'Tech Ridge Office Park', project_type: 'commercial', build_type: 'new_construction', contract_mode: 'fixed',
    city: 'Austin', state: 'TX', zip: '78753', healthy: true,
    address: { street: '12900 Tech Ridge Blvd', city: 'Austin', state: 'TX', zip: '78753' },
    scope: { framing: true, exterior: true, windows: true }, structures: [{ label: 'Office Bldg 1', floors: 3 }],
    scopeDetails: { home_type: 'apartment', floors: 3, stories: 3, construction_type: 'steel_frame', total_sqft: 22000, roof_type: 'flat', has_elevator: true, fascia_included: true, soffit_included: true, windows_included: true },
    gcContract: 1450000, tcContract: 980000, retainage: 10,
  },
  {
    name: 'South Congress Retail', project_type: 'commercial', build_type: 'renovation', contract_mode: 'fixed',
    city: 'Austin', state: 'TX', zip: '78704', healthy: false,
    address: { street: '1600 S Congress Ave', city: 'Austin', state: 'TX', zip: '78704' },
    scope: { framing: true, exterior: true }, structures: [{ label: 'Retail Building', floors: 2 }],
    scopeDetails: { home_type: 'apartment', floors: 2, stories: 2, construction_type: 'wood_frame', total_sqft: 8500, roof_type: 'flat', fascia_included: true, soffit_included: true },
    gcContract: 620000, tcContract: 420000, retainage: 10,
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

// ── Lumber / hardware data ──────────────────────────────────────────
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

// ── CO/WO scope items ───────────────────────────────────────────────
const CO_SCOPE_ITEMS = [
  { name: 'Interior wall framing — 2nd floor bedrooms', category: 'Structural Framing', unit: 'LF' },
  { name: 'Header install — kitchen pass-through', category: 'Structural Framing', unit: 'EA' },
  { name: 'Exterior soffit repair — front elevation', category: 'Exterior Finish', unit: 'SF' },
  { name: 'Balcony railing framing — master bedroom', category: 'Exterior Finish', unit: 'LF' },
  { name: 'Window rough-in — west elevation', category: 'Building Envelope', unit: 'EA' },
  { name: 'Patio door header — rear entry', category: 'Structural Framing', unit: 'EA' },
  { name: 'Stairwell framing — basement access', category: 'Structural Framing', unit: 'LF' },
  { name: 'Fascia board replacement — south gable', category: 'Exterior Finish', unit: 'LF' },
]

const CO_REASONS = ['owner_requested', 'blueprint_change', 'damage_by_others', 'design_conflict', 'material_substitution', 'field_condition']

// ── Main handler ────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Auth: require PLATFORM_OWNER
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }
    const token = authHeader.replace('Bearer ', '')
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }
    const callerId = claimsData.claims.sub as string

    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: roleData } = await db.rpc('get_platform_role', { _user_id: callerId })
    if (roleData !== 'PLATFORM_OWNER') {
      return new Response(JSON.stringify({ error: 'Forbidden — PLATFORM_OWNER required' }), { status: 403, headers: corsHeaders })
    }

    const body = await req.json().catch(() => ({}))
    const action = body.action || 'seed'

    // ── CLEAR ───────────────────────────────
    if (action === 'clear') {
      // Delete all projects created by gc_test user — cascades handle children
      const { data: testProjects } = await db.from('projects').select('id').eq('created_by', GC_USER_ID)
      if (testProjects && testProjects.length > 0) {
        const projectIds = testProjects.map((p: any) => p.id)

        // Delete child records in dependency order
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
        // Finally delete projects
        await db.from('projects').delete().eq('created_by', GC_USER_ID)
      }
      return new Response(JSON.stringify({ success: true, action: 'clear', deleted: testProjects?.length || 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── SEED ────────────────────────────────
    const results: any[] = []
    let projectIndex = 0

    for (const def of PROJECTS) {
      projectIndex++
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
        address: def.address, city: def.city, state: def.state, zip: def.zip,
        scope: def.scope, structures: def.structures,
        retainage_percent: def.retainage,
        created_by: GC_USER_ID, created_by_org_id: GC_ORG_ID,
        start_date: new Date(Date.now() - 45 * 86400000).toISOString().split('T')[0],
      })
      if (projErr) { results.push({ project: def.name, error: projErr.message }); continue }

      // 2. Scope details
      await db.from('project_scope_details').insert({ id: uuid(), project_id: projectId, ...def.scopeDetails })

      // 3. Participants
      const fcStatus = (!def.healthy && projectIndex % 3 === 0) ? 'pending' : 'accepted'
      await db.from('project_participants').insert([
        { id: uuid(), project_id: projectId, organization_id: GC_ORG_ID, role: 'GC', invited_by: GC_USER_ID, invite_status: 'accepted', accepted_at: sixtyDaysAgo, material_responsibility: 'gc' },
        { id: uuid(), project_id: projectId, organization_id: TC_ORG_ID, role: 'TC', invited_by: GC_USER_ID, invite_status: 'accepted', accepted_at: sixtyDaysAgo },
        { id: uuid(), project_id: projectId, organization_id: FC_ORG_ID, role: 'FC', invited_by: TC_USER_ID, invite_status: fcStatus, accepted_at: fcStatus === 'accepted' ? thirtyDaysAgo : null },
      ])

      // 4. Team members
      const gcTeamId = uuid(); const tcTeamId = uuid(); const fcTeamId = uuid()
      await db.from('project_team').insert([
        { id: gcTeamId, project_id: projectId, org_id: GC_ORG_ID, user_id: GC_USER_ID, role: 'GC_PM', trade: 'General', status: 'Accepted', invited_by_user_id: GC_USER_ID, invited_email: 'gc@test.com', invited_name: 'John Smith' },
        { id: tcTeamId, project_id: projectId, org_id: TC_ORG_ID, user_id: TC_USER_ID, role: 'TC_PM', trade: 'Framing', status: 'Accepted', invited_by_user_id: GC_USER_ID, invited_email: 'tc@test.com', invited_name: 'Mike Gold' },
        { id: fcTeamId, project_id: projectId, org_id: FC_ORG_ID, user_id: FC_USER_ID, role: 'FC_PM', trade: 'Framing', status: fcStatus === 'accepted' ? 'Accepted' : 'Pending', invited_by_user_id: TC_USER_ID, invited_email: 'fc@test.com', invited_name: 'Tim Cook' },
      ])

      // 5. Contracts
      const gcTcContractId = uuid(); const tcFcContractId = uuid()
      await db.from('project_contracts').insert([
        {
          id: gcTcContractId, project_id: projectId,
          from_org_id: GC_ORG_ID, to_org_id: TC_ORG_ID,
          to_project_team_id: tcTeamId,
          from_role: 'GC_PM', to_role: 'TC_PM', trade: 'Framing',
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
          from_role: 'TC_PM', to_role: 'FC_PM', trade: 'Framing',
          contract_sum: def.tcContract, retainage_percent: def.retainage,
          labor_budget: Math.round(def.tcContract * 0.85),
          material_responsibility: 'tc',
          status: fcStatus === 'accepted' ? 'accepted' : 'draft',
          created_by_user_id: TC_USER_ID,
          sent_at: fcStatus === 'accepted' ? thirtyDaysAgo : null,
          accepted_at: fcStatus === 'accepted' ? thirtyDaysAgo : null,
        },
      ])

      // 6. SOV (healthy projects get full SOV; messy skip or partial)
      let sovId: string | null = null
      if (def.healthy || projectIndex % 4 !== 0) {
        sovId = uuid()
        await db.from('project_sov').insert({
          id: sovId, project_id: projectId, contract_id: gcTcContractId,
          sov_name: `${def.name} — Primary SOV`, is_locked: def.healthy, version: 1,
          locked_at: def.healthy ? thirtyDaysAgo : null,
          locked_by: def.healthy ? GC_USER_ID : null,
        })
        const sovItems = buildSOVItems(sovId, projectId, def.gcContract)
        // For messy projects, only insert partial items
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

      // 8. Purchase Orders ───────────────────
      const poStatuses = def.healthy
        ? ['SUBMITTED', 'PRICED', 'ORDERED', 'DELIVERED'] as const
        : ['ACTIVE', 'SUBMITTED', 'PRICED', 'DELIVERED'] as const

      for (let pi = 0; pi < poStatuses.length; pi++) {
        const poId = uuid()
        const status = poStatuses[pi]
        const items = pi % 2 === 0 ? LUMBER_ITEMS.slice(0, 4) : HARDWARE_ITEMS.slice(0, 4)
        const poSubtotal = items.reduce((s, it) => s + it.qty * it.price, 0)
        const taxPct = 8.25
        const poTax = Math.round(poSubtotal * taxPct / 100 * 100) / 100
        const poTotal = Math.round((poSubtotal + poTax) * 100) / 100

        await db.from('purchase_orders').insert({
          id: poId, organization_id: GC_ORG_ID, project_id: projectId,
          supplier_id: SUPPLIER_ID,
          po_number: `PO-${def.city.replace(/\s/g, '').slice(0, 4).toUpperCase()}-${projectIndex}${pi + 1}`,
          po_name: pi % 2 === 0 ? `Lumber Package ${pi + 1}` : `Hardware Package ${pi + 1}`,
          status, notes: `QA seed PO for ${def.name}`,
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
          source_pack_name: pi === 0 ? 'Framing Lumber Pack' : null,
          pack_modified: pi === 0 ? false : null,
        })

        const lineItems = items.map((it, li) => ({
          id: uuid(), po_id: poId, line_number: li + 1,
          supplier_sku: it.sku, description: it.desc,
          quantity: it.qty, uom: it.uom,
          unit_price: ['PRICED', 'ORDERED', 'DELIVERED'].includes(status) ? it.price : null,
          line_total: ['PRICED', 'ORDERED', 'DELIVERED'].includes(status) ? Math.round(it.qty * it.price * 100) / 100 : null,
          price_adjusted_by_supplier: pi === 1 && li === 0, // Supplier edited first item on hardware POs
          original_unit_price: pi === 1 && li === 0 ? it.price * 0.9 : null,
          adjustment_reason: pi === 1 && li === 0 ? 'Price increase effective this month' : null,
          source_pack_name: pi === 0 ? 'Framing Lumber Pack' : null,
        }))
        await db.from('po_line_items').insert(lineItems)
      }

      // 9. Returns (messy projects with delivered POs)
      if (!def.healthy) {
        const { data: deliveredPOs } = await db.from('purchase_orders').select('id').eq('project_id', projectId).eq('status', 'DELIVERED')
        if (deliveredPOs?.length) {
          const returnPO = deliveredPOs[0]
          const { data: poLines } = await db.from('po_line_items').select('id, description, uom, unit_price').eq('po_id', returnPO.id).limit(2)
          if (poLines?.length) {
            const returnId = uuid()
            const creditSubtotal = (poLines[0].unit_price || 10) * 5
            const restockingTotal = Math.round(creditSubtotal * 0.15 * 100) / 100
            await db.from('returns').insert({
              id: returnId, project_id: projectId,
              supplier_org_id: SUPP_ORG_ID, created_by_org_id: GC_ORG_ID, created_by_user_id: GC_USER_ID,
              return_number: `RTN-${projectIndex}01`,
              reason: 'wrong_item', wrong_type: 'wrong_size',
              reason_notes: 'Received 2x4x8 instead of 2x6x16',
              pickup_type: 'supplier_pickup', pickup_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
              contact_name: 'John Smith', contact_phone: '512-555-0101',
              status: 'submitted', credit_subtotal: creditSubtotal,
              restocking_type: 'percent', restocking_value: 15,
              restocking_total: restockingTotal,
              net_credit_total: Math.round((creditSubtotal - restockingTotal) * 100) / 100,
              pricing_owner_org_id: GC_ORG_ID, urgency: 'standard',
            })
            for (const pl of poLines) {
              await db.from('return_items').insert({
                id: uuid(), return_id: returnId, po_line_item_id: pl.id, po_id: deliveredPOs[0].id,
                description_snapshot: pl.description, uom: pl.uom,
                qty_requested: 5, condition: 'unopened',
                returnable_flag: 'yes',
                credit_unit_price: pl.unit_price, credit_line_total: (pl.unit_price || 10) * 5,
                original_unit_price: pl.unit_price,
                reason: 'wrong_item', reason_notes: 'Wrong size delivered',
              })
            }
          }
        }
      }

      // 10. Change Orders / Work Orders ──────
      const coConfigs = def.healthy
        ? [
          { title: 'Owner-Requested Kitchen Header Upgrade', reason: 'owner_requested', pricing: 'fixed', status: 'approved', gcBudget: 4500, tcPrice: 3800 },
          { title: 'Blueprint Change — Load-Bearing Wall', reason: 'blueprint_change', pricing: 'tm', status: 'completed', gcBudget: 8200, tcPrice: 7100 },
          { title: 'Window Rough-In Adjustment', reason: 'field_condition', pricing: 'fixed', status: 'submitted', gcBudget: 2200, tcPrice: 1800 },
        ]
        : [
          { title: 'Damage Repair — Plumbing Crew', reason: 'damage_by_others', pricing: 'fixed', status: 'rejected', gcBudget: 3500, tcPrice: 2900 },
          { title: 'Design Conflict — Beam Location', reason: 'design_conflict', pricing: 'tm', status: 'draft', gcBudget: 6000, tcPrice: null },
          { title: 'Material Substitution — LVL to Glulam', reason: 'material_substitution', pricing: 'fixed', status: 'submitted', gcBudget: 5500, tcPrice: 4200 },
          { title: 'Stairwell Rework — Code Update', reason: 'blueprint_change', pricing: 'tm', status: 'approved', gcBudget: 12000, tcPrice: 14500 }, // Over-budget
          { title: 'Balcony Framing — Owner Addition', reason: 'owner_requested', pricing: 'fixed', status: 'pending_approval', gcBudget: 7800, tcPrice: 6200 },
        ]

      for (let ci = 0; ci < coConfigs.length; ci++) {
        const cfg = coConfigs[ci]
        const coId = uuid()
        const coNumber = `CO-${def.city.replace(/\s/g, '').slice(0, 4).toUpperCase()}-${projectIndex}${ci + 1}`

        await db.from('change_orders').insert({
          id: coId, project_id: projectId, org_id: TC_ORG_ID,
          created_by_user_id: ci < 2 ? GC_USER_ID : TC_USER_ID,
          created_by_role: ci < 2 ? 'GC_PM' : 'TC_PM',
          co_number: coNumber, title: cfg.title,
          reason: cfg.reason, reason_note: `QA seed: ${cfg.reason}`,
          pricing_type: cfg.pricing, status: cfg.status,
          gc_budget: cfg.gcBudget,
          tc_submitted_price: cfg.tcPrice,
          assigned_to_org_id: TC_ORG_ID,
          materials_needed: ci % 2 === 0, materials_responsible: 'gc',
          equipment_needed: false,
          fc_input_needed: true,
          location_tag: CO_SCOPE_ITEMS[ci % CO_SCOPE_ITEMS.length].name.split('—')[1]?.trim() || '1st Floor',
          submitted_at: ['submitted', 'approved', 'completed', 'rejected', 'pending_approval'].includes(cfg.status) ? thirtyDaysAgo : null,
          approved_at: ['approved', 'completed'].includes(cfg.status) ? thirtyDaysAgo : null,
          rejected_at: cfg.status === 'rejected' ? thirtyDaysAgo : null,
          rejection_note: cfg.status === 'rejected' ? 'Pricing exceeds budget — please revise scope or reduce hours' : null,
          completed_at: cfg.status === 'completed' ? now : null,
          draft_shared_with_next: cfg.status !== 'draft',
        })

        // CO line items
        const scopeSlice = CO_SCOPE_ITEMS.slice(ci % 4, ci % 4 + 2)
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

        // CO material items (on COs needing materials)
        if (ci % 2 === 0) {
          const matItem = LUMBER_ITEMS[ci % LUMBER_ITEMS.length]
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
            // FC labor entry
            await db.from('co_labor_entries').insert({
              id: uuid(), co_id: coId, co_line_item_id: lineId,
              org_id: FC_ORG_ID, entered_by_role: 'FC_PM',
              entry_date: thirtyDaysAgo.split('T')[0],
              pricing_mode: 'hourly', hours: 16, hourly_rate: 45,
              line_total: 720, gc_approved: cfg.status === 'approved' || cfg.status === 'completed',
              gc_approved_at: ['approved', 'completed'].includes(cfg.status) ? thirtyDaysAgo : null,
              description: 'Framing crew — 2 men x 8 hours',
              is_actual_cost: false,
            })
            // TC markup entry
            await db.from('co_labor_entries').insert({
              id: uuid(), co_id: coId, co_line_item_id: lineId,
              org_id: TC_ORG_ID, entered_by_role: 'TC_PM',
              entry_date: thirtyDaysAgo.split('T')[0],
              pricing_mode: 'hourly', hours: 16, hourly_rate: 65,
              line_total: 1040, gc_approved: cfg.status === 'approved' || cfg.status === 'completed',
              gc_approved_at: ['approved', 'completed'].includes(cfg.status) ? thirtyDaysAgo : null,
              description: 'Framing labor — TC rate applied',
              is_actual_cost: false,
            })
          }
        }
      }

      // 11. Invoices ─────────────────────────
      const invoiceConfigs = def.healthy
        ? [
          { status: 'APPROVED', desc: 'Progress Draw #1 — Mobilization + 1st Floor', pct: 25 },
          { status: 'SUBMITTED', desc: 'Progress Draw #2 — 2nd Floor Framing', pct: 20 },
          { status: 'PAID', desc: 'Progress Draw #0 — Deposit', pct: 10 },
        ]
        : [
          { status: 'REJECTED', desc: 'Progress Draw #1 — Disputed amounts', pct: 25 },
          { status: 'DRAFT', desc: 'Progress Draw #2 — Incomplete', pct: 15 },
          { status: 'SUBMITTED', desc: 'WO Invoice — Damage repair', pct: 5 },
        ]

      for (let ii = 0; ii < invoiceConfigs.length; ii++) {
        const icfg = invoiceConfigs[ii]
        const invoiceId = uuid()
        const subtotal = Math.round(def.gcContract * icfg.pct / 100)
        const retainageAmt = Math.round(subtotal * def.retainage / 100)
        const totalAmt = subtotal - retainageAmt
        const billingStart = new Date(Date.now() - (60 - ii * 15) * 86400000).toISOString().split('T')[0]
        const billingEnd = new Date(Date.now() - (45 - ii * 15) * 86400000).toISOString().split('T')[0]

        await db.from('invoices').insert({
          id: invoiceId, project_id: projectId,
          invoice_number: `INV-${def.city.replace(/\s/g, '').slice(0, 4).toUpperCase()}-${projectIndex}${ii + 1}`,
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
          subject: 'Beam size discrepancy — kitchen header',
          question: 'Plans show a 4x12 header at the kitchen pass-through but the structural calcs reference a LVL 3-1/2x11-7/8. Which is correct for the 14ft span?',
          status: def.healthy ? 'answered' : 'open', priority: 'high',
          submitted_by_org_id: TC_ORG_ID, submitted_by_user_id: TC_USER_ID,
          assigned_to_org_id: GC_ORG_ID,
          answer: def.healthy ? 'Use the LVL 3-1/2x11-7/8 per updated structural calcs dated 3/15. The 4x12 on plans is superseded.' : null,
          answered_by_user_id: def.healthy ? GC_USER_ID : null,
          answered_at: def.healthy ? thirtyDaysAgo : null,
          due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          reference_area: '1st Floor, Kitchen',
        },
        {
          id: uuid(), project_id: projectId, rfi_number: 2,
          subject: 'Exterior trim material substitution',
          question: 'Specified cedar 1x6 S4S fascia is on 8-week backorder. Can we substitute PVC cellular trim board (Azek) at comparable dimensions?',
          status: 'open', priority: 'medium',
          submitted_by_org_id: TC_ORG_ID, submitted_by_user_id: TC_USER_ID,
          assigned_to_org_id: GC_ORG_ID,
          due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          reference_area: 'Exterior, All Elevations',
        },
      ])

      results.push({
        project: def.name, id: projectId, type: def.project_type,
        healthy: def.healthy, status: 'seeded',
        fcStatus, hasSov: !!sovId,
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
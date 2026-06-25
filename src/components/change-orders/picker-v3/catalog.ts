/**
 * Location × System × Scope catalog — single source of truth for the
 * manual CO/WO picker. Used to drive cascading constraints so users
 * can't pick real-world impossible combos (e.g. "HVAC duct in slab").
 *
 * Edit this file to red-line which systems are allowed in which locations
 * and which scopes/verbs/units are valid per system. The picker reads
 * from here; no constraint logic is duplicated elsewhere.
 */

export type Unit = 'SF' | 'LF' | 'EA' | 'CY' | 'CF' | 'hrs' | 'LS';
export type Verb =
  | 'Install'
  | 'Replace'
  | 'Repair'
  | 'Patch'
  | 'Demo'
  | 'Modify'
  | 'Relocate'
  | 'Add'
  | 'Remove';

export type Trade =
  | 'Concrete'
  | 'Framing'
  | 'Drywall'
  | 'Paint'
  | 'Flooring'
  | 'Tile'
  | 'Roofing'
  | 'Siding'
  | 'Windows-Doors'
  | 'Plumbing'
  | 'Electrical'
  | 'HVAC'
  | 'Low-voltage'
  | 'Fire-protection'
  | 'Insulation'
  | 'Waterproofing'
  | 'Masonry'
  | 'Steel'
  | 'Cabinets'
  | 'Countertops'
  | 'Appliances'
  | 'Landscape'
  | 'Paving'
  | 'Fencing'
  | 'Sitework'
  | 'General-labor';

// ─────────────────────────────────────────────────────────────
// LOCATION TYPES
// Project-derived locations (floors / rooms / exterior zones / roof /
// foundation / site) are filtered against these types so we know which
// systems are even possible there.
// ─────────────────────────────────────────────────────────────
export type LocationType =
  | 'site'
  | 'foundation'
  | 'basement'
  | 'interior-floor'   // a numbered story (incl. rooms)
  | 'interior-room'    // bath, kitchen, mech, etc.
  | 'exterior-wall'
  | 'exterior-zone'    // facade, deck, porch, balcony
  | 'roof'
  | 'attic'
  | 'garage';

// ─────────────────────────────────────────────────────────────
// SYSTEMS
// ─────────────────────────────────────────────────────────────
export interface SystemDef {
  id: string;
  label: string;
  defaultTrade: Trade;
  /** Scope IDs this system can host. */
  scopes: string[];
}

export const SYSTEMS: Record<string, SystemDef> = {
  // Structural / shell
  excavation:       { id: 'excavation',       label: 'Excavation',                defaultTrade: 'Sitework',       scopes: ['exc_dig','exc_backfill','exc_grade','exc_haul'] },
  footings:         { id: 'footings',         label: 'Footings',                  defaultTrade: 'Concrete',       scopes: ['ftg_form','ftg_rebar','ftg_pour','ftg_repair'] },
  foundation_wall:  { id: 'foundation_wall',  label: 'Foundation Wall',           defaultTrade: 'Concrete',       scopes: ['fw_form','fw_rebar','fw_pour','fw_waterproof','fw_repair'] },
  slab:             { id: 'slab',             label: 'Slab on Grade',             defaultTrade: 'Concrete',       scopes: ['slab_form','slab_rebar','slab_pour','slab_cut','slab_patch'] },
  framing_floor:    { id: 'framing_floor',    label: 'Floor Framing',             defaultTrade: 'Framing',        scopes: ['fr_joists','fr_subfloor','fr_beam','fr_repair'] },
  framing_wall:     { id: 'framing_wall',     label: 'Wall Framing',              defaultTrade: 'Framing',        scopes: ['fr_studs','fr_header','fr_blocking','fr_repair','fr_demo'] },
  framing_roof:     { id: 'framing_roof',     label: 'Roof Framing',              defaultTrade: 'Framing',        scopes: ['fr_rafters','fr_trusses','fr_sheath','fr_repair'] },
  sheathing:        { id: 'sheathing',        label: 'Sheathing',                 defaultTrade: 'Framing',        scopes: ['sh_wall','sh_roof','sh_repair'] },

  // Envelope
  roofing:          { id: 'roofing',          label: 'Roofing',                   defaultTrade: 'Roofing',        scopes: ['rf_shingles','rf_membrane','rf_flashing','rf_gutter','rf_repair'] },
  siding:           { id: 'siding',           label: 'Siding',                    defaultTrade: 'Siding',         scopes: ['sd_install','sd_repair','sd_trim'] },
  windows:          { id: 'windows',          label: 'Windows',                   defaultTrade: 'Windows-Doors',  scopes: ['win_install','win_replace','win_trim'] },
  exterior_doors:   { id: 'exterior_doors',   label: 'Exterior Doors',            defaultTrade: 'Windows-Doors',  scopes: ['xdr_install','xdr_replace','xdr_hardware'] },
  waterproofing:    { id: 'waterproofing',    label: 'Waterproofing',             defaultTrade: 'Waterproofing',  scopes: ['wp_membrane','wp_drain','wp_seal'] },
  insulation:       { id: 'insulation',       label: 'Insulation',                defaultTrade: 'Insulation',     scopes: ['ins_batt','ins_spray','ins_rigid'] },

  // Interior finishes
  drywall:          { id: 'drywall',          label: 'Drywall',                   defaultTrade: 'Drywall',        scopes: ['dw_hang','dw_tape','dw_patch','dw_demo'] },
  paint:            { id: 'paint',            label: 'Paint',                     defaultTrade: 'Paint',          scopes: ['pt_interior','pt_exterior','pt_touchup','pt_prime'] },
  flooring:         { id: 'flooring',         label: 'Flooring',                  defaultTrade: 'Flooring',       scopes: ['fl_install','fl_repair','fl_demo'] },
  tile:             { id: 'tile',             label: 'Tile',                      defaultTrade: 'Tile',           scopes: ['tl_floor','tl_wall','tl_repair'] },
  interior_doors:   { id: 'interior_doors',   label: 'Interior Doors',            defaultTrade: 'Windows-Doors',  scopes: ['idr_install','idr_hardware','idr_trim'] },
  trim:             { id: 'trim',             label: 'Trim & Millwork',           defaultTrade: 'Framing',        scopes: ['tr_base','tr_casing','tr_crown'] },
  cabinets:         { id: 'cabinets',         label: 'Cabinets',                  defaultTrade: 'Cabinets',       scopes: ['cab_install','cab_modify','cab_remove'] },
  countertops:      { id: 'countertops',      label: 'Countertops',               defaultTrade: 'Countertops',    scopes: ['ct_install','ct_repair'] },
  appliances:       { id: 'appliances',       label: 'Appliances',                defaultTrade: 'Appliances',     scopes: ['ap_install','ap_hookup','ap_remove'] },

  // MEP
  plumbing_rough:   { id: 'plumbing_rough',   label: 'Plumbing Rough-in',         defaultTrade: 'Plumbing',       scopes: ['pl_supply','pl_dwv','pl_reroute'] },
  plumbing_fix:     { id: 'plumbing_fix',     label: 'Plumbing Fixtures',         defaultTrade: 'Plumbing',       scopes: ['pl_fixture_install','pl_fixture_replace','pl_repair'] },
  electrical_rough: { id: 'electrical_rough', label: 'Electrical Rough-in',       defaultTrade: 'Electrical',     scopes: ['el_wire','el_panel','el_circuit'] },
  electrical_dev:   { id: 'electrical_dev',   label: 'Electrical Devices',        defaultTrade: 'Electrical',     scopes: ['el_outlet','el_switch','el_device_replace'] },
  lighting:         { id: 'lighting',         label: 'Lighting',                  defaultTrade: 'Electrical',     scopes: ['lt_install','lt_replace','lt_relocate'] },
  hvac_duct:        { id: 'hvac_duct',        label: 'HVAC Ductwork',             defaultTrade: 'HVAC',           scopes: ['hv_duct_install','hv_duct_reroute','hv_register'] },
  hvac_equip:       { id: 'hvac_equip',       label: 'HVAC Equipment',            defaultTrade: 'HVAC',           scopes: ['hv_unit_install','hv_unit_replace','hv_service'] },
  low_voltage:      { id: 'low_voltage',      label: 'Low Voltage',               defaultTrade: 'Low-voltage',    scopes: ['lv_data','lv_security','lv_av'] },
  fire_protection:  { id: 'fire_protection',  label: 'Fire Protection',           defaultTrade: 'Fire-protection',scopes: ['fp_sprinkler','fp_alarm'] },

  // Site
  sitework:         { id: 'sitework',         label: 'Sitework',                  defaultTrade: 'Sitework',       scopes: ['st_clear','st_grade','st_drain'] },
  paving:           { id: 'paving',           label: 'Paving',                    defaultTrade: 'Paving',         scopes: ['pv_asphalt','pv_concrete','pv_repair'] },
  landscape:        { id: 'landscape',        label: 'Landscape',                 defaultTrade: 'Landscape',      scopes: ['ls_plant','ls_irrigation','ls_hardscape'] },
  fencing:          { id: 'fencing',          label: 'Fencing',                   defaultTrade: 'Fencing',        scopes: ['fn_install','fn_repair','fn_gate'] },
};

// ─────────────────────────────────────────────────────────────
// SCOPES — verbs + unit per scope
// ─────────────────────────────────────────────────────────────
export interface ScopeDef {
  id: string;
  label: string;
  unit: Unit;
  verbs: Verb[];
}

const v = (...verbs: Verb[]) => verbs;

export const SCOPES: Record<string, ScopeDef> = {
  // excavation
  exc_dig:        { id: 'exc_dig',        label: 'Dig / Excavate',      unit: 'CY',  verbs: v('Add','Modify') },
  exc_backfill:   { id: 'exc_backfill',   label: 'Backfill',            unit: 'CY',  verbs: v('Install','Add') },
  exc_grade:      { id: 'exc_grade',      label: 'Rough grade',         unit: 'SF',  verbs: v('Modify') },
  exc_haul:       { id: 'exc_haul',       label: 'Haul-off',            unit: 'CY',  verbs: v('Remove') },
  // footings
  ftg_form:       { id: 'ftg_form',       label: 'Form footings',       unit: 'LF',  verbs: v('Install','Remove') },
  ftg_rebar:      { id: 'ftg_rebar',      label: 'Rebar',               unit: 'LF',  verbs: v('Install','Add') },
  ftg_pour:       { id: 'ftg_pour',       label: 'Pour concrete',       unit: 'CY',  verbs: v('Install') },
  ftg_repair:     { id: 'ftg_repair',     label: 'Repair footing',      unit: 'LF',  verbs: v('Repair','Patch') },
  // foundation wall
  fw_form:        { id: 'fw_form',        label: 'Form wall',           unit: 'SF',  verbs: v('Install','Remove') },
  fw_rebar:       { id: 'fw_rebar',       label: 'Rebar',               unit: 'LF',  verbs: v('Install','Add') },
  fw_pour:        { id: 'fw_pour',        label: 'Pour wall',           unit: 'CY',  verbs: v('Install') },
  fw_waterproof:  { id: 'fw_waterproof',  label: 'Waterproof wall',     unit: 'SF',  verbs: v('Install','Repair') },
  fw_repair:      { id: 'fw_repair',      label: 'Repair wall',         unit: 'SF',  verbs: v('Repair','Patch') },
  // slab
  slab_form:      { id: 'slab_form',      label: 'Form slab',           unit: 'LF',  verbs: v('Install') },
  slab_rebar:     { id: 'slab_rebar',     label: 'Rebar / mesh',        unit: 'SF',  verbs: v('Install','Add') },
  slab_pour:      { id: 'slab_pour',      label: 'Pour slab',           unit: 'CY',  verbs: v('Install') },
  slab_cut:       { id: 'slab_cut',       label: 'Saw-cut slab',        unit: 'LF',  verbs: v('Modify','Demo') },
  slab_patch:     { id: 'slab_patch',     label: 'Patch slab',          unit: 'SF',  verbs: v('Patch','Repair') },
  // framing
  fr_joists:      { id: 'fr_joists',      label: 'Floor joists',        unit: 'LF',  verbs: v('Install','Replace','Repair') },
  fr_subfloor:    { id: 'fr_subfloor',    label: 'Subfloor',            unit: 'SF',  verbs: v('Install','Replace','Repair') },
  fr_beam:        { id: 'fr_beam',        label: 'Beam',                unit: 'LF',  verbs: v('Install','Replace') },
  fr_studs:       { id: 'fr_studs',       label: 'Studs',               unit: 'LF',  verbs: v('Install','Replace','Add','Remove') },
  fr_header:      { id: 'fr_header',      label: 'Header',              unit: 'EA',  verbs: v('Install','Replace') },
  fr_blocking:    { id: 'fr_blocking',    label: 'Blocking',            unit: 'LF',  verbs: v('Install','Add') },
  fr_rafters:     { id: 'fr_rafters',     label: 'Rafters',             unit: 'LF',  verbs: v('Install','Replace','Repair') },
  fr_trusses:     { id: 'fr_trusses',     label: 'Trusses',             unit: 'EA',  verbs: v('Install','Replace') },
  fr_sheath:      { id: 'fr_sheath',      label: 'Roof sheathing',      unit: 'SF',  verbs: v('Install','Replace','Repair') },
  fr_repair:      { id: 'fr_repair',      label: 'Repair framing',      unit: 'hrs', verbs: v('Repair') },
  fr_demo:        { id: 'fr_demo',        label: 'Demo framing',        unit: 'SF',  verbs: v('Demo','Remove') },
  sh_wall:        { id: 'sh_wall',        label: 'Wall sheathing',      unit: 'SF',  verbs: v('Install','Replace','Repair') },
  sh_roof:        { id: 'sh_roof',        label: 'Roof sheathing',      unit: 'SF',  verbs: v('Install','Replace','Repair') },
  sh_repair:      { id: 'sh_repair',      label: 'Repair sheathing',    unit: 'SF',  verbs: v('Repair','Patch') },
  // roofing
  rf_shingles:    { id: 'rf_shingles',    label: 'Shingles',            unit: 'SF',  verbs: v('Install','Replace','Repair') },
  rf_membrane:    { id: 'rf_membrane',    label: 'Membrane / TPO',      unit: 'SF',  verbs: v('Install','Replace','Repair') },
  rf_flashing:    { id: 'rf_flashing',    label: 'Flashing',            unit: 'LF',  verbs: v('Install','Replace','Repair') },
  rf_gutter:      { id: 'rf_gutter',      label: 'Gutter / downspout',  unit: 'LF',  verbs: v('Install','Replace','Repair') },
  rf_repair:      { id: 'rf_repair',      label: 'Roof repair',         unit: 'SF',  verbs: v('Repair','Patch') },
  // siding
  sd_install:     { id: 'sd_install',     label: 'Siding install',      unit: 'SF',  verbs: v('Install','Replace') },
  sd_repair:      { id: 'sd_repair',      label: 'Siding repair',       unit: 'SF',  verbs: v('Repair','Patch') },
  sd_trim:        { id: 'sd_trim',        label: 'Exterior trim',       unit: 'LF',  verbs: v('Install','Replace') },
  // windows / doors
  win_install:    { id: 'win_install',    label: 'Window install',      unit: 'EA',  verbs: v('Install','Add') },
  win_replace:    { id: 'win_replace',    label: 'Window replace',      unit: 'EA',  verbs: v('Replace') },
  win_trim:       { id: 'win_trim',       label: 'Window trim',         unit: 'LF',  verbs: v('Install','Replace') },
  xdr_install:    { id: 'xdr_install',    label: 'Ext door install',    unit: 'EA',  verbs: v('Install','Add') },
  xdr_replace:    { id: 'xdr_replace',    label: 'Ext door replace',    unit: 'EA',  verbs: v('Replace') },
  xdr_hardware:   { id: 'xdr_hardware',   label: 'Ext door hardware',   unit: 'EA',  verbs: v('Install','Replace') },
  idr_install:    { id: 'idr_install',    label: 'Int door install',    unit: 'EA',  verbs: v('Install','Add','Replace') },
  idr_hardware:   { id: 'idr_hardware',   label: 'Int door hardware',   unit: 'EA',  verbs: v('Install','Replace') },
  idr_trim:       { id: 'idr_trim',       label: 'Door trim/casing',    unit: 'LF',  verbs: v('Install','Replace') },
  // waterproofing / insulation
  wp_membrane:    { id: 'wp_membrane',    label: 'Membrane',            unit: 'SF',  verbs: v('Install','Repair') },
  wp_drain:       { id: 'wp_drain',       label: 'Drain board / pipe',  unit: 'LF',  verbs: v('Install','Repair') },
  wp_seal:        { id: 'wp_seal',        label: 'Sealant',             unit: 'LF',  verbs: v('Install','Repair') },
  ins_batt:       { id: 'ins_batt',       label: 'Batt insulation',     unit: 'SF',  verbs: v('Install','Add') },
  ins_spray:      { id: 'ins_spray',      label: 'Spray foam',          unit: 'SF',  verbs: v('Install','Add') },
  ins_rigid:      { id: 'ins_rigid',      label: 'Rigid foam',          unit: 'SF',  verbs: v('Install','Add') },
  // interior finishes
  dw_hang:        { id: 'dw_hang',        label: 'Hang drywall',        unit: 'SF',  verbs: v('Install','Replace') },
  dw_tape:        { id: 'dw_tape',        label: 'Tape & finish',       unit: 'SF',  verbs: v('Install') },
  dw_patch:       { id: 'dw_patch',       label: 'Drywall patch',       unit: 'EA',  verbs: v('Patch','Repair') },
  dw_demo:        { id: 'dw_demo',        label: 'Drywall demo',        unit: 'SF',  verbs: v('Demo','Remove') },
  pt_interior:    { id: 'pt_interior',    label: 'Paint interior',      unit: 'SF',  verbs: v('Install','Add') },
  pt_exterior:    { id: 'pt_exterior',    label: 'Paint exterior',      unit: 'SF',  verbs: v('Install','Add') },
  pt_touchup:     { id: 'pt_touchup',     label: 'Paint touch-up',      unit: 'hrs', verbs: v('Repair','Patch') },
  pt_prime:       { id: 'pt_prime',       label: 'Prime',               unit: 'SF',  verbs: v('Install') },
  fl_install:     { id: 'fl_install',     label: 'Flooring install',    unit: 'SF',  verbs: v('Install','Replace') },
  fl_repair:      { id: 'fl_repair',      label: 'Flooring repair',     unit: 'SF',  verbs: v('Repair','Patch') },
  fl_demo:        { id: 'fl_demo',        label: 'Flooring demo',       unit: 'SF',  verbs: v('Demo','Remove') },
  tl_floor:       { id: 'tl_floor',       label: 'Floor tile',          unit: 'SF',  verbs: v('Install','Replace') },
  tl_wall:        { id: 'tl_wall',        label: 'Wall tile',           unit: 'SF',  verbs: v('Install','Replace') },
  tl_repair:      { id: 'tl_repair',      label: 'Tile repair',         unit: 'EA',  verbs: v('Repair','Patch') },
  tr_base:        { id: 'tr_base',        label: 'Baseboard',           unit: 'LF',  verbs: v('Install','Replace') },
  tr_casing:      { id: 'tr_casing',      label: 'Casing',              unit: 'LF',  verbs: v('Install','Replace') },
  tr_crown:       { id: 'tr_crown',       label: 'Crown',               unit: 'LF',  verbs: v('Install','Replace') },
  cab_install:    { id: 'cab_install',    label: 'Cabinet install',     unit: 'LF',  verbs: v('Install','Replace') },
  cab_modify:     { id: 'cab_modify',     label: 'Cabinet modify',      unit: 'EA',  verbs: v('Modify','Repair') },
  cab_remove:     { id: 'cab_remove',     label: 'Cabinet remove',      unit: 'LF',  verbs: v('Remove','Demo') },
  ct_install:     { id: 'ct_install',     label: 'Countertop install',  unit: 'SF',  verbs: v('Install','Replace') },
  ct_repair:      { id: 'ct_repair',      label: 'Countertop repair',   unit: 'EA',  verbs: v('Repair','Patch') },
  ap_install:     { id: 'ap_install',     label: 'Appliance install',   unit: 'EA',  verbs: v('Install','Replace') },
  ap_hookup:      { id: 'ap_hookup',      label: 'Appliance hookup',    unit: 'EA',  verbs: v('Install') },
  ap_remove:      { id: 'ap_remove',      label: 'Appliance remove',    unit: 'EA',  verbs: v('Remove') },
  // MEP
  pl_supply:      { id: 'pl_supply',      label: 'Supply lines',        unit: 'LF',  verbs: v('Install','Replace','Relocate') },
  pl_dwv:         { id: 'pl_dwv',         label: 'DWV / drains',        unit: 'LF',  verbs: v('Install','Replace','Relocate') },
  pl_reroute:     { id: 'pl_reroute',     label: 'Reroute plumbing',    unit: 'hrs', verbs: v('Modify','Relocate') },
  pl_fixture_install:{ id:'pl_fixture_install', label:'Fixture install', unit:'EA',  verbs: v('Install','Add') },
  pl_fixture_replace:{ id:'pl_fixture_replace', label:'Fixture replace', unit:'EA',  verbs: v('Replace') },
  pl_repair:      { id: 'pl_repair',      label: 'Plumbing repair',     unit: 'hrs', verbs: v('Repair') },
  el_wire:        { id: 'el_wire',        label: 'Wire / cable',        unit: 'LF',  verbs: v('Install','Add','Relocate') },
  el_panel:       { id: 'el_panel',       label: 'Panel / sub-panel',   unit: 'EA',  verbs: v('Install','Replace','Modify') },
  el_circuit:     { id: 'el_circuit',     label: 'Circuit',             unit: 'EA',  verbs: v('Add','Modify') },
  el_outlet:      { id: 'el_outlet',      label: 'Outlet',              unit: 'EA',  verbs: v('Install','Replace','Add','Relocate') },
  el_switch:      { id: 'el_switch',      label: 'Switch',              unit: 'EA',  verbs: v('Install','Replace','Add','Relocate') },
  el_device_replace:{ id:'el_device_replace', label:'Device replace',   unit:'EA',  verbs: v('Replace') },
  lt_install:     { id: 'lt_install',     label: 'Light fixture install',unit:'EA',  verbs: v('Install','Add') },
  lt_replace:     { id: 'lt_replace',     label: 'Light fixture replace',unit:'EA',  verbs: v('Replace') },
  lt_relocate:    { id: 'lt_relocate',    label: 'Light fixture relocate',unit:'EA', verbs: v('Relocate') },
  hv_duct_install:{ id: 'hv_duct_install',label: 'Duct install',        unit: 'LF',  verbs: v('Install','Add') },
  hv_duct_reroute:{ id: 'hv_duct_reroute',label: 'Duct reroute',        unit: 'hrs', verbs: v('Modify','Relocate') },
  hv_register:    { id: 'hv_register',    label: 'Register / grille',   unit: 'EA',  verbs: v('Install','Replace','Relocate') },
  hv_unit_install:{ id: 'hv_unit_install',label: 'HVAC unit install',   unit: 'EA',  verbs: v('Install','Add') },
  hv_unit_replace:{ id: 'hv_unit_replace',label: 'HVAC unit replace',   unit: 'EA',  verbs: v('Replace') },
  hv_service:     { id: 'hv_service',     label: 'HVAC service',        unit: 'hrs', verbs: v('Repair') },
  lv_data:        { id: 'lv_data',        label: 'Data / network',      unit: 'EA',  verbs: v('Install','Add','Relocate') },
  lv_security:    { id: 'lv_security',    label: 'Security / cameras',  unit: 'EA',  verbs: v('Install','Add') },
  lv_av:          { id: 'lv_av',          label: 'A/V',                 unit: 'EA',  verbs: v('Install','Add') },
  fp_sprinkler:   { id: 'fp_sprinkler',   label: 'Sprinkler head/line', unit: 'EA',  verbs: v('Install','Replace','Relocate') },
  fp_alarm:       { id: 'fp_alarm',       label: 'Fire alarm device',   unit: 'EA',  verbs: v('Install','Replace') },
  // site
  st_clear:       { id: 'st_clear',       label: 'Clear / strip',       unit: 'SF',  verbs: v('Demo','Remove') },
  st_grade:       { id: 'st_grade',       label: 'Grading',             unit: 'SF',  verbs: v('Modify') },
  st_drain:       { id: 'st_drain',       label: 'Site drainage',       unit: 'LF',  verbs: v('Install','Repair') },
  pv_asphalt:     { id: 'pv_asphalt',     label: 'Asphalt paving',      unit: 'SF',  verbs: v('Install','Replace','Repair') },
  pv_concrete:    { id: 'pv_concrete',    label: 'Concrete paving',     unit: 'SF',  verbs: v('Install','Replace','Repair') },
  pv_repair:      { id: 'pv_repair',      label: 'Paving repair',       unit: 'SF',  verbs: v('Repair','Patch') },
  ls_plant:       { id: 'ls_plant',       label: 'Planting',            unit: 'EA',  verbs: v('Install','Replace') },
  ls_irrigation:  { id: 'ls_irrigation',  label: 'Irrigation',          unit: 'LF',  verbs: v('Install','Repair') },
  ls_hardscape:   { id: 'ls_hardscape',   label: 'Hardscape',           unit: 'SF',  verbs: v('Install','Repair') },
  fn_install:     { id: 'fn_install',     label: 'Fence install',       unit: 'LF',  verbs: v('Install') },
  fn_repair:      { id: 'fn_repair',      label: 'Fence repair',        unit: 'LF',  verbs: v('Repair') },
  fn_gate:        { id: 'fn_gate',        label: 'Gate',                unit: 'EA',  verbs: v('Install','Replace','Repair') },
};

// ─────────────────────────────────────────────────────────────
// LOCATION → allowed SYSTEMS matrix
// Anything not listed is HIDDEN in the picker.
// ─────────────────────────────────────────────────────────────
export const LOCATION_SYSTEMS: Record<LocationType, string[]> = {
  site: ['excavation','sitework','paving','landscape','fencing','fire_protection','low_voltage'],
  foundation: ['excavation','footings','foundation_wall','slab','waterproofing','insulation'],
  basement: ['slab','foundation_wall','framing_wall','framing_floor','waterproofing','insulation',
             'drywall','paint','flooring','plumbing_rough','plumbing_fix','electrical_rough',
             'electrical_dev','lighting','hvac_duct','hvac_equip','low_voltage','fire_protection',
             'interior_doors','trim'],
  'interior-floor': ['framing_floor','framing_wall','drywall','paint','flooring','tile','trim',
                     'interior_doors','cabinets','countertops','appliances','plumbing_rough',
                     'plumbing_fix','electrical_rough','electrical_dev','lighting','hvac_duct',
                     'low_voltage','fire_protection','insulation'],
  'interior-room': ['drywall','paint','flooring','tile','trim','interior_doors','cabinets',
                    'countertops','appliances','plumbing_fix','electrical_dev','lighting',
                    'hv_register' /* via hvac_duct */,'low_voltage','fire_protection'],
  'exterior-wall': ['framing_wall','sheathing','siding','windows','exterior_doors','waterproofing',
                    'insulation','paint','electrical_dev','lighting'],
  'exterior-zone': ['paint','sitework','landscape','fencing','lighting','electrical_dev','paving'],
  roof: ['framing_roof','sheathing','roofing','insulation'],
  attic: ['framing_roof','sheathing','insulation','electrical_rough','hvac_duct','hvac_equip','low_voltage'],
  garage: ['slab','framing_wall','framing_roof','sheathing','drywall','paint','flooring',
           'exterior_doors','electrical_rough','electrical_dev','lighting','hvac_duct','insulation'],
};

// `interior-room` typo-guard: remove the stray hv_register entry above if you
// edit. (Rooms still get HVAC distribution via `hvac_duct` from the floor.)

// Helpers
export const allowedSystemsFor = (loc: LocationType): SystemDef[] =>
  (LOCATION_SYSTEMS[loc] || [])
    .map((id) => SYSTEMS[id])
    .filter(Boolean);

export const allowedScopesFor = (systemId: string): ScopeDef[] =>
  (SYSTEMS[systemId]?.scopes || [])
    .map((id) => SCOPES[id])
    .filter(Boolean);

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  site: 'Site',
  foundation: 'Foundation',
  basement: 'Basement',
  'interior-floor': 'Interior Floor',
  'interior-room': 'Interior Room',
  'exterior-wall': 'Exterior Wall',
  'exterior-zone': 'Exterior Zone',
  roof: 'Roof',
  attic: 'Attic',
  garage: 'Garage',
};

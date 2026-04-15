export interface ScopeItem {
  id: string;
  name: string;
  unit: 'LF' | 'SF' | 'EA' | 'LS' | 'SQ' | 'HR';
  workType: string;
  tag?: 'structural' | 'wrb' | null;
}

export const SCOPE_CATALOG: ScopeItem[] = [
  // ── FRAMING ─────────────────────────────────────────
  { id:'f1',  name:'New wall framing',            unit:'LF', workType:'framing' },
  { id:'f2',  name:'Reframe existing wall',        unit:'LF', workType:'framing' },
  { id:'f3',  name:'Header installation',          unit:'EA', workType:'framing' },
  { id:'f4',  name:'Partition wall',               unit:'LF', workType:'framing' },
  { id:'f5',  name:'Soffit framing',               unit:'LF', workType:'framing' },
  { id:'f6',  name:'Closet build-out',             unit:'EA', workType:'framing' },
  { id:'f7',  name:'Niche framing',                unit:'EA', workType:'framing' },
  { id:'f8',  name:'Opening modification',         unit:'EA', workType:'framing' },
  { id:'f9',  name:'Wall relocation',              unit:'LF', workType:'framing' },
  { id:'f10', name:'Bulkhead framing',             unit:'LF', workType:'framing' },
  { id:'f11', name:'Cripple wall framing',         unit:'LF', workType:'framing' },
  { id:'f12', name:'Floor joist repair',           unit:'LF', workType:'framing' },

  // ── STRUCTURAL ───────────────────────────────────────
  { id:'s01', name:'LVL beam installation',                    unit:'LF', workType:'structural', tag:'structural' },
  { id:'s02', name:'Steel beam installation',                  unit:'LF', workType:'structural', tag:'structural' },
  { id:'s03', name:'Wood beam installation',                   unit:'LF', workType:'structural', tag:'structural' },
  { id:'s04', name:'Beam replacement',                         unit:'EA', workType:'structural', tag:'structural' },
  { id:'s05', name:'Beam repair / sister',                     unit:'LF', workType:'structural', tag:'structural' },
  { id:'s06', name:'Structural column install',                unit:'EA', workType:'structural', tag:'structural' },
  { id:'s07', name:'Structural column relocation',             unit:'EA', workType:'structural', tag:'structural' },
  { id:'s08', name:'Steel post install',                       unit:'EA', workType:'structural', tag:'structural' },
  { id:'s09', name:'Column base hardware',                     unit:'EA', workType:'structural', tag:'structural' },
  { id:'s10', name:'Joist hanger install',                     unit:'EA', workType:'structural', tag:'structural' },
  { id:'s11', name:'Post base / cap hardware',                 unit:'EA', workType:'structural', tag:'structural' },
  { id:'s12', name:'Hold-down anchor install',                 unit:'EA', workType:'structural', tag:'structural' },
  { id:'s13', name:'Strap tie / hurricane tie',                unit:'EA', workType:'structural', tag:'structural' },
  { id:'s14', name:'Bearing wall modification',                unit:'EA', workType:'structural', tag:'structural' },
  { id:'s15', name:'Transfer beam framing',                    unit:'EA', workType:'structural', tag:'structural' },
  { id:'s16', name:'Rim joist repair / replace',               unit:'LF', workType:'structural', tag:'structural' },
  { id:'s17', name:'Ledger board installation',                unit:'LF', workType:'structural', tag:'structural' },
  { id:'s18', name:'Shear wall framing',                       unit:'SF', workType:'structural', tag:'structural' },
  { id:'s19', name:'Drag strut installation',                  unit:'LF', workType:'structural', tag:'structural' },
  { id:'s20', name:'Moment connection hardware',               unit:'EA', workType:'structural', tag:'structural' },
  { id:'s21', name:'Cantilever framing',                       unit:'LF', workType:'structural', tag:'structural' },
  { id:'s22', name:'Structural repair — fire / water damage',  unit:'EA', workType:'structural', tag:'structural' },
  { id:'s23', name:'Lateral bracing install',                  unit:'EA', workType:'structural', tag:'structural' },
  { id:'s24', name:'Anchor bolt / sill plate fix',             unit:'EA', workType:'structural', tag:'structural' },

  // ── WRB & ENVELOPE ──────────────────────────────────
  { id:'w01', name:'Housewrap (Tyvek) install',               unit:'SF', workType:'wrb', tag:'wrb' },
  { id:'w02', name:'Housewrap repair / patch',                unit:'SF', workType:'wrb', tag:'wrb' },
  { id:'w03', name:'Housewrap lap tape',                      unit:'LF', workType:'wrb', tag:'wrb' },
  { id:'w04', name:'WRB seam tape',                           unit:'LF', workType:'wrb', tag:'wrb' },
  { id:'w05', name:'Self-adhered membrane install',           unit:'SF', workType:'wrb', tag:'wrb' },
  { id:'w06', name:'Fluid-applied WRB coat',                  unit:'SF', workType:'wrb', tag:'wrb' },
  { id:'w07', name:'Window flashing tape',                    unit:'LF', workType:'wrb', tag:'wrb' },
  { id:'w08', name:'Door flashing tape',                      unit:'LF', workType:'wrb', tag:'wrb' },
  { id:'w09', name:'Sill pan flashing install',               unit:'EA', workType:'wrb', tag:'wrb' },
  { id:'w10', name:'Head flashing install',                   unit:'LF', workType:'wrb', tag:'wrb' },
  { id:'w11', name:'Kick-out flashing install',               unit:'EA', workType:'wrb', tag:'wrb' },
  { id:'w12', name:'Step flashing install',                   unit:'LF', workType:'wrb', tag:'wrb' },
  { id:'w13', name:'Valley flashing install',                 unit:'LF', workType:'wrb', tag:'wrb' },
  { id:'w14', name:'Drip cap install',                        unit:'LF', workType:'wrb', tag:'wrb' },
  { id:'w15', name:'Ice and water shield',                    unit:'SF', workType:'wrb', tag:'wrb' },
  { id:'w16', name:'Window buck install',                     unit:'EA', workType:'wrb', tag:'wrb' },
  { id:'w17', name:'Window rough opening prep',               unit:'EA', workType:'wrb', tag:'wrb' },
  { id:'w18', name:'Window installation — new',               unit:'EA', workType:'wrb', tag:'wrb' },
  { id:'w19', name:'Window removal',                          unit:'EA', workType:'wrb', tag:'wrb' },
  { id:'w20', name:'Window replacement (remove + install)',   unit:'EA', workType:'wrb', tag:'wrb' },
  { id:'w21', name:'Window resizing — RO modification',       unit:'EA', workType:'wrb', tag:'wrb' },
  { id:'w22', name:'Exterior door installation — new',        unit:'EA', workType:'wrb', tag:'wrb' },
  { id:'w23', name:'Exterior door removal',                   unit:'EA', workType:'wrb', tag:'wrb' },
  { id:'w24', name:'Exterior door replacement',               unit:'EA', workType:'wrb', tag:'wrb' },
  { id:'w25', name:'Door RO modification',                    unit:'EA', workType:'wrb', tag:'wrb' },
  { id:'w26', name:'Threshold flashing',                      unit:'EA', workType:'wrb', tag:'wrb' },
  { id:'w27', name:'Sliding door flashing / install',         unit:'EA', workType:'wrb', tag:'wrb' },
  { id:'w28', name:'Skylight flashing',                       unit:'EA', workType:'wrb', tag:'wrb' },
  { id:'w29', name:'Penetration flashing (pipe, vent)',       unit:'EA', workType:'wrb', tag:'wrb' },
  { id:'w30', name:'WRB inspection and remediation',          unit:'LS', workType:'wrb', tag:'wrb' },

  // ── DEMO ────────────────────────────────────────────
  { id:'d1', name:'Selective demolition',          unit:'SF', workType:'demo' },
  { id:'d2', name:'Wall removal',                  unit:'EA', workType:'demo' },
  { id:'d3', name:'Floor demo',                    unit:'SF', workType:'demo' },
  { id:'d4', name:'Ceiling demo',                  unit:'SF', workType:'demo' },
  { id:'d5', name:'Cabinet removal',               unit:'EA', workType:'demo' },
  { id:'d6', name:'Damaged material removal',      unit:'SF', workType:'demo' },
  { id:'d7', name:'Window removal',                unit:'EA', workType:'demo' },
  { id:'d8', name:'Door removal',                  unit:'EA', workType:'demo' },
  { id:'d9', name:'Beam removal',                  unit:'EA', workType:'demo' },
  { id:'d10',name:'Column removal',                unit:'EA', workType:'demo' },

  // ── SHEATHING ────────────────────────────────────────
  { id:'sh1', name:'Wall sheathing',               unit:'SF', workType:'sheathing' },
  { id:'sh2', name:'Roof sheathing',               unit:'SF', workType:'sheathing' },
  { id:'sh3', name:'Subfloor install',             unit:'SF', workType:'sheathing' },
  { id:'sh4', name:'Subfloor repair',              unit:'SF', workType:'sheathing' },
  { id:'sh5', name:'Sheathing replacement',        unit:'SF', workType:'sheathing' },
  { id:'sh6', name:'Backer board',                 unit:'SF', workType:'sheathing' },
  { id:'sh7', name:'Shear panel',                  unit:'SF', workType:'sheathing' },

  // ── BLOCKING ─────────────────────────────────────────
  { id:'b1', name:'TV mount blocking',             unit:'EA', workType:'blocking' },
  { id:'b2', name:'Grab bar blocking',             unit:'EA', workType:'blocking' },
  { id:'b3', name:'Cabinet blocking',              unit:'LF', workType:'blocking' },
  { id:'b4', name:'Shelf blocking',                unit:'LF', workType:'blocking' },
  { id:'b5', name:'Handrail blocking',             unit:'LF', workType:'blocking' },
  { id:'b6', name:'General blocking',              unit:'LF', workType:'blocking' },

  // ── EXTERIOR ─────────────────────────────────────────
  { id:'e1', name:'Deck framing',                  unit:'SF', workType:'exterior' },
  { id:'e2', name:'Pergola framing',               unit:'SF', workType:'exterior' },
  { id:'e3', name:'Fence framing',                 unit:'LF', workType:'exterior' },
  { id:'e4', name:'Siding prep',                   unit:'SF', workType:'exterior' },
  { id:'e5', name:'Fascia trim',                   unit:'LF', workType:'exterior' },
  { id:'e6', name:'Soffit panel',                  unit:'SF', workType:'exterior' },
  { id:'e7', name:'Exterior door rough-in',        unit:'EA', workType:'exterior' },

  // ── BACKOUT ──────────────────────────────────────────
  { id:'k1', name:'Code correction',               unit:'EA', workType:'backout' },
  { id:'k2', name:'Inspection fix',                unit:'EA', workType:'backout' },
  { id:'k3', name:'Punch list item',               unit:'EA', workType:'backout' },
  { id:'k4', name:'Warranty callback',             unit:'EA', workType:'backout' },
  { id:'k5', name:'GC-directed fix',               unit:'EA', workType:'backout' },
  { id:'k6', name:'MEP backout',                   unit:'EA', workType:'backout' },

  // ── STAIRS ───────────────────────────────────────────
  { id:'st1', name:'New staircase framing',        unit:'EA', workType:'stairs' },
  { id:'st2', name:'Stair modification',           unit:'EA', workType:'stairs' },
  { id:'st3', name:'Landing framing',              unit:'SF', workType:'stairs' },
  { id:'st4', name:'Stringer replacement',         unit:'EA', workType:'stairs' },
  { id:'st5', name:'Handrail framing',             unit:'LF', workType:'stairs' },

  // ── OTHER ────────────────────────────────────────────
  { id:'o1', name:'Scope addition — general',      unit:'LS', workType:'other' },
  { id:'o2', name:'Miscellaneous framing',         unit:'LS', workType:'other' },
  { id:'o3', name:'Site cleanup',                  unit:'LS', workType:'other' },
  { id:'o4', name:'Temporary bracing',             unit:'EA', workType:'other' },
  { id:'o5', name:'Layout and layout checks',      unit:'LS', workType:'other' },
];

// Key: COReasonCode → workType → array of item names to pre-select
export const SMART_SUGGESTIONS: Record<string, Record<string, string[]>> = {
  addition: {
    framing:    ['New wall framing', 'Header installation', 'Partition wall'],
    structural: ['LVL beam installation', 'Structural column install', 'Joist hanger install'],
    wrb:        ['Housewrap (Tyvek) install', 'Sill pan flashing install', 'Window installation — new'],
    sheathing:  ['Wall sheathing', 'Subfloor install'],
    blocking:   ['TV mount blocking', 'Cabinet blocking'],
    exterior:   ['Deck framing', 'Fascia trim'],
    stairs:     ['New staircase framing'],
  },
  rework: {
    framing:    ['Reframe existing wall', 'Header installation', 'Wall relocation'],
    structural: ['Beam repair / sister', 'Rim joist repair / replace', 'Anchor bolt / sill plate fix'],
    demo:       ['Wall removal', 'Damaged material removal'],
    backout:    ['Code correction', 'Inspection fix'],
  },
  design_change: {
    framing:    ['Wall relocation', 'Opening modification', 'Partition wall'],
    structural: ['Transfer beam framing', 'Bearing wall modification'],
    wrb:        ['Window resizing — RO modification', 'Door RO modification'],
    stairs:     ['Stair modification'],
  },
  damaged_by_others: {
    framing:    ['Floor joist repair', 'Cripple wall framing'],
    structural: ['Structural repair — fire / water damage', 'Beam repair / sister', 'Rim joist repair / replace'],
    wrb:        ['Housewrap repair / patch', 'Self-adhered membrane install', 'WRB inspection and remediation'],
    demo:       ['Damaged material removal'],
  },
  owner_request: {
    framing:    ['Partition wall', 'Closet build-out', 'Niche framing'],
    blocking:   ['TV mount blocking', 'Shelf blocking'],
    wrb:        ['Window installation — new', 'Exterior door installation — new', 'Skylight flashing'],
    exterior:   ['Deck framing'],
  },
  gc_request: {
    framing:    ['New wall framing', 'Header installation'],
    structural: ['Structural column install', 'Hold-down anchor install'],
    wrb:        ['Housewrap (Tyvek) install', 'Sill pan flashing install'],
    backout:    ['GC-directed fix'],
  },
  other: {
    framing:    ['New wall framing'],
    structural: ['Structural column install'],
    wrb:        ['Housewrap (Tyvek) install'],
    other:      ['Scope addition — general'],
  },
};

// Which work types to surface first for each reason
export const REASON_WORKTYPE_HINTS: Record<string, string[]> = {
  addition:         ['framing', 'wrb', 'exterior'],
  rework:           ['framing', 'structural', 'backout'],
  design_change:    ['framing', 'structural', 'wrb'],
  damaged_by_others:['structural', 'wrb', 'framing'],
  owner_request:    ['framing', 'blocking', 'wrb'],
  gc_request:       ['framing', 'structural', 'wrb'],
  other:            ['framing', 'wrb', 'other'],
};

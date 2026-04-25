/**
 * Intent → ScopeFlow lookup.
 *
 * Replaces the broken (BuildingType × FlowScenario) matrix where every
 * non-damage / non-rework reason silently defaulted to `addition`.
 *
 * Each WorkIntent now maps to its own purpose-built question tree (3–5
 * questions max). The `repair_damage`, `add_new`, and `redo_work` intents
 * delegate to the existing FLOWS for back-compat with the rich,
 * building-type-specific trees already authored. The other 7 intents are
 * brand-new flows authored here.
 */

import type { ScopeFlow, WorkIntent, BuildingType, FlowContext } from '@/types/scopeQA';
import { FLOWS } from '@/lib/framingQuestionTrees';

// ── Helpers shared by new intent flows ─────────────────────────

function loc(ctx: FlowContext): string {
  if (!ctx.locationTag) return 'work area';
  const parts = ctx.locationTag.split('·').map(s => s.trim());
  return parts[parts.length - 1] || ctx.locationTag;
}

function val(answers: Record<string, string | string[]>, id: string): string {
  const a = answers[id];
  if (Array.isArray(a)) return a[0] ?? '';
  return (a as string) ?? '';
}

function lookup(map: Record<string, string>, key: string, fallback = ''): string {
  if (!key || key === '__skip__') return fallback;
  return map[key] ?? fallback;
}

// ── New intent flow: tear_out ──────────────────────────────────

const TEAR_OUT_FLOW: ScopeFlow = {
  title: 'What needs to come out?',
  sub: 'Demolition / removal scope.',
  questions: [
    {
      id: 'what',
      text: 'What are you tearing out?',
      grid: 'cols-4',
      answers: [
        { id: 'wall_partition', label: 'Partition wall',  icon: '▮' },
        { id: 'wall_bearing',   label: 'Bearing wall',    icon: '⬛', spec: true, sub: 'PE may be needed' },
        { id: 'soffit',         label: 'Soffit / bulkhead', icon: '▤' },
        { id: 'cabinet',        label: 'Cabinets',        icon: '☐' },
        { id: 'flooring',       label: 'Flooring',        icon: '═' },
        { id: 'fixture',        label: 'Fixtures',        icon: '🚿' },
        { id: 'ceiling',        label: 'Ceiling',         icon: '─' },
        { id: 'other',          label: 'Other',           icon: '•' },
      ],
    },
    {
      id: 'extent',
      text: 'How much is coming out?',
      grid: 'scale',
      answers: [
        { id: 'spot',     label: 'Spot',     sub: '< 4 LF / SF' },
        { id: 'small',    label: 'Small',    sub: '4–16' },
        { id: 'medium',   label: 'Medium',   sub: '16–50' },
        { id: 'large',    label: 'Large',    sub: '50–200' },
        { id: 'full',     label: 'Full room', sub: 'all of it' },
      ],
    },
    {
      id: 'disposal',
      text: 'Who handles disposal?',
      hint: 'Affects price and equipment needs (dumpster, dump runs).',
      grid: 'cols-3',
      answers: [
        { id: 'us_haul',  label: 'We haul it',     icon: '🚚' },
        { id: 'gc_dump',  label: 'GC has dumpster', icon: '🗑️' },
        { id: 'unsure',   label: 'Not sure',       icon: '❓' },
      ],
    },
    {
      id: 'protection',
      text: 'Protection / dust control needed?',
      grid: 'cols-3',
      answers: [
        { id: 'none',       label: 'None',                 icon: '◯' },
        { id: 'plastic',    label: 'Poly + zip walls',     icon: '┃' },
        { id: 'occupied',   label: 'Occupied — full negative-air', icon: '🌬️', spec: true },
      ],
    },
  ],
  summarize: (ctx, a) => {
    const what = lookup({
      wall_partition: 'partition wall', wall_bearing: 'bearing wall',
      soffit: 'soffit/bulkhead', cabinet: 'cabinets', flooring: 'flooring',
      fixture: 'fixtures', ceiling: 'ceiling', other: 'existing work',
    }, val(a, 'what'), 'existing work');
    const extent = lookup({
      spot: 'a spot of', small: 'a small section of', medium: 'a medium area of',
      large: 'a large area of', full: 'the full room of',
    }, val(a, 'extent'), '');
    const disposal = val(a, 'disposal') === 'us_haul' ? 'We haul debris.' :
                     val(a, 'disposal') === 'gc_dump' ? 'GC dumpster on site.' : '';
    const protect = val(a, 'protection') === 'occupied' ? 'Occupied — full dust containment required.' :
                    val(a, 'protection') === 'plastic' ? 'Poly sheeting and zip walls.' : '';
    const bearingNote = val(a, 'what') === 'wall_bearing'
      ? 'BEARING wall — temporary shoring required, engineer review per IRC R301.1.3.'
      : '';
    return `Demo ${extent} ${what} in the ${loc(ctx)}. ${bearingNote} ${disposal} ${protect}`.replace(/\s+/g, ' ').trim();
  },
};

// ── New intent flow: envelope_work ─────────────────────────────

const ENVELOPE_FLOW: ScopeFlow = {
  title: 'What envelope work?',
  sub: 'Exterior shell — WRB, sheathing, flashing, siding prep.',
  questions: [
    {
      id: 'layer',
      text: 'Which layer of the envelope?',
      grid: 'cols-4',
      answers: [
        { id: 'wrb',         label: 'WRB / housewrap',   icon: '🛡️' },
        { id: 'sheathing',   label: 'Wall sheathing',    icon: '▦' },
        { id: 'roof_sheath', label: 'Roof sheathing',    icon: '⟍' },
        { id: 'flashing',    label: 'Flashing',          icon: '〰' },
        { id: 'siding_prep', label: 'Siding prep',       icon: '┃' },
        { id: 'fascia',      label: 'Fascia / soffit',   icon: '═' },
        { id: 'window_flash',label: 'Window flashing',   icon: '▭' },
        { id: 'membrane',    label: 'Self-adhered mbr.', icon: '▤' },
      ],
    },
    {
      id: 'condition',
      text: "What's the existing condition?",
      grid: 'cols-3',
      annotation: '<b>Watch for:</b> water staining, soft sheathing, rot at penetrations. If you see darkening or punky wood, treat the area as repair scope before proceeding.',
      answers: [
        { id: 'clean',       label: 'Clean substrate',   icon: '◯' },
        { id: 'staining',    label: 'Water staining',    icon: '◐', sub: 'investigate' },
        { id: 'rot',         label: 'Active rot found',  icon: '⚠', spec: true },
      ],
    },
    {
      id: 'extent',
      text: 'How much area?',
      grid: 'scale',
      answers: [
        { id: 'patch',  label: 'Patch',     sub: '< 16 SF' },
        { id: 'small',  label: 'Small',     sub: '16–80 SF' },
        { id: 'med',    label: 'Medium',    sub: '80–400 SF' },
        { id: 'large',  label: 'Large',     sub: '400+ SF' },
        { id: 'full',   label: 'Full elev.', sub: 'whole wall' },
      ],
    },
    {
      id: 'exposure',
      text: 'Weather exposure right now?',
      hint: 'Tarp / temporary protection adds time and material.',
      grid: 'cols-3',
      answers: [
        { id: 'dry',     label: 'Dry — no rain forecast', icon: '☀' },
        { id: 'mixed',   label: 'Mixed — tarp ready',     icon: '⛅' },
        { id: 'wet',     label: 'Wet — must tarp',        icon: '🌧', spec: true },
      ],
    },
  ],
  summarize: (ctx, a) => {
    const layer = lookup({
      wrb: 'WRB / housewrap', sheathing: 'wall sheathing',
      roof_sheath: 'roof sheathing', flashing: 'flashing',
      siding_prep: 'siding prep', fascia: 'fascia/soffit',
      window_flash: 'window flashing', membrane: 'self-adhered membrane',
    }, val(a, 'layer'), 'envelope');
    const ext = lookup({
      patch: '< 16 SF patch', small: '16–80 SF', med: '80–400 SF',
      large: '400+ SF', full: 'full elevation',
    }, val(a, 'extent'), '');
    const rot = val(a, 'condition') === 'rot'
      ? 'ROT FOUND — open and verify framing before closing back up.'
      : val(a, 'condition') === 'staining'
      ? 'Water staining noted — investigate substrate before proceeding.'
      : '';
    const tarp = val(a, 'exposure') === 'wet' ? 'Active weather — tarping required.' : '';
    return `${layer} work at ${loc(ctx)}, ${ext}. ${rot} ${tarp}`.replace(/\s+/g, ' ').trim();
  },
};

// ── New intent flow: structural_install ────────────────────────

const STRUCTURAL_FLOW: ScopeFlow = {
  title: 'What structural element?',
  sub: 'Beams, posts, hold-downs, shear walls — engineered components.',
  questions: [
    {
      id: 'member',
      text: 'What are you installing?',
      grid: 'cols-4',
      answers: [
        { id: 'beam_lvl',     label: 'LVL beam',           icon: '▭' },
        { id: 'beam_glulam',  label: 'Glulam',             icon: '▭', sub: 'engineered' },
        { id: 'beam_steel',   label: 'Steel beam',         icon: '═', spec: true },
        { id: 'post',         label: 'Post / column',      icon: '┃' },
        { id: 'header',       label: 'Header',             icon: '▭', sub: 'over opening' },
        { id: 'holddown',     label: 'Hold-down anchor',   icon: '⚓', sub: 'shear' },
        { id: 'shear_panel',  label: 'Shear wall',         icon: '▰', spec: true },
        { id: 'transfer',     label: 'Transfer beam',      icon: '═', spec: true, sub: 'PE drawing' },
      ],
    },
    {
      id: 'drawing',
      text: 'Do you have an engineered drawing?',
      hint: 'Sasha will flag inspection requirements based on your answer.',
      grid: 'cols-3',
      annotation: '<b>Most jurisdictions require</b> an engineered drawing (stamped) for any structural beam, transfer member, hold-down system, or shear wall added after the fact. This drives the inspection trip and the bill of material.',
      answers: [
        { id: 'have_pe',     label: 'Yes — stamped',       icon: '✎', spec: true },
        { id: 'pending',     label: 'PE engaged, drawing pending', icon: '⏱' },
        { id: 'unsure',      label: 'Not sure / GC handles', icon: '❓' },
      ],
    },
    {
      id: 'connection',
      text: 'Connection / hardware?',
      grid: 'cols-4',
      answers: [
        { id: 'simpson',     label: 'Simpson hangers',     icon: '⎇' },
        { id: 'bolts',       label: 'Through-bolts',       icon: '⊙' },
        { id: 'welded',      label: 'Welded',              icon: '⚡', spec: true },
        { id: 'epoxy',       label: 'Epoxy anchors',       icon: '◉' },
        { id: 'embedded',    label: 'Embedded in concrete', icon: '▬' },
        { id: 'tbd',         label: 'TBD — per drawing',   icon: '?' },
      ],
    },
    {
      id: 'inspection',
      text: 'Special inspection required?',
      hint: 'Welded / epoxied anchors and hold-downs almost always require continuous inspection.',
      grid: 'cols-3',
      answers: [
        { id: 'continuous',  label: 'Continuous',          icon: '👁', spec: true },
        { id: 'periodic',    label: 'Periodic',            icon: '◔' },
        { id: 'none',        label: 'None / standard frame', icon: '◯' },
      ],
    },
  ],
  summarize: (ctx, a) => {
    const member = lookup({
      beam_lvl: 'LVL beam', beam_glulam: 'glulam beam', beam_steel: 'steel beam',
      post: 'structural post', header: 'header', holddown: 'hold-down anchor',
      shear_panel: 'shear wall panel', transfer: 'transfer beam',
    }, val(a, 'member'), 'structural element');
    const conn = lookup({
      simpson: 'Simpson framing hardware', bolts: 'through-bolts',
      welded: 'welded connection', epoxy: 'epoxy anchors',
      embedded: 'embedded in concrete', tbd: 'connection per engineer',
    }, val(a, 'connection'), '');
    const drawing = val(a, 'drawing') === 'have_pe'
      ? 'Per stamped engineer drawing.'
      : val(a, 'drawing') === 'pending'
      ? 'Engineer drawing pending — hold work until received.'
      : 'Verify engineer drawing before installation.';
    const inspect = val(a, 'inspection') === 'continuous'
      ? 'Continuous special inspection required.'
      : val(a, 'inspection') === 'periodic'
      ? 'Periodic special inspection.'
      : '';
    return `Install ${member} at ${loc(ctx)} with ${conn}. ${drawing} ${inspect}`.replace(/\s+/g, ' ').trim();
  },
};

// ── New intent flow: mep_blocking ──────────────────────────────

const MEP_BLOCKING_FLOW: ScopeFlow = {
  title: 'Blocking / backing scope',
  sub: 'Wood blocking for fixtures, fasteners, or other trades.',
  questions: [
    {
      id: 'purpose',
      text: 'Blocking is for…?',
      grid: 'cols-4',
      answers: [
        { id: 'tv_mount',      label: 'TV mount',          icon: '📺' },
        { id: 'grab_bar',      label: 'Grab bar / ADA',    icon: '╪', spec: true },
        { id: 'cabinet',       label: 'Upper cabinets',    icon: '☐' },
        { id: 'handrail',      label: 'Handrail',          icon: '═' },
        { id: 'shelving',      label: 'Heavy shelving',    icon: '▤' },
        { id: 'fixture',       label: 'Plumbing fixture',  icon: '🚿' },
        { id: 'art',           label: 'Art / mirror',      icon: '🖼' },
        { id: 'other',         label: 'Other',             icon: '•' },
      ],
    },
    {
      id: 'count',
      text: 'How many locations?',
      grid: 'scale',
      answers: [
        { id: 'one',     label: '1',      sub: 'spot' },
        { id: 'few',     label: '2–4',    sub: 'spots' },
        { id: 'several', label: '5–10',   sub: 'spots' },
        { id: 'many',    label: '10+',    sub: 'whole-house' },
      ],
    },
    {
      id: 'material',
      text: 'Backing material?',
      hint: 'Most blocking is 2x dim lumber; commercial / ADA may need plywood plate.',
      grid: 'cols-4',
      answers: [
        { id: '2x',         label: '2x dim. lumber',     icon: '▮', sub: 'standard' },
        { id: 'ply',        label: 'Plywood plate',      icon: '▱', sub: 'ADA / heavy' },
        { id: 'osb',        label: 'OSB plate',          icon: '▱', sub: 'budget' },
        { id: 'metal',      label: 'Metal strap',        icon: '⎕', sub: 'spec' },
      ],
    },
    {
      id: 'coordination',
      text: 'Coordinated with another trade?',
      grid: 'cols-3',
      answers: [
        { id: 'standalone', label: 'No — standalone',    icon: '◯' },
        { id: 'with_trade', label: 'Yes — coordinate',   icon: '🤝' },
        { id: 'after',      label: 'After-the-fact open-up', icon: '✂' },
      ],
    },
  ],
  summarize: (ctx, a) => {
    const purpose = lookup({
      tv_mount: 'TV mount', grab_bar: 'ADA grab bar', cabinet: 'upper cabinets',
      handrail: 'handrail', shelving: 'heavy shelving', fixture: 'plumbing fixture',
      art: 'art/mirror', other: 'fixture',
    }, val(a, 'purpose'), 'fixture');
    const count = lookup({
      one: '1 spot', few: '2–4 spots', several: '5–10 spots', many: '10+ spots',
    }, val(a, 'count'), '');
    const material = lookup({
      '2x': '2x dimensional lumber', ply: 'plywood plate', osb: 'OSB plate', metal: 'metal strap',
    }, val(a, 'material'), '2x lumber');
    const coord = val(a, 'coordination') === 'after'
      ? 'After-the-fact — drywall open-up required.'
      : val(a, 'coordination') === 'with_trade'
      ? 'Coordinate with installing trade.'
      : '';
    const adaNote = val(a, 'purpose') === 'grab_bar'
      ? 'ADA — verify load capacity (≥250 lb pull) per ANSI A117.1.'
      : '';
    return `Install ${material} blocking for ${purpose} (${count}) at ${loc(ctx)}. ${coord} ${adaNote}`.replace(/\s+/g, ' ').trim();
  },
};

// ── New intent flow: inspection_fix ────────────────────────────

const INSPECTION_FIX_FLOW: ScopeFlow = {
  title: 'Inspector / punch-list fix',
  sub: 'Backout work — code correction, missing nail, inspector callback.',
  questions: [
    {
      id: 'authority',
      text: 'Who flagged it?',
      grid: 'cols-4',
      answers: [
        { id: 'building',   label: 'Building inspector', icon: '📋' },
        { id: 'engineer',   label: 'Engineer of record', icon: '✎' },
        { id: 'gc_punch',   label: 'GC punch list',      icon: '📝' },
        { id: 'owner',      label: 'Owner walkthrough',  icon: '👤' },
        { id: 'self',       label: 'We caught it',       icon: '👀' },
        { id: 'other',      label: 'Other',              icon: '•' },
      ],
    },
    {
      id: 'category',
      text: 'What was flagged?',
      grid: 'cols-4',
      answers: [
        { id: 'nailing',     label: 'Nailing / fastener',  icon: '◉' },
        { id: 'spacing',     label: 'Stud / joist spacing', icon: '||' },
        { id: 'hardware',    label: 'Missing hardware',    icon: '⎇', sub: 'ties/straps' },
        { id: 'firestop',    label: 'Firestop / firecaulk', icon: '🔥', spec: true },
        { id: 'notching',    label: 'Notching / boring',   icon: '◣' },
        { id: 'dimension',   label: 'Wrong dimension',     icon: '↔' },
        { id: 'header',      label: 'Header undersized',   icon: '▭' },
        { id: 'other',       label: 'Other',               icon: '•' },
      ],
    },
    {
      id: 'scale',
      text: 'How much area to correct?',
      grid: 'scale',
      answers: [
        { id: 'spot',     label: '1 spot',     sub: 'EA' },
        { id: 'few',      label: '2–5 spots',  sub: 'EA' },
        { id: 'many',     label: '5–20',       sub: 'EA' },
        { id: 'wall',     label: 'Full wall',  sub: 'LS' },
        { id: 'multi',    label: 'Multiple walls', sub: 'LS' },
      ],
    },
    {
      id: 'reinspect',
      text: 'Is re-inspection scheduled?',
      grid: 'cols-3',
      answers: [
        { id: 'scheduled', label: 'Yes — date set',  icon: '📅' },
        { id: 'pending',   label: 'Need to call',    icon: '📞' },
        { id: 'na',        label: 'N/A — internal',  icon: '◯' },
      ],
    },
  ],
  summarize: (ctx, a) => {
    const flagger = lookup({
      building: 'Building inspector', engineer: 'Engineer of record',
      gc_punch: 'GC punch list', owner: 'Owner walkthrough',
      self: 'Self-caught', other: 'Authority',
    }, val(a, 'authority'), 'Authority');
    const cat = lookup({
      nailing: 'nailing / fastener spec', spacing: 'stud or joist spacing',
      hardware: 'missing framing hardware', firestop: 'firestop / firecaulk',
      notching: 'notching / boring violation', dimension: 'wrong dimension',
      header: 'undersized header', other: 'item',
    }, val(a, 'category'), 'item');
    const scale = lookup({
      spot: '1 spot', few: '2–5 spots', many: '5–20 spots',
      wall: 'one full wall', multi: 'multiple walls',
    }, val(a, 'scale'), '');
    const reinspect = val(a, 'reinspect') === 'pending'
      ? 'Re-inspection: needs to be called in.'
      : val(a, 'reinspect') === 'scheduled'
      ? 'Re-inspection scheduled.'
      : '';
    return `${flagger} flagged ${cat} at ${loc(ctx)} (${scale}). ${reinspect}`.replace(/\s+/g, ' ').trim();
  },
};

// ── New intent flow: modify_existing ───────────────────────────

const MODIFY_EXISTING_FLOW: ScopeFlow = {
  title: "What's changing?",
  sub: 'Change something already built — move, enlarge, reduce.',
  questions: [
    {
      id: 'what',
      text: "What's there now that's changing?",
      grid: 'cols-4',
      answers: [
        { id: 'opening',     label: 'Window / door opening', icon: '🪟' },
        { id: 'wall',        label: 'Wall location',         icon: '▮' },
        { id: 'header',      label: 'Header span',           icon: '▭' },
        { id: 'soffit',      label: 'Soffit / bulkhead',     icon: '▤' },
        { id: 'partition',   label: 'Partition layout',      icon: '▱' },
        { id: 'stair',       label: 'Stair / opening',       icon: '⟍' },
        { id: 'beam',        label: 'Beam / post',           icon: '═', spec: true },
        { id: 'other',       label: 'Other',                 icon: '•' },
      ],
    },
    {
      id: 'change',
      text: 'What kind of change?',
      grid: 'cols-4',
      answers: [
        { id: 'enlarge',     label: 'Make bigger',     icon: '⤢' },
        { id: 'shrink',      label: 'Make smaller',    icon: '⤡' },
        { id: 'relocate',    label: 'Move it',         icon: '↔' },
        { id: 'add_open',    label: 'Add an opening',  icon: '🪟' },
        { id: 'fill_open',   label: 'Fill an opening', icon: '◼' },
        { id: 'other',       label: 'Other',           icon: '•' },
      ],
    },
    {
      id: 'load',
      text: 'Does the change touch a load path?',
      hint: 'Bearing walls, headers, beams — anything carrying load from above.',
      grid: 'cols-3',
      annotation: '<b>If yes:</b> any modification to a bearing element typically requires temporary shoring during the change and an engineer review per IRC R301.1.3.',
      answers: [
        { id: 'no',     label: 'No — non-bearing only', icon: '◯' },
        { id: 'yes',    label: 'Yes — bearing/header',  icon: '⬛', spec: true },
        { id: 'unsure', label: 'Not sure',              icon: '❓' },
      ],
    },
    {
      id: 'source',
      text: 'Where does the change come from?',
      grid: 'cols-3',
      answers: [
        { id: 'rfi',          label: 'Approved RFI',         icon: '✎' },
        { id: 'plan_revision',label: 'Plan revision',         icon: '📐' },
        { id: 'field',        label: 'Field decision',        icon: '👷' },
      ],
    },
  ],
  summarize: (ctx, a) => {
    const what = lookup({
      opening: 'window/door opening', wall: 'wall', header: 'header',
      soffit: 'soffit/bulkhead', partition: 'partition layout',
      stair: 'stair opening', beam: 'beam/post', other: 'existing element',
    }, val(a, 'what'), 'existing element');
    const change = lookup({
      enlarge: 'enlarge', shrink: 'reduce', relocate: 'relocate',
      add_open: 'add an opening in', fill_open: 'fill an existing opening in',
      other: 'modify',
    }, val(a, 'change'), 'modify');
    const load = val(a, 'load') === 'yes'
      ? 'BEARING — temporary shoring + engineer sign-off required.'
      : val(a, 'load') === 'no'
      ? 'Non-bearing — no engineer needed.'
      : '';
    const source = val(a, 'source') === 'rfi' ? 'Per approved RFI.'
                 : val(a, 'source') === 'plan_revision' ? 'Per plan revision.'
                 : val(a, 'source') === 'field' ? 'Field decision — confirm with GC.'
                 : '';
    return `${change} the ${what} at ${loc(ctx)}. ${load} ${source}`.replace(/\s+/g, ' ').trim();
  },
};

// ── Intent flow: other (free-text fallback marker) ────────────

const OTHER_FLOW: ScopeFlow = {
  title: "Tell us what's needed",
  sub: 'Free-text — Sasha will read your description and find catalog items.',
  questions: [],  // Empty — UI will skip QA and route to type fallback
  summarize: () => '',
};

// ── Master lookup ──────────────────────────────────────────────

/**
 * Returns the question flow for a given intent + building type.
 * Building type is passed so the existing damage/addition/rework flows
 * (which have building-type variants) can still be served correctly.
 */
export function getIntentFlow(
  intent: WorkIntent,
  buildingType: BuildingType
): ScopeFlow {
  const safeBuildingType = (FLOWS[buildingType] ? buildingType : 'custom_home') as BuildingType;

  switch (intent) {
    // Reuse existing rich, building-type-aware trees
    case 'repair_damage':
      return FLOWS[safeBuildingType]?.damage ?? FLOWS.custom_home.damage;
    case 'add_new':
      return FLOWS[safeBuildingType]?.addition ?? FLOWS.custom_home.addition;
    case 'redo_work':
      return FLOWS[safeBuildingType]?.rework ?? FLOWS.custom_home.rework;

    // New intent-specific trees (building-type agnostic for v1)
    case 'tear_out':           return TEAR_OUT_FLOW;
    case 'envelope_work':      return ENVELOPE_FLOW;
    case 'structural_install': return STRUCTURAL_FLOW;
    case 'mep_blocking':       return MEP_BLOCKING_FLOW;
    case 'inspection_fix':     return INSPECTION_FIX_FLOW;
    case 'modify_existing':    return MODIFY_EXISTING_FLOW;
    case 'other':              return OTHER_FLOW;

    default:
      return FLOWS.custom_home.addition;
  }
}

/**
 * Back-compat: derive a WorkIntent from legacy (reason, workType) pair
 * for any draft / inbound CO that was created before the intent picker
 * existed.
 */
export function resolveIntentFromLegacy(
  reason: string | null,
  workType: string | null
): WorkIntent {
  // Work type is the strongest signal when the user explicitly picked one
  if (workType === 'demolition' || workType === 'demo') return 'tear_out';
  if (workType === 'wrb' || workType === 'exterior' || workType === 'sheathing') return 'envelope_work';
  if (workType === 'structural') return 'structural_install';
  if (workType === 'blocking') return 'mep_blocking';
  if (workType === 'backout') return 'inspection_fix';
  if (workType === 'reframing') return 'modify_existing';

  // Fall back to reason
  if (reason === 'damaged_by_others') return 'repair_damage';
  if (reason === 'rework') return 'redo_work';
  if (reason === 'design_change') return 'modify_existing';
  if (reason === 'addition' || reason === 'owner_request' || reason === 'gc_request') return 'add_new';
  if (reason === 'other') return 'other';

  return 'add_new';
}

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

import type { ScopeFlow, BuildingType, FlowContext } from '@/types/scopeQA';

/** Internal routing type — not user-facing. Derived from reason + workType via resolveIntentFromLegacy. */
export type WorkIntent =
  | 'repair_damage'
  | 'add_new'
  | 'modify_existing'
  | 'redo_work'
  | 'tear_out'
  | 'envelope_work'
  | 'structural_install'
  | 'mep_blocking'
  | 'inspection_fix'
  | 'other';

const WORK_INTENT_LABELS: Record<WorkIntent, string> = {
  repair_damage:      'Fix damage',
  add_new:            'Add new',
  modify_existing:    'Modify existing',
  redo_work:          'Redo work',
  tear_out:           'Tear out / demo',
  envelope_work:      'Envelope / WRB',
  structural_install: 'Structural install',
  mep_blocking:       'Blocking / backing',
  inspection_fix:     'Inspector / punch fix',
  other:              'Other',
};
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
//
// Zone-aware: the first question ("what are we removing?") branches on
// ctx.zone so a Roof tear-out shows roof components, an Exterior wall
// tear-out shows siding/WRB/sheathing, etc. Without this, the picker
// previously showed Cabinets/Flooring/Fixtures regardless of location.

type TearOutZoneKey = 'roof' | 'exterior_wall' | 'site' | 'interior';

function tearOutZoneKey(ctx: FlowContext): TearOutZoneKey {
  const z = ctx.zone;
  if (z === 'roof') return 'roof';
  if (z === 'exterior_wall' || z === 'envelope_opening') return 'exterior_wall';
  if (z === 'foundation' || z === 'basement') return 'site';
  // Belt-and-suspenders: if zone is 'structural' (or anything else),
  // inspect the location tag itself so a roof-truss demo still gets the
  // roof option set rather than falling through to interior.
  if (z !== 'interior_wall' && z !== 'interior_floor' && z !== 'interior_ceiling' && z !== 'stairs') {
    const tag = (ctx.locationTag ?? '').toLowerCase();
    const isExterior = tag.startsWith('exterior') || /\bexterior\b/.test(tag);
    if (isExterior) {
      if (/(roof|valley|ridge|eave|gable|rake|fascia|soffit|truss|rafter)/.test(tag)) return 'roof';
      if (/(slab|footing|grade|hardscape|paver)/.test(tag)) return 'site';
      return 'exterior_wall';
    }
  }
  return 'interior';
}

const TEAR_OUT_ANSWERS: Record<TearOutZoneKey, { id: string; label: string; icon?: string; sub?: string; spec?: boolean }[]> = {
  roof: [
    { id: 'roof_sheath',   label: 'Roof sheathing / decking', icon: '⟍' },
    { id: 'underlayment',  label: 'Underlayment / felt',      icon: '▤' },
    { id: 'roof_cover',    label: 'Shingles / membrane',      icon: '▦' },
    { id: 'fascia',        label: 'Fascia / sub-fascia',      icon: '═' },
    { id: 'soffit',        label: 'Soffit material',          icon: '▤' },
    { id: 'rafter_truss',  label: 'Rafter / truss',           icon: '╱', spec: true, sub: 'PE may be needed' },
    { id: 'ridge_cap',     label: 'Ridge cap / vent',         icon: '▲' },
    { id: 'other',         label: 'Other',                    icon: '•' },
  ],
  exterior_wall: [
    { id: 'siding',        label: 'Siding',                   icon: '┃' },
    { id: 'wrb',           label: 'WRB / housewrap',          icon: '🛡️' },
    { id: 'wall_sheath',   label: 'Wall sheathing',           icon: '▦' },
    { id: 'window_door',   label: 'Window / door (R.O.)',     icon: '🪟' },
    { id: 'trim',          label: 'Trim / casing',            icon: '─' },
    { id: 'flashing',      label: 'Flashing',                 icon: '〰' },
    { id: 'wall_stud',     label: 'Wall stud',                icon: '┃', spec: true, sub: 'PE if bearing' },
    { id: 'other',         label: 'Other',                    icon: '•' },
  ],
  site: [
    { id: 'slab',          label: 'Concrete slab section',    icon: '▬' },
    { id: 'footing',       label: 'Footing',                  icon: '▭', spec: true },
    { id: 'hardscape',     label: 'Hardscape / pavers',       icon: '▦' },
    { id: 'grading',       label: 'Grading / soil',           icon: '◢' },
    { id: 'other',         label: 'Other',                    icon: '•' },
  ],
  interior: [
    { id: 'wall_partition', label: 'Partition wall',  icon: '▮' },
    { id: 'wall_bearing',   label: 'Bearing wall',    icon: '⬛', spec: true, sub: 'PE may be needed' },
    { id: 'soffit',         label: 'Soffit / bulkhead', icon: '▤' },
    { id: 'cabinet',        label: 'Cabinets',        icon: '☐' },
    { id: 'flooring',       label: 'Flooring',        icon: '═' },
    { id: 'fixture',        label: 'Fixtures',        icon: '🚿' },
    { id: 'ceiling',        label: 'Ceiling',         icon: '─' },
    { id: 'other',          label: 'Other',           icon: '•' },
  ],
};

const TEAR_OUT_QUESTION_TEXT: Record<TearOutZoneKey, string> = {
  roof: 'What roof component are you removing?',
  exterior_wall: 'What exterior component are you removing?',
  site: 'What site element are you removing?',
  interior: 'What are you tearing out?',
};

const TEAR_OUT_LABEL_MAP: Record<string, string> = {
  // roof
  roof_sheath: 'roof sheathing/decking', underlayment: 'roof underlayment',
  roof_cover: 'roof covering', fascia: 'fascia/sub-fascia', soffit: 'soffit',
  rafter_truss: 'rafter/truss', ridge_cap: 'ridge cap/vent',
  // exterior wall
  siding: 'siding', wrb: 'WRB/housewrap', wall_sheath: 'wall sheathing',
  window_door: 'window/door rough opening', trim: 'trim/casing',
  flashing: 'flashing', wall_stud: 'wall stud',
  // site
  slab: 'concrete slab', footing: 'footing', hardscape: 'hardscape',
  grading: 'grading/soil',
  // interior (existing)
  wall_partition: 'partition wall', wall_bearing: 'bearing wall',
  cabinet: 'cabinets', flooring: 'flooring', fixture: 'fixtures',
  ceiling: 'ceiling',
  // shared
  other: 'existing work',
};

const TEAR_OUT_FLOW: ScopeFlow = {
  title: 'What needs to come out?',
  sub: 'Demolition / removal scope.',
  questions: [
    {
      id: 'what',
      text: 'What are you tearing out?',
      grid: 'cols-4',
      // Static fallback list (used only if ctx is missing). The
      // renderer prefers `answersFor`/`textFor` when present.
      answers: TEAR_OUT_ANSWERS.interior,
      textFor: (ctx) => TEAR_OUT_QUESTION_TEXT[tearOutZoneKey(ctx)],
      answersFor: (ctx) => TEAR_OUT_ANSWERS[tearOutZoneKey(ctx)],
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
      // Disposal logistics matter most for interior renovation and site
      // (concrete) demos. For roof and exterior-wall tear-offs, debris
      // handling is implicit in the price; skip the question.
      showFor: (ctx) => {
        const k = tearOutZoneKey(ctx);
        return k === 'interior' || k === 'site';
      },
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
      // Dust containment is an interior-only concern.
      showFor: (ctx) => tearOutZoneKey(ctx) === 'interior',
      answers: [
        { id: 'none',       label: 'None',                 icon: '◯' },
        { id: 'plastic',    label: 'Poly + zip walls',     icon: '┃' },
        { id: 'occupied',   label: 'Occupied — full negative-air', icon: '🌬️', spec: true },
      ],
    },
  ],
  summarize: (ctx, a) => {
    const whatId = val(a, 'what');
    const what = lookup(TEAR_OUT_LABEL_MAP, whatId, 'existing work');
    const extent = lookup({
      spot: 'a spot of', small: 'a small section of', medium: 'a medium area of',
      large: 'a large area of', full: 'the full extent of',
    }, val(a, 'extent'), '');
    const disposal = val(a, 'disposal') === 'us_haul' ? 'We haul debris.' :
                     val(a, 'disposal') === 'gc_dump' ? 'GC dumpster on site.' : '';
    const protect = val(a, 'protection') === 'occupied' ? 'Occupied — full dust containment required.' :
                    val(a, 'protection') === 'plastic' ? 'Poly sheeting and zip walls.' : '';
    const bearingNote = whatId === 'wall_bearing'
      ? 'BEARING wall — temporary shoring required, engineer review per IRC R301.1.3.'
      : whatId === 'rafter_truss'
      ? 'Structural roof member — temporary shoring + engineer review required.'
      : whatId === 'wall_stud' && tearOutZoneKey(ctx) === 'exterior_wall'
      ? 'Verify bearing condition before removal; shore if loaded.'
      : whatId === 'footing'
      ? 'Footing removal — confirm load path / underpinning plan.'
      : '';
    return `Demo ${extent} ${what} at the ${loc(ctx)}. ${bearingNote} ${disposal} ${protect}`.replace(/\s+/g, ' ').trim();
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

// ── Component → first-question pre-seed mapping ────────────────
//
// When the user picks a building component in Step 2 (the location picker),
// we don't want Step 3 to ask them again. This table maps component-name
// keywords (matched against the trailing segment of the locationTag) to the
// answer id of the FIRST question in the relevant intent flow.
//
// Keys are tested in order; first match wins. Keep keys lowercase and use
// distinctive substrings so generic words don't collide ("wall" alone is
// too broad — use "wall sheathing" / "wall stud" instead).
//
// `flowQuestionId` is the question whose answer is being pre-seeded.
// For envelope_work that's "layer"; for damage/addition/rework that's
// "member"; for structural_install it's "member".

interface ComponentMapEntry {
  /** Lowercase substring tested against the trailing component of locationTag */
  match: RegExp;
  /** Which intent's flow this seeds — used to also reconcile mismatched intents */
  intent: WorkIntent;
  /** Question id within that flow that is being answered */
  flowQuestionId: string;
  /** Answer id within that question */
  answerId: string;
}

const COMPONENT_MAP: ComponentMapEntry[] = [
  // ── Envelope layers
  { match: /\bwrb\b|housewrap|house\s*wrap|weather\s*resistive/i, intent: 'envelope_work', flowQuestionId: 'layer', answerId: 'wrb' },
  { match: /roof\s*sheath/i,                                       intent: 'envelope_work', flowQuestionId: 'layer', answerId: 'roof_sheath' },
  { match: /wall\s*sheath|exterior\s*sheath/i,                     intent: 'envelope_work', flowQuestionId: 'layer', answerId: 'sheathing' },
  { match: /window\s*flash/i,                                      intent: 'envelope_work', flowQuestionId: 'layer', answerId: 'window_flash' },
  { match: /\bflashing\b/i,                                        intent: 'envelope_work', flowQuestionId: 'layer', answerId: 'flashing' },
  { match: /siding\s*prep/i,                                       intent: 'envelope_work', flowQuestionId: 'layer', answerId: 'siding_prep' },
  { match: /fascia|sub-?fascia|soffit/i,                           intent: 'envelope_work', flowQuestionId: 'layer', answerId: 'fascia' },
  { match: /self-?adher|peel.*stick|membrane/i,                    intent: 'envelope_work', flowQuestionId: 'layer', answerId: 'membrane' },

  // ── Structural install
  { match: /lvl\s*beam/i,           intent: 'structural_install', flowQuestionId: 'member', answerId: 'beam_lvl' },
  { match: /glulam/i,               intent: 'structural_install', flowQuestionId: 'member', answerId: 'beam_glulam' },
  { match: /steel\s*beam/i,         intent: 'structural_install', flowQuestionId: 'member', answerId: 'beam_steel' },
  { match: /shear\s*(wall|panel)/i, intent: 'structural_install', flowQuestionId: 'member', answerId: 'shear_panel' },
  { match: /hold-?down|holddown/i,  intent: 'structural_install', flowQuestionId: 'member', answerId: 'holddown' },
  { match: /transfer\s*beam/i,      intent: 'structural_install', flowQuestionId: 'member', answerId: 'transfer' },

  // ── Framing members (damage / add_new / redo / modify share `member` first-q)
  // These use repair_damage as the canonical intent for resolution; the
  // pre-seed will still land on the correct first question in any of the
  // member-based flows because they share the same answer ids.
  { match: /floor\s*joist|i-?joist|tji/i,    intent: 'repair_damage', flowQuestionId: 'member', answerId: 'floor_joist' },
  { match: /ceiling\s*joist/i,               intent: 'repair_damage', flowQuestionId: 'member', answerId: 'ceiling_joist' },
  { match: /\brafter\b/i,                    intent: 'repair_damage', flowQuestionId: 'member', answerId: 'rafter' },
  { match: /roof\s*truss|\btruss\b/i,        intent: 'repair_damage', flowQuestionId: 'member', answerId: 'roof_truss' },
  { match: /ridge\s*beam/i,                  intent: 'repair_damage', flowQuestionId: 'member', answerId: 'ridge_beam' },
  { match: /header|\blvl\b/i,                intent: 'repair_damage', flowQuestionId: 'member', answerId: 'header_lvl' },
  { match: /sill\s*plate/i,                  intent: 'repair_damage', flowQuestionId: 'member', answerId: 'sill_plate' },
  { match: /top\s*plate/i,                   intent: 'repair_damage', flowQuestionId: 'member', answerId: 'top_plate' },
  { match: /bottom\s*plate/i,                intent: 'repair_damage', flowQuestionId: 'member', answerId: 'bottom_plate' },
  { match: /rim\s*(joist|board)|band\s*joist/i, intent: 'repair_damage', flowQuestionId: 'member', answerId: 'rim_band' },
  { match: /stair\s*stringer|\bstringer\b/i, intent: 'repair_damage', flowQuestionId: 'member', answerId: 'stringer' },
  { match: /king|jack\s*stud/i,              intent: 'repair_damage', flowQuestionId: 'member', answerId: 'king_jack' },
  // "stud" must come AFTER king/jack and after sheathing checks
  { match: /wall\s*stud|2x\s*stud|\bstud\b/i, intent: 'repair_damage', flowQuestionId: 'member', answerId: '2x_stud' },
  // generic sheathing panel (after roof/wall variants)
  { match: /sheathing\s*panel|\bsheathing\b/i, intent: 'repair_damage', flowQuestionId: 'member', answerId: 'sheathing_panel' },
  { match: /\bblocking\b/i,                  intent: 'repair_damage', flowQuestionId: 'member', answerId: 'blocking' },
  { match: /subfloor/i,                      intent: 'repair_damage', flowQuestionId: 'member', answerId: 'subfloor' },
  { match: /\bbeam\b/i,                      intent: 'repair_damage', flowQuestionId: 'member', answerId: 'beam' },
  { match: /\bcolumn\b|\bpost\b/i,           intent: 'repair_damage', flowQuestionId: 'member', answerId: 'column' },
];

/** Extract the trailing component of a locationTag (the part after the last "·"). */
function trailingComponent(locationTag: string | null | undefined): string {
  if (!locationTag) return '';
  const parts = locationTag.split('·').map((s) => s.trim()).filter(Boolean);
  // Skip elevation-only suffix (e.g. "East elevation") so "Wall · East elevation"
  // still resolves to "Wall" instead of the elevation.
  for (let i = parts.length - 1; i >= 0; i--) {
    if (!/elevation|^l\d+$|level\s*\d+/i.test(parts[i])) return parts[i];
  }
  return parts[parts.length - 1] ?? '';
}

export interface ComponentResolution {
  /** The intent the component naturally belongs to */
  expectedIntent: WorkIntent;
  /** Question id within the resolved flow that is being pre-answered */
  flowQuestionId: string;
  /** Answer id pre-seeded for that question */
  answerId: string;
  /** The matched component string, for display in the soft note */
  componentLabel: string;
}

/**
 * Tear-out variant of the component map. Same trailing-component matching
 * but routes into TEAR_OUT_FLOW's first question (`what`) so Step 3 can
 * skip the "what are you removing?" question when Step 2 already implied it.
 *
 * Answer ids must match the ids in TEAR_OUT_ANSWERS for the relevant zone.
 */
const TEAR_OUT_COMPONENT_MAP: Omit<ComponentMapEntry, 'intent' | 'flowQuestionId'>[] = [
  // Roof zone
  { match: /roof\s*sheath|roof\s*deck/i,                   answerId: 'roof_sheath' },
  { match: /underlayment|roof\s*felt|\bfelt\b/i,           answerId: 'underlayment' },
  { match: /shingle|roof\s*membrane|tpo|epdm|tile\s*roof/i, answerId: 'roof_cover' },
  { match: /ridge\s*cap|ridge\s*vent/i,                    answerId: 'ridge_cap' },
  { match: /rafter|roof\s*truss|\btruss\b/i,               answerId: 'rafter_truss' },
  // Exterior wall zone
  { match: /\bsiding\b/i,                                  answerId: 'siding' },
  { match: /\bwrb\b|housewrap|house\s*wrap|weather\s*resistive/i, answerId: 'wrb' },
  { match: /wall\s*sheath|exterior\s*sheath/i,             answerId: 'wall_sheath' },
  { match: /window|exterior\s*door|skylight|rough\s*opening/i, answerId: 'window_door' },
  { match: /\btrim\b|casing/i,                             answerId: 'trim' },
  { match: /\bflashing\b/i,                                answerId: 'flashing' },
  { match: /wall\s*stud|\bstud\b/i,                        answerId: 'wall_stud' },
  // Shared between roof and exterior
  { match: /fascia|sub-?fascia/i,                          answerId: 'fascia' },
  { match: /\bsoffit\b/i,                                  answerId: 'soffit' },
  // Site / foundation
  { match: /\bslab\b/i,                                    answerId: 'slab' },
  { match: /footing/i,                                     answerId: 'footing' },
  { match: /hardscape|paver/i,                             answerId: 'hardscape' },
  { match: /grading|topsoil|\bsoil\b/i,                    answerId: 'grading' },
  // Interior
  { match: /partition/i,                                   answerId: 'wall_partition' },
  { match: /bearing\s*wall/i,                              answerId: 'wall_bearing' },
  { match: /cabinet/i,                                     answerId: 'cabinet' },
  { match: /flooring|hardwood|tile\s*floor|carpet/i,       answerId: 'flooring' },
  { match: /ceiling/i,                                     answerId: 'ceiling' },
  { match: /fixture|toilet|sink|tub|shower/i,              answerId: 'fixture' },
];

/**
 * Inspect a locationTag and figure out (a) which intent flow naturally fits
 * the building component the user picked, and (b) which first-question answer
 * should be pre-seeded so Step 3 doesn't ask them again.
 *
 * Pass `pickedIntent` to bias resolution toward the user's intent — e.g. when
 * they picked `tear_out`, return a tear-out seed (so the demo flow's first
 * question gets pre-answered) instead of the default envelope/framing seed.
 *
 * Returns null when no component match is found — Step 3 then runs as before.
 */
export function resolveComponent(
  locationTag: string | null | undefined,
  pickedIntent?: WorkIntent | null
): ComponentResolution | null {
  const trailing = trailingComponent(locationTag);
  if (!trailing) return null;

  // Tear-out lookup wins when the user explicitly picked tear_out.
  if (pickedIntent === 'tear_out') {
    for (const entry of TEAR_OUT_COMPONENT_MAP) {
      if (entry.match.test(trailing)) {
        return {
          expectedIntent: 'tear_out',
          flowQuestionId: 'what',
          answerId: entry.answerId,
          componentLabel: trailing,
        };
      }
    }
    // Fall through to default map only if nothing matched in tear-out map.
  }

  for (const entry of COMPONENT_MAP) {
    if (entry.match.test(trailing)) {
      return {
        expectedIntent: entry.intent,
        flowQuestionId: entry.flowQuestionId,
        answerId: entry.answerId,
        componentLabel: trailing,
      };
    }
  }
  return null;
}

/**
 * Soft-reconciliation helper: returns an alternate intent only when the
 * picked intent is in a *different family* from the component. We don't
 * force a switch between damage/add_new/redo/modify since they share the
 * same first-question (member) — but we DO switch between framing-family
 * intents and envelope_work / structural_install, since those have
 * entirely different question trees.
 *
 * `tear_out` is intentionally NEVER swapped: demo of a roof, WRB, or
 * sheathing is genuinely demolition (not envelope install work), and
 * TEAR_OUT_FLOW is now zone-aware so it shows the right options.
 */
export function suggestIntentForComponent(
  pickedIntent: WorkIntent | null | undefined,
  resolution: ComponentResolution | null
): WorkIntent | null {
  if (!resolution || !pickedIntent) return null;
  const { expectedIntent } = resolution;

  // Same intent — no swap needed.
  if (pickedIntent === expectedIntent) return null;

  // Tear-out is its own intent regardless of which envelope/framing
  // component the user picked. The zone-aware TEAR_OUT_FLOW handles it.
  if (pickedIntent === 'tear_out') return null;

  // Member-based framing intents are interchangeable for question routing.
  const FRAMING_FAMILY: WorkIntent[] = ['repair_damage', 'add_new', 'redo_work', 'modify_existing'];
  if (FRAMING_FAMILY.includes(pickedIntent) && FRAMING_FAMILY.includes(expectedIntent)) {
    return null;
  }

  return expectedIntent;
}


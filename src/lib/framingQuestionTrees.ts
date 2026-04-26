import type { ScopeFlow, BuildingType, FlowScenario, ScopeAnswer, FlowContext } from '@/types/scopeQA';
import type { Zone } from '@/types/catalog';

// ── Zone-aware answer lists ───────────────────────────────────
// These let a single "what member?" question render a list that matches
// the location the user already picked, instead of dumping every framing
// member in every situation.

const MEMBERS_BY_ZONE: Partial<Record<Zone, ScopeAnswer[]>> & { default: ScopeAnswer[] } = {
  roof: [
    { id: 'sheathing_panel', label: 'Sheathing panel', icon: '▦', sub: 'OSB / ply' },
    { id: 'rafter',          label: 'Rafter',          icon: '⟋', sub: 'sloped' },
    { id: 'roof_truss',      label: 'Roof truss',      icon: '△', sub: 'engineered' },
    { id: 'ridge_beam',      label: 'Ridge beam',      icon: '▭' },
    { id: 'ceiling_joist',   label: 'Ceiling joist',   icon: '─', sub: 'attic / flat' },
    { id: 'fascia',          label: 'Fascia / sub-fascia', icon: '━' },
    { id: 'valley',          label: 'Valley framing',  icon: '⌵' },
    { id: 'collar_tie',      label: 'Collar tie',      icon: '─' },
  ],
  interior_wall: [
    { id: '2x_stud',     label: '2x wall stud',  icon: '▮', sub: '2x4 / 2x6' },
    { id: 'header_lvl',  label: 'Header / LVL',  icon: '▭', sub: 'over opening' },
    { id: 'top_plate',   label: 'Top plate',     icon: '═' },
    { id: 'bottom_plate',label: 'Bottom plate',  icon: '═' },
    { id: 'blocking',    label: 'Blocking',      icon: '▪' },
    { id: 'king_jack',   label: 'King / jack stud', icon: '▮', sub: 'at opening' },
  ],
  exterior_wall: [
    { id: '2x_stud',         label: '2x wall stud',     icon: '▮', sub: '2x4 / 2x6' },
    { id: 'sheathing_panel', label: 'Sheathing panel',  icon: '▦', sub: 'OSB / ply' },
    { id: 'header_lvl',      label: 'Header / LVL',     icon: '▭' },
    { id: 'sill_plate',      label: 'Sill plate',       icon: '═', sub: 'PT' },
    { id: 'top_plate',       label: 'Top plate',        icon: '═' },
    { id: 'rim_band',        label: 'Rim / band joist', icon: '┃' },
    { id: 'king_jack',       label: 'King / jack stud', icon: '▮' },
  ],
  interior_floor: [
    { id: 'floor_joist',  label: '2x floor joist', icon: '═', sub: 'dimensional' },
    { id: 'i_joist',      label: 'I-joist (TJI)',  icon: 'I', sub: 'engineered' },
    { id: 'rim_band',     label: 'Rim / band joist', icon: '┃' },
    { id: 'subfloor',     label: 'Subfloor panel', icon: '▦', sub: 'OSB / ply' },
    { id: 'floor_beam',   label: 'Floor beam / LVL', icon: '▭' },
    { id: 'blocking',     label: 'Blocking',       icon: '▪' },
  ],
  interior_ceiling: [
    { id: 'ceiling_joist',label: 'Ceiling joist',   icon: '─' },
    { id: 'i_joist',      label: 'I-joist (TJI)',   icon: 'I' },
    { id: 'header_lvl',   label: 'Header / LVL',    icon: '▭' },
    { id: 'blocking',     label: 'Blocking',        icon: '▪' },
  ],
  envelope_opening: [
    { id: 'header_lvl',  label: 'Header / LVL',     icon: '▭', sub: 'over opening' },
    { id: 'king_jack',   label: 'King / jack stud', icon: '▮' },
    { id: 'sill',        label: 'Rough sill',       icon: '═' },
    { id: 'cripple',     label: 'Cripple stud',     icon: '▮', sub: 'short' },
    { id: 'sheathing_panel', label: 'Sheathing at opening', icon: '▦' },
  ],
  stairs: [
    { id: 'stringer',  label: 'Stair stringer', icon: '⟍' },
    { id: 'tread',     label: 'Tread',          icon: '═' },
    { id: 'riser',     label: 'Riser',          icon: '┃' },
    { id: 'landing',   label: 'Landing framing',icon: '▦' },
    { id: 'header_lvl',label: 'Header at stair',icon: '▭' },
  ],
  structural: [
    { id: 'beam',       label: 'Beam (LVL/PSL/steel)', icon: '▭', sub: 'engineered' },
    { id: 'column',     label: 'Column / post',        icon: '┃' },
    { id: 'shear_panel',label: 'Shear panel',          icon: '▦', sub: 'rated' },
    { id: 'hold_down',  label: 'Hold-down / strap',    icon: '⊥' },
    { id: 'header_lvl', label: 'Header / LVL',         icon: '▭' },
    { id: 'rim_band',   label: 'Rim / band joist',     icon: '┃' },
  ],
  basement: [
    { id: 'floor_joist', label: 'Floor joist (above)', icon: '═' },
    { id: 'i_joist',     label: 'I-joist (TJI)',       icon: 'I' },
    { id: 'beam',        label: 'Beam',                icon: '▭' },
    { id: 'column',      label: 'Column / post',       icon: '┃' },
    { id: 'sill_plate',  label: 'Sill plate',          icon: '═', sub: 'PT' },
    { id: 'rim_band',    label: 'Rim / band joist',    icon: '┃' },
  ],
  foundation: [
    { id: 'sill_plate', label: 'Sill plate',     icon: '═', sub: 'PT' },
    { id: 'rim_band',   label: 'Rim / band joist', icon: '┃' },
    { id: 'anchor',     label: 'Anchor bolt / strap', icon: '⊥' },
    { id: 'beam',       label: 'Foundation beam', icon: '▭' },
  ],
  deck: [
    { id: 'deck_joist',  label: 'Deck joist',      icon: '═', sub: 'PT' },
    { id: 'deck_beam',   label: 'Deck beam',       icon: '▭' },
    { id: 'deck_post',   label: 'Deck post',       icon: '┃' },
    { id: 'ledger',      label: 'Ledger board',    icon: '━', sub: 'at house' },
    { id: 'rail_post',   label: 'Rail post',       icon: '┃' },
  ],
  default: [
    { id: '2x_stud',       label: '2x wall stud',    icon: '▮', sub: '2x4 or 2x6' },
    { id: 'floor_joist',   label: 'Floor joist',     icon: '═', sub: 'dimensional' },
    { id: 'i_joist',       label: 'I-joist (TJI)',   icon: 'I', sub: 'engineered' },
    { id: 'ceiling_joist', label: 'Ceiling joist',   icon: '─', sub: 'attic / flat' },
    { id: 'rafter',        label: 'Rafter',          icon: '⟋', sub: 'sloped roof' },
    { id: 'roof_truss',    label: 'Roof truss',      icon: '△', sub: 'engineered' },
    { id: 'header_lvl',    label: 'Header / LVL',    icon: '▭', sub: 'over opening' },
    { id: 'stringer',      label: 'Stair stringer',  icon: '⟍' },
  ],
};

const ACTIONS_BY_ZONE: Record<'roof' | 'sheet_goods' | 'default', ScopeAnswer[]> = {
  roof: [
    { id: 'punctured',     label: 'Punctured / torn',    icon: '🕳' },
    { id: 'cut_for_pen',   label: 'Cut for penetration', icon: '✂', sub: 'vent / pipe' },
    { id: 'broken_split',  label: 'Broken / cracked',    icon: '💥' },
    { id: 'wind_damage',   label: 'Blown off / wind',    icon: '🌬' },
    { id: 'water_damage',  label: 'Water-damaged',       icon: '💧' },
    { id: 'fastener_pullout', label: 'Fasteners pulled', icon: '◉' },
    { id: 'damaged_end',   label: 'Damaged at edge',     icon: '◀' },
    { id: 'unsure',        label: 'Not sure',            icon: '❓' },
  ],
  sheet_goods: [
    { id: 'punctured',    label: 'Punctured',         icon: '🕳' },
    { id: 'cut_for_pen',  label: 'Cut for penetration', icon: '✂' },
    { id: 'broken_split', label: 'Broken / cracked',  icon: '💥' },
    { id: 'water_damage', label: 'Water-damaged',     icon: '💧' },
    { id: 'damaged_end',  label: 'Damaged at edge',   icon: '◀' },
    { id: 'unsure',       label: 'Not sure',          icon: '❓' },
  ],
  default: [
    { id: 'cut_through',      label: 'Cut through',         icon: '✂' },
    { id: 'notched_deep',     label: 'Notched too deep',    icon: '◣', sub: '> IRC limit' },
    { id: 'drilled_oversize', label: 'Drilled oversized',   icon: '🕳', sub: '> 1/3 depth' },
    { id: 'hole_near_end',    label: 'Hole near bearing',   icon: '◉', sub: '< 2" to end' },
    { id: 'broken_split',     label: 'Broken / split',      icon: '💥' },
    { id: 'damaged_end',      label: 'Damaged end bearing', icon: '◀' },
    { id: 'cut_out',          label: 'Cut out entirely',    icon: '✕' },
    { id: 'unsure',           label: 'Not sure',            icon: '❓' },
  ],
};

export function membersForZone(ctx: FlowContext): ScopeAnswer[] {
  if (!ctx.zone) return MEMBERS_BY_ZONE.default;
  return MEMBERS_BY_ZONE[ctx.zone] ?? MEMBERS_BY_ZONE.default;
}

export function actionsForZone(ctx: FlowContext): ScopeAnswer[] {
  if (ctx.zone === 'roof') return ACTIONS_BY_ZONE.roof;
  const tag = (ctx.locationTag || '').toLowerCase();
  if (/(sheathing|subfloor|deck panel)/.test(tag)) return ACTIONS_BY_ZONE.sheet_goods;
  return ACTIONS_BY_ZONE.default;
}

export function memberQuestionTextForZone(ctx: FlowContext): string {
  switch (ctx.zone) {
    case 'roof':             return 'What part of the roof system was damaged?';
    case 'interior_wall':    return 'What wall member was damaged?';
    case 'exterior_wall':    return 'What exterior-wall member was damaged?';
    case 'interior_floor':   return 'What floor member was damaged?';
    case 'interior_ceiling': return 'What ceiling member was damaged?';
    case 'envelope_opening': return 'What at the opening was damaged?';
    case 'stairs':           return 'What stair member was damaged?';
    case 'structural':       return 'Which structural member was damaged?';
    case 'basement':         return 'What basement framing member was damaged?';
    case 'foundation':       return 'What at the foundation was damaged?';
    case 'deck':             return 'What deck member was damaged?';
    default:                 return 'What framing member was damaged?';
  }
}


export const FLOWS: Record<BuildingType, Record<FlowScenario, ScopeFlow>> = {
  // ═══════════════ CUSTOM HOME (single-family wood) ═══════════════
  custom_home: {
    damage: {
      title: 'What happened?',
      sub: 'Wood stick framing · Standard IRC provisions · No rated assemblies',
      questions: [
        {
          id: 'member',
          text: 'What framing member was damaged?',
          hint: 'Custom home defaults — walls, floors, roof structure.',
          grid: 'cols-4',
          answers: [
            { id: '2x_stud',       label: '2x wall stud',    icon: '▮', sub: '2x4 or 2x6' },
            { id: 'floor_joist',   label: 'Floor joist',     icon: '═', sub: 'dimensional' },
            { id: 'i_joist',       label: 'I-joist (TJI)',   icon: 'I', sub: 'engineered' },
            { id: 'ceiling_joist', label: 'Ceiling joist',   icon: '─', sub: 'attic / flat' },
            { id: 'rafter',        label: 'Rafter',          icon: '⟋', sub: 'sloped roof' },
            { id: 'roof_truss',    label: 'Roof truss',      icon: '△', sub: 'engineered' },
            { id: 'header_lvl',    label: 'Header / LVL',    icon: '▭', sub: 'over opening' },
            { id: 'stringer',      label: 'Stair stringer',  icon: '⟍', sub: 'stringer' },
          ],
        },
        {
          id: 'action',
          text: 'What did the other trade do to it?',
          hint: 'Common on residential — plumbing, HVAC, electrical rough-ins.',
          grid: 'cols-4',
          answers: [
            { id: 'cut_through',      label: 'Cut through',         icon: '✂' },
            { id: 'notched_deep',     label: 'Notched too deep',    icon: '◣', sub: '> IRC limit' },
            { id: 'drilled_oversize', label: 'Drilled oversized',   icon: '🕳', sub: '> 1/3 depth' },
            { id: 'hole_near_end',    label: 'Hole near bearing',   icon: '◉', sub: '< 2" to end' },
            { id: 'broken_split',     label: 'Broken / split',      icon: '💥' },
            { id: 'damaged_end',      label: 'Damaged end bearing', icon: '◀' },
            { id: 'cut_out',          label: 'Cut out entirely',    icon: '✕' },
            { id: 'unsure',           label: 'Not sure',            icon: '❓' },
          ],
        },
        {
          id: 'scale',
          text: 'Roughly how much of the member is affected?',
          grid: 'scale',
          answers: [
            { id: 'lt_2',  label: '< 2',       sub: 'LF' },
            { id: '2_4',   label: '2–4',       sub: 'LF' },
            { id: '4_8',   label: '4–8',       sub: 'LF' },
            { id: '8_16',  label: '8–16',      sub: 'LF' },
            { id: 'full',  label: 'Full span', sub: 'replace' },
          ],
        },
        {
          id: 'bearing',
          text: 'Is this a bearing / load-path member?',
          hint: "Determines if an engineer's sign-off is needed before repair.",
          grid: 'cols-3',
          why: 'Custom',
          annotation: "<b>Custom-home rule:</b> if it's a bearing member (joist under a bearing wall, rafter on a ridge beam, header), the repair may need engineer sign-off per IRC R301.1.3. Non-bearing partitions never do.",
          answers: [
            { id: 'non_bearing', label: 'No — non-bearing', icon: '◯', sub: 'sister ok' },
            { id: 'bearing',     label: 'Yes — bearing',    icon: '⬛', sub: 'needs PE', spec: true },
            { id: 'unsure',      label: 'Not sure',         icon: '❓' },
          ],
        },
      ],
      summarize: (ctx, a) => {
        const trade = TRADE_LABELS[a.trade as string] ?? 'another trade';
        const member = memberLabel(a.member as string, ctx.framingMethod);
        const action = ACTION_VERBS[a.action as string] ?? 'damaged';
        const qty = parseScale(a.scale as string);
        const loc = locationShort(ctx.locationTag);
        const bearingNote = a.bearing === 'bearing'
          ? 'Bearing member — may need engineer sign-off per IRC R301.1.3.'
          : a.bearing === 'non_bearing'
          ? 'Non-bearing, so no engineer sign-off needed.'
          : '';
        return `${trade} ${action} a ${member} in the ${loc} (~${qty} affected). ${bearingNote}`.trim();
      },
    },

    addition: {
      title: 'What are you adding?',
      sub: 'Owner request on a custom home — common additions are walls, closets, trim carpentry.',
      questions: [
        {
          id: 'what',
          text: 'What are you adding?',
          grid: 'cols-4',
          answers: [
            { id: 'partition',  label: 'Partition wall',     icon: '▮' },
            { id: 'closet',     label: 'Closet build-out',   icon: '▭' },
            { id: 'opening',    label: 'New opening',        icon: '🪟', sub: 'window/door' },
            { id: 'soffit',     label: 'Soffit / bulkhead',  icon: '▤' },
            { id: 'niche',      label: 'Niche / nook',       icon: '◰' },
            { id: 'blocking',   label: 'Blocking',           icon: '▱', sub: 'TV/grab' },
            { id: 'trim',       label: 'Trim carpentry',    icon: '═', sub: 'spec' },
            { id: 'other',      label: 'Other',              icon: '•' },
          ],
        },
        {
          id: 'stud_type',
          text: 'Stud size / wall type?',
          hint: 'Single-family defaults — most interior partitions are 2x4; plumbing walls 2x6.',
          grid: 'cols-4',
          answers: [
            { id: '2x4',        label: '2x4 partition',      icon: '▮', sub: 'standard' },
            { id: '2x6_plumb',  label: '2x6 plumbing wall',  icon: '▮', sub: 'wet wall' },
            { id: '2x6_ext',    label: '2x6 exterior-match', icon: '▮', sub: 'match shell' },
            { id: 'furred',     label: 'Furred / chase',     icon: '┃', sub: 'shallow' },
          ],
        },
        {
          id: 'length',
          text: 'How long is the wall run?',
          grid: 'scale',
          answers: [
            { id: 'lt_4',   label: '< 4',    sub: 'LF' },
            { id: '4_8',    label: '4–8',    sub: 'LF' },
            { id: '8_16',   label: '8–16',   sub: 'LF' },
            { id: '16_24',  label: '16–24',  sub: 'LF' },
            { id: '24_plus',label: '24+',    sub: 'LF' },
          ],
        },
        {
          id: 'bearing',
          text: 'Is this a bearing wall?',
          hint: 'Only matters if the wall carries load from above.',
          grid: 'cols-3',
          answers: [
            { id: 'non_bearing', label: 'No — partition',     icon: '◯' },
            { id: 'bearing',     label: 'Yes — needs header', icon: '⬛', spec: true },
            { id: 'unsure',      label: 'Not sure',           icon: '❓' },
          ],
        },
      ],
      summarize: (ctx, a) => {
        const what = ADDITION_LABELS[a.what as string] ?? 'new framing';
        const stud = STUD_LABELS[a.stud_type as string] ?? '2x4 studs';
        const qty = parseScale(a.length as string);
        const bearing = a.bearing === 'bearing'
          ? 'Bearing — header required per IRC Table R602.7.'
          : 'Non-bearing — straight partition with standard plate-to-plate framing.';
        return `Owner requested new ${stud} ${what}, ~${qty} long. ${bearing}`.trim();
      },
    },

    rework: {
      title: 'What failed or needs rework?',
      sub: 'Inspector caught something, engineer revised, or drawings changed after work started.',
      questions: [
        {
          id: 'reason',
          text: "What's the rework for?",
          grid: 'cols-4',
          answers: [
            { id: 'inspector_fail', label: 'Inspector fail',    icon: '📋', sub: 'red tag' },
            { id: 'engineer_rev',   label: 'Engineer revision', icon: '✎' },
            { id: 'plans_changed',  label: 'Plans changed',     icon: '📐' },
            { id: 'gc_directed',    label: 'GC-directed fix',   icon: '👷' },
            { id: 'punch',          label: 'Punch list item',   icon: '•' },
            { id: 'warranty',       label: 'Warranty callback', icon: '↩' },
          ],
        },
        {
          id: 'issue',
          text: 'What needs to be redone?',
          grid: 'cols-4',
          answers: [
            { id: 'out_of_plumb',   label: 'Wall out of plumb',  icon: '┃' },
            { id: 'renail_sheath',  label: 'Re-nail sheathing',  icon: '▦' },
            { id: 'missing_hw',     label: 'Missing hardware',   icon: '⎇', sub: 'ties/straps' },
            { id: 'wrong_dim',      label: 'Wrong dimension',    icon: '↔' },
            { id: 'header_under',   label: 'Header undersized',  icon: '▭', spec: true },
            { id: 'stud_spacing',   label: 'Stud spacing wrong', icon: '||' },
            { id: 'notching_fail',  label: 'Notching fail',      icon: '◣' },
            { id: 'other',          label: 'Other',              icon: '•' },
          ],
        },
        {
          id: 'scale',
          text: 'How much area?',
          grid: 'scale',
          answers: [
            { id: 'one',        label: '1 member',   sub: 'EA' },
            { id: '2_4',        label: '2–4',        sub: 'EA' },
            { id: '5_10',       label: '5–10',       sub: 'EA' },
            { id: 'full_wall',  label: 'Full wall',  sub: 'LS' },
          ],
        },
      ],
      summarize: (ctx, a) => {
        const issueStr = REWORK_LABELS[a.issue as string] ?? 'rework needed';
        const qty = parseScale(a.scale as string);
        const loc = locationShort(ctx.locationTag);
        return `${issueStr} flagged at ${loc} — ${qty}. Re-call inspection after correction.`;
      },
    },
  },

  // track_home uses same flows as custom_home — alias
  track_home: undefined as any,  // set below via Object.assign

  // ═══════════════ TOWNHOMES (wood + demising) ═══════════════
  townhomes: {
    damage: {
      title: 'What happened?',
      sub: 'Townhome framing — wood stick with demising walls between units, often stacked shear lines.',
      questions: [
        {
          id: 'member',
          text: 'What framing member was damaged?',
          hint: 'Townhome list adds demising-wall and party-line members.',
          grid: 'cols-4',
          answers: [
            { id: '2x_stud',        label: '2x wall stud',           icon: '▮', sub: 'partition' },
            { id: 'demising_stud',  label: 'Demising wall stud',     icon: '║', sub: 'between units', spec: true },
            { id: 'shear_stud',     label: 'Shear wall stud',        icon: '▰', sub: 'lateral', spec: true },
            { id: 'floor_joist',    label: 'Floor joist',            icon: '═' },
            { id: 'floor_ceil_asy', label: 'Floor/ceiling assembly', icon: '▦', sub: 'between units', spec: true },
            { id: 'i_joist',        label: 'I-joist (TJI)',          icon: 'I' },
            { id: 'rafter',         label: 'Rafter',                 icon: '⟋' },
            { id: 'header_lvl',     label: 'Header / LVL',           icon: '▭' },
          ],
        },
        {
          id: 'action',
          text: 'What did the other trade do?',
          grid: 'cols-4',
          why: 'Townhome',
          annotation: '<b>Townhome-specific:</b> damage to a <b>demising wall</b> or floor/ceiling assembly between units means coordination with the neighboring unit\'s GC — access, sound flanking, fire separation all affected.',
          answers: [
            { id: 'cut_through',     label: 'Cut through',         icon: '✂' },
            { id: 'notched_deep',    label: 'Notched too deep',    icon: '◣' },
            { id: 'drilled_oversize',label: 'Drilled oversized',   icon: '🕳' },
            { id: 'cut_demising',    label: 'Cut through demising',icon: '║', spec: true },
            { id: 'broke_acoustic',  label: 'Broke acoustic seal', icon: '♪', spec: true },
            { id: 'broke_bearing',   label: 'Broke bearing end',   icon: '◀' },
            { id: 'broken_split',    label: 'Broken / split',      icon: '💥' },
            { id: 'unsure',          label: 'Not sure',            icon: '❓' },
          ],
        },
        {
          id: 'scale',
          text: 'Roughly how much is affected?',
          grid: 'scale',
          answers: [
            { id: 'lt_2',  label: '< 2',       sub: 'LF' },
            { id: '2_4',   label: '2–4',       sub: 'LF' },
            { id: '4_8',   label: '4–8',       sub: 'LF' },
            { id: '8_16',  label: '8–16',      sub: 'LF' },
            { id: 'full',  label: 'Full span', sub: 'replace' },
          ],
        },
        {
          id: 'access',
          text: 'Is access needed from the other unit?',
          hint: 'Demising / floor-ceiling work often requires neighbor-side access.',
          grid: 'cols-3',
          why: 'Townhome',
          answers: [
            { id: 'one_side',  label: 'No — fix from this side', icon: '→' },
            { id: 'both_side', label: 'Yes — both sides',        icon: '↔', spec: true },
            { id: 'unsure',    label: 'Not sure yet',            icon: '❓' },
          ],
        },
      ],
      summarize: (ctx, a) => {
        const trade = TRADE_LABELS[a.trade as string] ?? 'another trade';
        const member = memberLabel(a.member as string, ctx.framingMethod);
        const action = ACTION_VERBS[a.action as string] ?? 'damaged';
        const qty = parseScale(a.scale as string);
        const loc = locationShort(ctx.locationTag);
        const access = a.access === 'both_side'
          ? 'Both-side access needed — coordinate with neighboring unit.'
          : '';
        const rating = /demising/.test(a.member as string)
          ? 'Sister stud + re-seal acoustic/fire barrier on both sides, inspect drywall joints for flanking.'
          : '';
        return `${trade} ${action} a ${member} at ${loc}, ~${qty} affected. ${access} ${rating}`.trim();
      },
    },

    addition: {
      title: 'What are you adding?',
      sub: 'Townhome addition — often party-line adjustments, unit-interior partitions.',
      questions: [
        {
          id: 'what',
          text: 'What are you adding?',
          grid: 'cols-4',
          answers: [
            { id: 'unit_partition',  label: 'Unit interior partition', icon: '▮' },
            { id: 'demising_ext',    label: 'Demising wall extension', icon: '║', spec: true },
            { id: 'shear_segment',   label: 'Shear wall segment',      icon: '▰', spec: true, sub: 'per engineer' },
            { id: 'bulkhead',        label: 'Bulkhead / soffit',       icon: '▭' },
            { id: 'closet',          label: 'Closet',                  icon: '☐' },
            { id: 'demising_opening',label: 'Opening in demising',     icon: '🚪', spec: true, sub: 'rare' },
          ],
        },
        {
          id: 'assembly',
          text: 'Is this a shared-wall / rated assembly?',
          grid: 'cols-3',
          why: 'Townhome',
          annotation: '<b>Demising walls</b> in townhomes are typically <b>1-hr rated</b> per IBC 420 and need acoustic separation (STC-50 minimum). Shear walls have engineer-specified nailing schedules.',
          answers: [
            { id: 'partition',    label: 'No — partition only',  icon: '◯' },
            { id: 'demising',     label: 'Yes — demising (rated)',icon: '║', spec: true },
            { id: 'shear',        label: 'Yes — shear wall',     icon: '▰', spec: true },
          ],
        },
        {
          id: 'length',
          text: 'How long / how big?',
          grid: 'scale',
          answers: [
            { id: 'lt_4',    label: '< 4',   sub: 'LF' },
            { id: '4_8',     label: '4–8',   sub: 'LF' },
            { id: '8_16',    label: '8–16',  sub: 'LF' },
            { id: '16_plus', label: '16+',   sub: 'LF' },
          ],
        },
      ],
      summarize: (ctx, a) => {
        const what = a.what as string;
        const qty = parseScale(a.length as string);
        if (what === 'shear_segment') {
          return `Per revised engineer's drawings, add ~${qty} of shear wall segment. 2x6 studs @ 16" O.C. with 8d nails @ 3" edge nailing on both faces. Holdowns at each end per detail.`;
        }
        if (a.assembly === 'demising') {
          return `Add ~${qty} of 1-hr rated demising wall. 2x6 studs @ 16" O.C. with Type X gyp both faces, RC-1 channel for STC, firestop top & bottom.`;
        }
        return `Add ~${qty} of ${ADDITION_LABELS[what] ?? 'new framing'}. Non-rated.`;
      },
    },

    rework: {
      title: 'What failed?',
      sub: 'Townhome rework often involves shear nailing, demising seal continuity, or fire separation.',
      questions: [
        {
          id: 'issue',
          text: "What's the issue?",
          grid: 'cols-4',
          answers: [
            { id: 'shear_nail_fail', label: 'Shear nailing fail',  icon: '▰', spec: true, sub: 're-nail' },
            { id: 'demising_gap',    label: 'Demising seal gap',   icon: '║', spec: true },
            { id: 'fire_sep_fail',   label: 'Fire separation fail',icon: '🔥', spec: true },
            { id: 'inspector',       label: 'Inspector red tag',   icon: '📋' },
            { id: 'engineer_rev',    label: 'Engineer revision',   icon: '✎' },
            { id: 'plans_changed',   label: 'Plans changed',       icon: '📐' },
          ],
        },
        {
          id: 'scale',
          text: 'How much area?',
          grid: 'scale',
          answers: [
            { id: 'lt_4',       label: '< 4',       sub: 'LF' },
            { id: '4_8',        label: '4–8',       sub: 'LF' },
            { id: '8_16',       label: '8–16',      sub: 'LF' },
            { id: 'whole_wall', label: 'Whole wall',sub: 'LS' },
          ],
        },
      ],
      summarize: (ctx, a) => {
        if (a.issue === 'shear_nail_fail') {
          const qty = parseScale(a.scale as string);
          return `Inspector flagged shear nailing spacing at party wall — 6" OC installed, 3" OC required per drawings. Re-nail ~${qty} of edge nailing at panel joints on both faces.`;
        }
        return `${REWORK_LABELS[a.issue as string]} at ${locationShort(ctx.locationTag)} — ${parseScale(a.scale as string)}.`;
      },
    },
  },

  // ═══════════════ MULTIFAMILY (rated assemblies) ═══════════════
  apartments_mf: {
    damage: {
      title: 'What happened?',
      sub: 'Multifamily framing — rated assemblies everywhere. Corridor walls, shafts, floor/ceiling between units all matter.',
      questions: [
        {
          id: 'member',
          text: 'Which rated assembly was damaged?',
          hint: 'MF lists assemblies first because the rating determines the fix.',
          grid: 'cols-4',
          answers: [
            { id: 'corridor_1hr',  label: '1-hr corridor wall',    icon: '┃', sub: 'rated', spec: true },
            { id: 'demising_1hr',  label: '1-hr demising wall',    icon: '║', sub: 'btwn units', spec: true },
            { id: 'shaft_2hr',     label: '2-hr shaft wall',       icon: '▌', sub: 'elev/exit', spec: true },
            { id: 'stair_2hr',     label: '2-hr stair enclosure',  icon: '⟍', sub: 'egress', spec: true },
            { id: 'floor_ceil_1hr',label: '1-hr floor/ceiling',    icon: '═', sub: 'btwn units', spec: true },
            { id: 'non_rated',     label: 'Non-rated partition',   icon: '▮' },
            { id: 'bearing_stud',  label: 'Bearing stud',          icon: '⬛' },
            { id: 'exterior_frame',label: 'Exterior framing',      icon: '▱' },
          ],
        },
        {
          id: 'breach',
          text: 'What kind of breach?',
          grid: 'cols-4',
          why: 'Multifamily',
          annotation: '<b>MF-specific:</b> any penetration of a rated assembly that\'s not properly firestopped is a code violation. The repair isn\'t just the stud — it\'s re-establishing the rating with firestop caulk, mineral wool, or an approved through-penetration system (UL).',
          answers: [
            { id: 'penetration_open', label: 'Penetration unsealed',  icon: '🕳', spec: true, sub: 'missing firecaulk' },
            { id: 'cut_stud',         label: 'Cut through stud',      icon: '✂' },
            { id: 'oversize_hole',    label: 'Oversized hole',        icon: '⚫' },
            { id: 'broke_firestop',   label: 'Broke firestop',        icon: '🔥', spec: true },
            { id: 'damaged_header',   label: 'Damaged header',        icon: '▭' },
            { id: 'broke_acoustic',   label: 'Broke acoustic seal',   icon: '♪', spec: true, sub: 'STC flanking' },
            { id: 'notched_deep',     label: 'Notched too deep',      icon: '◣' },
            { id: 'broken_split',     label: 'Broken / split',        icon: '💥' },
          ],
        },
        {
          id: 'trade',
          text: 'Which trade caused it?',
          grid: 'cols-4',
          answers: [
            { id: 'plumbing',    label: 'Plumbing',       icon: '🚰' },
            { id: 'electrical',  label: 'Electrical',     icon: '⚡' },
            { id: 'hvac',        label: 'HVAC',           icon: '❄' },
            { id: 'sprinkler',   label: 'Fire sprinkler', icon: '💧', spec: true },
            { id: 'lowvolt',     label: 'Low-voltage',    icon: '📡' },
            { id: 'drywall',     label: 'Drywall',        icon: '🧱' },
            { id: 'other',       label: 'Other trade',    icon: '🔧' },
            { id: 'unknown',     label: 'Unknown',        icon: '❓' },
          ],
        },
        {
          id: 'scale',
          text: 'How much area affected?',
          grid: 'scale',
          answers: [
            { id: '1_pen',   label: '1 pen.',    sub: 'EA' },
            { id: '2_4',     label: '2–4',       sub: 'EA' },
            { id: '5_10',    label: '5–10',      sub: 'EA' },
            { id: '10_plus', label: '10+',       sub: 'EA' },
            { id: 'full_wall',label: 'Full wall',sub: 'LF' },
          ],
        },
        {
          id: 'inspection',
          text: 'Is the wall inspection already called?',
          hint: 'Determines whether re-inspection is a new trip or catches the existing one.',
          grid: 'cols-3',
          why: 'Multifamily',
          answers: [
            { id: 'open',         label: 'Not yet — open',   icon: '◯' },
            { id: 'failed',       label: 'Already failed',   icon: '⚠', spec: true },
            { id: 'passed',       label: 'Already passed',   icon: '✓', sub: 'concealed — expose' },
          ],
        },
      ],
      summarize: (ctx, a) => {
        const trade = TRADE_LABELS[a.trade as string] ?? 'another trade';
        const member = MEMBER_LABELS_MF[a.member as string] ?? 'rated member';
        const breach = BREACH_VERBS[a.breach as string] ?? 'damaged';
        const qty = parseScale(a.scale as string);
        const loc = locationShort(ctx.locationTag);
        const fixNote = /rated|corridor|demising|shaft|stair/.test(a.member as string)
          ? 'Install full-height stud patch + UL-listed through-penetration firestop. Re-call rated-wall inspection.'
          : '';
        return `${trade} ${breach} a ${member} at ${loc} (${qty}). ${fixNote}`.trim();
      },
    },

    addition: {
      title: 'What are you adding?',
      sub: 'MF additions are rare mid-construction — most are corridor/partition adjustments per revised plans.',
      questions: [
        {
          id: 'what',
          text: 'What are you adding?',
          grid: 'cols-4',
          answers: [
            { id: 'unit_partition', label: 'Unit partition',        icon: '▮' },
            { id: 'corridor',       label: 'Corridor wall segment', icon: '┃', spec: true },
            { id: 'shaft_ext',      label: 'Shaft wall extension',  icon: '▌', spec: true },
            { id: 'closet',         label: 'Closet build-out',      icon: '☐' },
            { id: 'mep_chase',      label: 'MEP chase framing',     icon: '🔧' },
            { id: 'blocking',       label: 'Blocking (grab bars)',  icon: '▱', sub: 'ADA' },
          ],
        },
        {
          id: 'rating',
          text: 'Fire rating required?',
          grid: 'cols-4',
          why: 'Multifamily',
          answers: [
            { id: 'none',    label: 'None',     icon: '◯' },
            { id: '1hr',     label: '1-hr',     icon: '🔥', spec: true },
            { id: '2hr',     label: '2-hr',     icon: '🔥🔥', spec: true },
            { id: 'unsure',  label: 'Not sure', icon: '❓' },
          ],
        },
        {
          id: 'length',
          text: 'How long is the wall?',
          grid: 'scale',
          answers: [
            { id: 'lt_4',    label: '< 4',    sub: 'LF' },
            { id: '4_8',     label: '4–8',    sub: 'LF' },
            { id: '8_16',    label: '8–16',   sub: 'LF' },
            { id: '16_plus', label: '16+',    sub: 'LF' },
          ],
        },
      ],
      summarize: (ctx, a) => {
        const qty = parseScale(a.length as string);
        const rating = a.rating === '1hr' ? '1-hr rated'
                    : a.rating === '2hr' ? '2-hr rated'
                    : 'non-rated';
        const type = a.what === 'corridor' ? 'corridor wall'
                   : a.what === 'shaft_ext' ? 'shaft wall'
                   : 'wall';
        return `Add ~${qty} of ${rating} ${type} at ${locationShort(ctx.locationTag)}. 2x4 studs @ 16" O.C., 5/8" Type X gyp both faces, RC-1 channel one side for STC, firestop top & bottom tracks.`;
      },
    },

    rework: {
      title: 'What failed?',
      sub: 'MF rework — usually rated-assembly issues or failed smoke/sound tests.',
      questions: [
        {
          id: 'issue',
          text: 'What was flagged?',
          grid: 'cols-4',
          answers: [
            { id: 'firestop_miss',  label: 'Firestop missing',    icon: '🔥', spec: true },
            { id: 'rated_breach',   label: 'Rated wall breach',   icon: '🧱', spec: true },
            { id: 'stc_fail',       label: 'STC test failed',     icon: '♪',  spec: true, sub: '< 50' },
            { id: 'smoke_fail',     label: 'Smoke test failed',   icon: '💨', spec: true },
            { id: 'stud_spacing',   label: 'Wrong stud spacing',  icon: '||' },
            { id: 'missing_hw',     label: 'Missing hardware',    icon: '⎇' },
            { id: 'plans_changed',  label: 'Plans changed',       icon: '📐' },
            { id: 'engineer_rev',   label: 'Engineer revision',   icon: '✎' },
          ],
        },
        {
          id: 'scale',
          text: 'How much area?',
          grid: 'scale',
          answers: [
            { id: '1_spot',     label: '1 spot',      sub: 'EA' },
            { id: '2_5',        label: '2–5',         sub: 'EA' },
            { id: 'one_unit',   label: 'One unit',    sub: 'LS' },
            { id: 'multi_unit', label: 'Multi-unit',  sub: 'LS' },
          ],
        },
      ],
      summarize: (ctx, a) => {
        if (a.issue === 'smoke_fail') {
          return `Smoke test failed at ${locationShort(ctx.locationTag)} — likely flanking path at floor-ceiling transition. Open top plate, install mineral-wool continuous firestop and acoustic sealant bead, re-test.`;
        }
        return `${REWORK_LABELS_MF[a.issue as string] ?? a.issue} flagged at ${locationShort(ctx.locationTag)} — ${parseScale(a.scale as string)}. Remediate and re-test.`;
      },
    },
  },

  // hotel_hospitality and senior_living use same MF flows — set after object literal
  hotel_hospitality: undefined as any,
  senior_living: undefined as any,

  // ═══════════════ COMMERCIAL (metal stud) ═══════════════
  commercial: {
    damage: {
      title: 'What happened?',
      sub: 'Commercial metal-stud mid-rise — gauge, height, and rated assemblies drive everything.',
      questions: [
        {
          id: 'member',
          text: 'Which member was damaged?',
          hint: 'Commercial vocabulary — metal stud, track, bar joist, deck.',
          grid: 'cols-4',
          why: 'Commercial',
          annotation: '<b>Commercial-specific:</b> for metal stud, the <b>gauge</b> (25/22/20/18/16) matters more than the label — a 16ga heavy stud at a curtain wall back-up is load-bearing and can\'t be field-modified without engineering review.',
          answers: [
            { id: 'metal_stud',       label: 'Metal stud',           icon: '┃', sub: '25–16 ga', spec: true },
            { id: 'top_track',        label: 'Top track',            icon: '═', sub: 'deflection', spec: true },
            { id: 'shaft_wall_stud',  label: 'Shaft wall stud',      icon: '▌', sub: 'CT / CH', spec: true },
            { id: 'curtain_backup',   label: 'Curtain wall back-up', icon: '▱', sub: '16ga heavy', spec: true },
            { id: 'bar_joist',        label: 'Bar joist',            icon: 'Z', sub: 'steel', spec: true },
            { id: 'bar_joist_bridge', label: 'Bar joist bridging',   icon: '⟍', spec: true },
            { id: 'steel_deck',       label: 'Steel deck',           icon: '▦', sub: 'composite', spec: true },
            { id: 'cf_beam',          label: 'Cold-formed beam',     icon: '⎯', spec: true },
          ],
        },
        {
          id: 'action',
          text: 'What did the other trade do?',
          grid: 'cols-4',
          answers: [
            { id: 'cut_stud',         label: 'Cut through stud',     icon: '✂' },
            { id: 'oversize_pen',     label: 'Oversized penetration',icon: '⚫', sub: 'no sleeve' },
            { id: 'cut_flange',       label: 'Cut flange',           icon: '◣', spec: true },
            { id: 'firestop_miss',    label: 'Missing firestop',     icon: '🔥', spec: true },
            { id: 'punc_deck',        label: 'Punctured deck',       icon: '🕳', spec: true },
            { id: 'cut_bridge',       label: 'Cut bridging',         icon: '✂', spec: true },
            { id: 'unsure',           label: 'Not sure',             icon: '❓' },
          ],
        },
        {
          id: 'gauge',
          text: 'Stud gauge / element type?',
          hint: 'Critical for repair decision — 25ga tears, 16ga needs cutting equipment.',
          grid: 'cols-5',
          why: 'Commercial',
          answers: [
            { id: '25ga', label: '25 ga', sub: 'non-struct' },
            { id: '22ga', label: '22 ga', sub: 'typ' },
            { id: '20ga', label: '20 ga', sub: 'typ' },
            { id: '18ga', label: '18 ga', sub: 'tall wall' },
            { id: '16ga', label: '16 ga', sub: 'heavy', spec: true },
          ],
        },
        {
          id: 'rating',
          text: 'Rated assembly?',
          grid: 'cols-4',
          answers: [
            { id: 'non_rated', label: 'Non-rated', icon: '◯' },
            { id: '1hr',       label: '1-hr',      icon: '🔥' },
            { id: '2hr',       label: '2-hr',      icon: '🔥🔥', spec: true, sub: 'shafts/stairs' },
            { id: 'unsure',    label: 'Not sure',  icon: '❓' },
          ],
        },
        {
          id: 'scale',
          text: 'How many studs / what scale?',
          grid: 'scale',
          answers: [
            { id: '1',       label: '1 stud',      sub: 'EA' },
            { id: '2_4',     label: '2–4',         sub: 'EA' },
            { id: '5_10',    label: '5–10',        sub: 'EA' },
            { id: '10_plus', label: '10+',         sub: 'EA' },
            { id: 'run',     label: 'Run of wall', sub: 'LF' },
          ],
        },
      ],
      summarize: (ctx, a) => {
        const trade = TRADE_LABELS[a.trade as string] ?? 'another trade';
        const gauge = a.gauge as string;
        const member = MEMBER_LABELS_COMMERCIAL[a.member as string] ?? 'metal stud';
        const action = ACTION_VERBS_COMMERCIAL[a.action as string] ?? 'damaged';
        const qty = parseScale(a.scale as string);
        const rating = a.rating === '2hr' ? '2-hr shaft wall'
                     : a.rating === '1hr' ? '1-hr rated wall'
                     : 'non-rated wall';
        const fixNote = a.rating !== 'non_rated'
          ? 'Piece-out damaged stud, install full-height gauge-matched replacement with top-track deflection clip, re-establish firestop per UL assembly.'
          : 'Piece-out and replace with full-height stud.';
        return `${trade} ${action} in ${gauge} ${member} at ${locationShort(ctx.locationTag)} (${rating}), ~${qty}. ${fixNote}`;
      },
    },

    addition: {
      title: 'What are you adding?',
      sub: 'Commercial addition — usually tenant partitions, shaft extensions, deck infill.',
      questions: [
        {
          id: 'what',
          text: 'What are you adding?',
          grid: 'cols-4',
          answers: [
            { id: 'tenant_part',   label: 'Tenant partition',      icon: '▮', sub: '20–25 ga' },
            { id: 'shaft_ext',     label: 'Shaft wall extension',  icon: '▌', spec: true },
            { id: 'curtain_backup',label: 'Curtain wall back-up',  icon: '▱', spec: true, sub: '16 ga' },
            { id: 'soffit_grid',   label: 'Ceiling soffit grid',   icon: '▤' },
            { id: 'demountable',   label: 'Demountable partition', icon: '▯', spec: true },
            { id: 'mep_chase',     label: 'MEP chase framing',     icon: '🔧' },
            { id: 'deck_infill',   label: 'Steel deck infill',     icon: '▦', spec: true },
            { id: 'blocking',      label: 'Blocking',              icon: '▱' },
          ],
        },
        {
          id: 'height',
          text: 'Wall height?',
          hint: "Commercial walls run 9-30'. Gauge and spacing driven by height.",
          grid: 'cols-5',
          why: 'Commercial',
          answers: [
            { id: 'lt_10',   label: "< 10'",    sub: 'low' },
            { id: '10_14',   label: "10–14'",   sub: 'typical' },
            { id: '14_20',   label: "14–20'",   sub: 'tall', spec: true },
            { id: '20_30',   label: "20–30'",   sub: 'high bay', spec: true },
            { id: '30_plus', label: "30'+",     sub: 'special eng', spec: true },
          ],
        },
        {
          id: 'gauge',
          text: 'Gauge?',
          grid: 'cols-5',
          answers: [
            { id: '25ga', label: '25 ga', sub: 'partition' },
            { id: '22ga', label: '22 ga', sub: 'typ' },
            { id: '20ga', label: '20 ga', sub: 'typ' },
            { id: '18ga', label: '18 ga', sub: 'tall' },
            { id: '16ga', label: '16 ga', sub: 'heavy', spec: true },
          ],
        },
        {
          id: 'length',
          text: 'How long?',
          grid: 'scale',
          answers: [
            { id: 'lt_8',    label: '< 8',    sub: 'LF' },
            { id: '8_20',    label: '8–20',   sub: 'LF' },
            { id: '20_50',   label: '20–50',  sub: 'LF' },
            { id: '50_plus', label: '50+',    sub: 'LF' },
          ],
        },
      ],
      summarize: (ctx, a) => {
        const qty = parseScale(a.length as string);
        const gauge = a.gauge as string;
        const height = a.height as string;
        return `New tenant partition, ~${qty} at ${locationShort(ctx.locationTag)}. ${gauge} metal stud @ 16" O.C., ${height} tall. Top track with 3/4" deflection clips, standard slip-track.`;
      },
    },

    rework: {
      title: 'What failed?',
      sub: 'Commercial rework — usually deflection, fireproofing, or inspection issues.',
      questions: [
        {
          id: 'issue',
          text: "What's the issue?",
          grid: 'cols-4',
          answers: [
            { id: 'deflection',    label: 'Deflection track short', icon: '↕', spec: true },
            { id: 'fireproof',     label: 'Fireproofing failed',    icon: '🔥', spec: true },
            { id: 'gauge_light',   label: 'Gauge too light',        icon: '▯', spec: true },
            { id: 'bridge_miss',   label: 'Bridging missing',       icon: '⟍', spec: true },
            { id: 'plans_changed', label: 'Plans changed',          icon: '📐' },
            { id: 'inspector',     label: 'Inspector red tag',      icon: '📋' },
          ],
        },
        {
          id: 'scale',
          text: 'How much area?',
          grid: 'scale',
          answers: [
            { id: '1_wall',   label: '1 wall',      sub: 'LS' },
            { id: '2_4',      label: '2–4 walls',   sub: 'LS' },
            { id: 'floor',    label: 'Floor',       sub: 'LS' },
            { id: 'multi',    label: 'Multi-floor', sub: 'LS' },
          ],
        },
      ],
      summarize: (ctx, a) => {
        if (a.issue === 'deflection') {
          return `Inspector flagged deflection track at top of ${locationShort(ctx.locationTag)} — 1/2" track installed, 3/4" required for building movement. Re-cut top track, install proper slip-clips, re-sheet & re-inspect.`;
        }
        return `${a.issue} at ${locationShort(ctx.locationTag)} — ${parseScale(a.scale as string)}. Remediate per spec.`;
      },
    },
  },

  // ═══════════════ EXTERIOR (envelope-focused) ═══════════════
  exterior: {
    damage: {
      title: 'What happened?',
      sub: 'Exterior envelope — sheathing, WRB, flashing, fascia, soffit, rim board.',
      questions: [
        {
          id: 'element',
          text: 'Which envelope element was damaged?',
          grid: 'cols-4',
          answers: [
            { id: 'wall_sheath',   label: 'Wall sheathing',   icon: '▦', sub: 'OSB/ply/Zip', spec: true },
            { id: 'roof_sheath',   label: 'Roof sheathing',   icon: '▤', spec: true },
            { id: 'rim_board',     label: 'Rim board / joist',icon: '═', spec: true },
            { id: 'wrb',           label: 'WRB / housewrap',  icon: '🛡', spec: true },
            { id: 'fascia',        label: 'Fascia framing',   icon: '─', spec: true },
            { id: 'soffit',        label: 'Soffit framing',   icon: '▭', spec: true },
            { id: 'rafter_tail',   label: 'Rafter tail',      icon: '⟋', spec: true },
            { id: 'ledger',        label: 'Ledger',           icon: '⎯', spec: true },
          ],
        },
        {
          id: 'cause',
          text: 'How did it happen?',
          grid: 'cols-4',
          why: 'Exterior',
          annotation: "<b>Exterior-specific:</b> water intrusion drives most envelope rework. The question isn't just the damaged sheathing — it's <b>how long has it been exposed</b> and whether the WRB / flashing above it is compromised too.",
          answers: [
            { id: 'water_intrusion',  label: 'Water intrusion',        icon: '💧', spec: true },
            { id: 'delivery_hit',     label: 'Material delivery hit',  icon: '💥' },
            { id: 'scaffold',         label: 'Scaffold damage',        icon: '▦' },
            { id: 'trade_cut',        label: 'Other trade cut',        icon: '✂' },
            { id: 'wind_weather',     label: 'Wind / weather',         icon: '🌬', spec: true },
            { id: 'fell_through',     label: 'Fell through deck',      icon: '🕳', spec: true },
            { id: 'vehicle',          label: 'Vehicle impact',         icon: '🚜' },
            { id: 'unsure',           label: 'Not sure',               icon: '❓' },
          ],
        },
        {
          id: 'scale',
          text: 'How much is affected?',
          grid: 'scale',
          answers: [
            { id: 'lt_16',    label: '< 16',    sub: 'SF' },
            { id: '16_32',    label: '16–32',   sub: 'SF' },
            { id: '32_64',    label: '32–64',   sub: 'SF' },
            { id: '64_128',   label: '64–128',  sub: 'SF' },
            { id: 'full_elev',label: 'Full elev',sub: 'LS' },
          ],
        },
        {
          id: 'exposure',
          text: 'Has it been exposed to weather?',
          hint: 'Moisture below the patch can rot framing for months.',
          grid: 'cols-3',
          why: 'Exterior',
          answers: [
            { id: 'under_48',  label: '< 48 hours', icon: '⏱' },
            { id: 'days',      label: 'Days',       icon: '📅' },
            { id: 'weeks_plus',label: 'Weeks+',     icon: '🌧', spec: true, sub: 'check rot' },
          ],
        },
      ],
      summarize: (ctx, a) => {
        const element = ELEMENT_LABELS[a.element as string] ?? 'envelope element';
        const cause = CAUSE_LABELS[a.cause as string] ?? 'damage';
        const qty = parseScale(a.scale as string);
        const loc = locationShort(ctx.locationTag);
        const exposureNote = a.exposure === 'weeks_plus'
          ? 'Exposed for weeks — inspect rim joist and WRB for rot before re-closing.'
          : a.exposure === 'days'
          ? 'Exposed for days — check substrate for moisture.'
          : '';
        return `${cause} to ~${qty} of ${element} at ${loc}. ${exposureNote} Replace, re-tape all seams, inspect WRB behind siding above for flashing integrity.`.trim();
      },
    },

    addition: {
      title: 'What are you adding?',
      sub: 'Exterior additions — usually owner-requested decks, pergolas, or window/door additions.',
      questions: [
        {
          id: 'what',
          text: 'What are you adding?',
          grid: 'cols-4',
          answers: [
            { id: 'deck',       label: 'Deck framing',      icon: '═' },
            { id: 'pergola',    label: 'Pergola framing',   icon: '△' },
            { id: 'porch',      label: 'Covered porch',     icon: '▭' },
            { id: 'window_ro',  label: 'New window RO',     icon: '🪟' },
            { id: 'ext_door',   label: 'New exterior door', icon: '🚪' },
            { id: 'skylight',   label: 'Skylight',          icon: '⬚' },
            { id: 'ledger',     label: 'Ledger attachment', icon: '⎯', spec: true },
            { id: 'fence',      label: 'Fence framing',     icon: '┇' },
          ],
        },
        {
          id: 'size',
          text: 'How big?',
          grid: 'scale',
          answers: [
            { id: 'lt_80',   label: '< 80',    sub: 'SF' },
            { id: '80_200',  label: '80–200',  sub: 'SF' },
            { id: '200_400', label: '200–400', sub: 'SF' },
            { id: '400_plus',label: '400+',    sub: 'SF' },
          ],
        },
        {
          id: 'connection',
          text: 'Ledger / connection to existing?',
          grid: 'cols-3',
          why: 'Exterior',
          annotation: "<b>Deck ledger attachment</b> is a structural connection per IRC R507. Flashing + thru-bolts with proper spacing aren't optional — this is the #1 cause of deck collapse failures.",
          answers: [
            { id: 'free_standing', label: 'No — free-standing', icon: '◯' },
            { id: 'thru_bolt',     label: 'Yes — thru-bolted',  icon: '⎯', spec: true },
            { id: 'unsure',        label: 'Not sure yet',       icon: '❓' },
          ],
        },
      ],
      summarize: (ctx, a) => {
        const what = a.what as string;
        const qty = parseScale(a.size as string);
        if (what === 'deck') {
          const connNote = a.connection === 'thru_bolt'
            ? 'Thru-bolted ledger to rim board with flashing per IRC R507, 2x10 joists @ 16" O.C., 6x6 posts on new footings.'
            : 'Free-standing on new footings, no ledger connection.';
          return `New ~${qty} pressure-treated deck at ${locationShort(ctx.locationTag)}. ${connNote}`;
        }
        return `New ~${qty} ${ADDITION_LABELS_EXT[what] ?? 'exterior framing'} at ${locationShort(ctx.locationTag)}.`;
      },
    },

    rework: {
      title: 'What needs fixing?',
      sub: 'Exterior rework — flashing details, WRB continuity, sheathing nailing.',
      questions: [
        {
          id: 'issue',
          text: "What's the issue?",
          grid: 'cols-4',
          answers: [
            { id: 'flash_miss',  label: 'Flashing missing', icon: '▱', spec: true },
            { id: 'wrb_gap',     label: 'WRB seam gap',     icon: '⎯', spec: true },
            { id: 'nail_fail',   label: 'Sheathing nailing',icon: '▦', spec: true },
            { id: 'water_intr',  label: 'Water intrusion',  icon: '💧', spec: true },
            { id: 'rot',         label: 'Rot found',        icon: '🍂', spec: true, sub: 'behind WRB' },
            { id: 'plans',       label: 'Plans changed',    icon: '📐' },
            { id: 'eng_rev',     label: 'Engineer revision',icon: '✎' },
            { id: 'other',       label: 'Other',            icon: '•' },
          ],
        },
        {
          id: 'scale',
          text: 'How much area?',
          grid: 'scale',
          answers: [
            { id: 'lt_16',    label: '< 16',     sub: 'SF' },
            { id: '16_64',    label: '16–64',    sub: 'SF' },
            { id: '64_128',   label: '64–128',   sub: 'SF' },
            { id: 'full_elev',label: 'Full elev',sub: 'LS' },
          ],
        },
      ],
      summarize: (ctx, a) => {
        if (a.issue === 'flash_miss') {
          return `Inspector found missing kick-out flashing at roof-to-wall intersection, ${locationShort(ctx.locationTag)}. Water stains behind WRB suggest ~${parseScale(a.scale as string)} of wet sheathing to confirm / replace. Install kick-out + re-run step flashing per SMACNA.`;
        }
        return `${REWORK_LABELS_EXT[a.issue as string] ?? a.issue} at ${locationShort(ctx.locationTag)} — ${parseScale(a.scale as string)}. Investigate and remediate.`;
      },
    },
  },
};

// Aliases — track_home shares custom_home flows; hotel/senior share apartments_mf
FLOWS.track_home = FLOWS.custom_home;
FLOWS.hotel_hospitality = FLOWS.apartments_mf;
FLOWS.senior_living = FLOWS.apartments_mf;

// ═══════════════ HELPERS ═══════════════

const TRADE_LABELS: Record<string, string> = {
  plumbing: 'Plumbing contractor', electrical: 'Electrical contractor',
  hvac: 'HVAC installer',          drywall: 'Drywall crew',
  sprinkler: 'Fire-sprinkler contractor', lowvolt: 'Low-voltage installer',
  other: 'Another trade',          unknown: 'An unknown trade',
  framer: 'Another framer',        finisher: 'Finisher',
};

const ACTION_VERBS: Record<string, string> = {
  cut_through: 'cut through',         notched_deep: 'notched too deeply into',
  drilled_oversize: 'drilled an oversized hole through',
  hole_near_end: 'drilled a hole too close to the bearing of',
  broken_split: 'broke / split',      damaged_end: 'damaged the end bearing of',
  cut_out: 'cut out entirely',        unsure: 'damaged',
};

const ACTION_VERBS_COMMERCIAL: Record<string, string> = {
  cut_stud: 'cut through',
  oversize_pen: 'cut an oversized penetration through',
  cut_flange: 'cut the flange of',
  firestop_miss: 'penetrated without firestop in',
  punc_deck: 'punctured',
  cut_bridge: 'cut bridging on',
  unsure: 'damaged',
};

const BREACH_VERBS: Record<string, string> = {
  penetration_open: 'created an unsealed penetration through',
  cut_stud: 'cut through a stud in',
  oversize_hole: 'cut an oversized hole in',
  broke_firestop: 'broke the firestop of',
  damaged_header: 'damaged the header of',
  broke_acoustic: 'broke the acoustic seal of',
  notched_deep: 'notched too deeply into',
  broken_split: 'broke / split a member in',
};

const MEMBER_LABELS_MF: Record<string, string> = {
  corridor_1hr: '1-hr rated corridor wall',
  demising_1hr: '1-hr demising wall',
  shaft_2hr: '2-hr shaft wall',
  stair_2hr: '2-hr stair enclosure',
  floor_ceil_1hr: '1-hr floor/ceiling assembly',
  non_rated: 'non-rated partition',
  bearing_stud: 'bearing stud',
  exterior_frame: 'exterior framing',
};

const MEMBER_LABELS_COMMERCIAL: Record<string, string> = {
  metal_stud: 'metal stud',
  top_track: 'top track',
  shaft_wall_stud: 'shaft wall stud',
  curtain_backup: 'curtain wall back-up',
  bar_joist: 'bar joist',
  bar_joist_bridge: 'bar joist bridging',
  steel_deck: 'steel deck',
  cf_beam: 'cold-formed beam',
};

const ELEMENT_LABELS: Record<string, string> = {
  wall_sheath: 'wall sheathing',        roof_sheath: 'roof sheathing',
  rim_board: 'rim board',               wrb: 'WRB / housewrap',
  fascia: 'fascia framing',             soffit: 'soffit framing',
  rafter_tail: 'rafter tail',           ledger: 'ledger board',
};

const CAUSE_LABELS: Record<string, string> = {
  water_intrusion: 'Water intrusion damaged',  delivery_hit: 'Material delivery impacted',
  scaffold: 'Scaffold removal damaged',         trade_cut: 'Another trade cut into',
  wind_weather: 'Weather event damaged',        fell_through: 'Someone fell through',
  vehicle: 'Vehicle impact damaged',            unsure: 'Unknown cause affected',
};

const ADDITION_LABELS: Record<string, string> = {
  partition: 'partition wall',        closet: 'closet',
  opening: 'opening',                 soffit: 'soffit',
  niche: 'niche',                     blocking: 'blocking',
  trim: 'trim carpentry',             other: 'framing',
};

const ADDITION_LABELS_EXT: Record<string, string> = {
  pergola: 'pergola', porch: 'covered porch', window_ro: 'window rough opening',
  ext_door: 'exterior door', skylight: 'skylight', ledger: 'ledger', fence: 'fence',
};

const STUD_LABELS: Record<string, string> = {
  '2x4': '2x4 studs @ 16" O.C.',
  '2x6_plumb': '2x6 plumbing-wall studs @ 16" O.C.',
  '2x6_ext': '2x6 exterior-match studs @ 16" O.C.',
  furred: 'furred chase',
};

const REWORK_LABELS: Record<string, string> = {
  out_of_plumb: 'Wall out of plumb',       renail_sheath: 'Sheathing re-nailing',
  missing_hw: 'Missing framing hardware',  wrong_dim: 'Wrong dimensions built',
  header_under: 'Header undersized',       stud_spacing: 'Incorrect stud spacing',
  notching_fail: 'Notching out of spec',   other: 'Rework',
};

const REWORK_LABELS_MF: Record<string, string> = {
  firestop_miss: 'Missing firestop',       rated_breach: 'Rated wall breach',
  stc_fail: 'STC acoustic test failed',    smoke_fail: 'Smoke test failed',
  stud_spacing: 'Wrong stud spacing',      missing_hw: 'Missing hardware',
};

const REWORK_LABELS_EXT: Record<string, string> = {
  flash_miss: 'Missing flashing',          wrb_gap: 'WRB seam gap',
  nail_fail: 'Sheathing nailing failure',  water_intr: 'Water intrusion',
  rot: 'Rot found behind WRB',
};

function parseScale(id: string): string {
  const map: Record<string, string> = {
    lt_2: '< 2 LF', '2_4': '~3 LF', '4_8': '~6 LF', '8_16': '~12 LF',
    '16_24': '~20 LF', '24_plus': '24+ LF', full: 'full span',
    lt_4: '< 4 LF', '16_plus': '16+ LF',
    '1': '1 EA', '1_pen': '1 penetration', '5_10': '5–10 EA', '10_plus': '10+ EA',
    full_wall: 'full wall', one_unit: 'one unit', multi_unit: 'multiple units',
    lt_16: '< 16 SF', '16_32': '~24 SF', '32_64': '~48 SF', '64_128': '~96 SF',
    full_elev: 'full elevation', lt_80: '< 80 SF', '80_200': '~140 SF',
    '200_400': '~300 SF', '400_plus': '400+ SF',
    lt_8: '< 8 LF', '8_20': '~14 LF', '20_50': '~35 LF', '50_plus': '50+ LF',
    lt_10: "< 10'", '10_14': "~12'", '14_20': "~17'", '20_30': "~25'", '30_plus': "30'+",
    '1_wall': '1 wall', '2_4_walls': '2–4 walls', floor: 'one floor', multi: 'multiple floors',
    run: 'run of wall', '1_spot': '1 spot', '2_5': '2–5 spots',
    one: '1 member', whole_wall: 'whole wall', '8_16_lf': '8–16 LF', '16_24_lf': '16–24 LF',
  };
  return map[id] ?? id;
}

function locationShort(tag: string): string {
  if (!tag) return 'work area';
  const parts = tag.split('·').map(s => s.trim());
  if (parts.length >= 3) return parts[2];
  return parts[parts.length - 1];
}

function memberLabel(id: string, framingMethod: string | null): string {
  const base: Record<string, string> = {
    '2x_stud': '2x wall stud',         floor_joist: '2x10 floor joist',
    i_joist: 'TJI floor joist',        ceiling_joist: 'ceiling joist',
    rafter: 'rafter',                  roof_truss: 'roof truss',
    header_lvl: 'LVL header',          stringer: 'stair stringer',
    demising_stud: '2x6 demising wall stud',
    shear_stud: 'shear wall stud',
    floor_ceil_asy: 'floor/ceiling assembly member',
  };
  if (framingMethod === 'steel' && id === 'floor_joist') return 'steel bar joist';
  return base[id] ?? id;
}



export function resolveBuildingType(
  homeType: string | null,
  workType: string | null
): BuildingType {
  if (workType === 'wrb' || workType === 'exterior' || workType === 'sheathing') {
    return 'exterior';
  }
  const valid: BuildingType[] = [
    'custom_home', 'track_home', 'townhomes',
    'apartments_mf', 'hotel_hospitality', 'senior_living',
    'commercial', 'exterior',
  ];
  if (homeType && valid.includes(homeType as BuildingType)) {
    return homeType as BuildingType;
  }
  return 'custom_home';
}

export function resolveScenario(reason: string): FlowScenario {
  if (reason === 'damaged_by_others') return 'damage';
  if (reason === 'rework' || reason === 'gc_request') return 'rework';
  return 'addition';
}

// Suppress unused-warning for helpers referenced only inside summarize closures
void STUD_LABELS;
void ADDITION_LABELS;
void ACTION_VERBS;
void REWORK_LABELS;
void memberLabel;

import type { ScopeFlow, BuildingType, FlowScenario } from '@/types/scopeQA';

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
  // TODO(Part 3): apartments_mf, hotel_hospitality, senior_living
  apartments_mf: undefined as any,
  hotel_hospitality: undefined as any,
  senior_living: undefined as any,
  // TODO(Part 3): commercial
  commercial: undefined as any,
  // TODO(Part 4): exterior (envelope-only virtual flow)
  exterior: undefined as any,
};

// track_home shares custom_home flows
(FLOWS as any).track_home = FLOWS.custom_home;

// ─── Temporary helper stubs (replaced in Parts 3/4) ─────────────────────────
const TRADE_LABELS: Record<string, string> = {};
const ACTION_VERBS: Record<string, string> = {};
const ADDITION_LABELS: Record<string, string> = {};
const STUD_LABELS: Record<string, string> = {};
const REWORK_LABELS: Record<string, string> = {};

function parseScale(id: string): string {
  if (!id) return '';
  return id.replace(/_/g, '–');
}

function memberLabel(id: string, _framingMethod: string | null): string {
  return id?.replace(/_/g, ' ') ?? 'member';
}

function locationShort(tag: string): string {
  return tag || 'work area';
}

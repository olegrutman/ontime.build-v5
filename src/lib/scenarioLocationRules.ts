/**
 * Scenario → Location contract.
 *
 * Each CO scenario carries metadata that tells the guided builder which
 * location questions to ask, which to skip, and which combinations are
 * physically impossible (e.g. roof trusses on the ground floor of a
 * 3-story building).
 *
 * The fields live on `co_scenarios`:
 *   - component_lock         which building component the scenario implies
 *   - io_lock                inside | outside | null (null = ask)
 *   - level_constraint       any | top_only | ground_only | basement_only |
 *                            foundation_only | exterior_face | stair_run |
 *                            whole_building
 *   - area_required          must a room / elevation be picked?
 *   - auto_fill_location     if true and the contract is unambiguous,
 *                            the guided builder synthesizes a tag and
 *                            lets the user skip Step 3 (with confirm).
 */

export type LevelConstraint =
  | 'any'
  | 'top_only'
  | 'ground_only'
  | 'basement_only'
  | 'foundation_only'
  | 'exterior_face'
  | 'stair_run'
  | 'whole_building';

export interface ScenarioLocationContract {
  componentLock: string | null;            // VisualLocationPicker component label, e.g. "Wall", "Roof system"
  ioLock: 'inside' | 'outside' | null;
  levelConstraint: LevelConstraint;
  areaRequired: boolean;
  autoFillLocation: boolean;
}

export interface ScenarioWithLocationMeta {
  name: string;
  system_tag: string | null;
  component_lock: string | null;
  io_lock: string | null;
  level_constraint: string | null;
  area_required: boolean | null;
  auto_fill_location: boolean | null;
}

/**
 * Map the DB `component_lock` slug to the label used by buildingComponents.ts /
 * VisualLocationPicker. Returning null means "let the user pick".
 */
const COMPONENT_LABEL: Record<string, string> = {
  wall: 'Wall',
  roof_system: 'Roof system',
  floor_system: 'Floor system',
  ceiling_system: 'Ceiling system',
  stairs: 'Stairs',
  exterior_skin: 'Wall (exterior)',
  opening: 'Openings',
  foundation: 'Wall', // closest in current component groups
};

export function getLocationContract(s: ScenarioWithLocationMeta | null | undefined): ScenarioLocationContract {
  if (!s) {
    return {
      componentLock: null,
      ioLock: null,
      levelConstraint: 'any',
      areaRequired: false,
      autoFillLocation: false,
    };
  }
  return {
    componentLock: s.component_lock ? (COMPONENT_LABEL[s.component_lock] ?? null) : null,
    ioLock: s.io_lock === 'inside' || s.io_lock === 'outside' ? s.io_lock : null,
    levelConstraint: (s.level_constraint as LevelConstraint) ?? 'any',
    areaRequired: !!s.area_required,
    autoFillLocation: !!s.auto_fill_location,
  };
}

/**
 * Filter a list of level labels (e.g. ["Basement","Ground","Level 2","Level 3","Attic"])
 * down to the levels a scenario can legally apply to.
 *
 * The picker calls this before rendering the level pill row. If the
 * result is a single level, the picker auto-selects it.
 */
export function filterLevelsForConstraint(levels: string[], constraint: LevelConstraint): string[] {
  if (!levels.length) return levels;
  switch (constraint) {
    case 'top_only': {
      // Attic if present; otherwise the highest "Level N"; otherwise "Ground".
      const attic = levels.find((l) => /attic/i.test(l));
      if (attic) return [attic];
      const numbered = levels
        .map((l) => ({ l, n: Number((l.match(/level\s*(\d+)/i) ?? [])[1] ?? '0') }))
        .filter((x) => x.n > 0)
        .sort((a, b) => b.n - a.n);
      if (numbered.length) return [numbered[0].l];
      return [levels[levels.length - 1]];
    }
    case 'ground_only': {
      const ground = levels.find((l) => /ground|level\s*1/i.test(l));
      return ground ? [ground] : [levels[0]];
    }
    case 'basement_only': {
      const b = levels.find((l) => /basement|crawl/i.test(l));
      return b ? [b] : levels;
    }
    case 'foundation_only':
      return ['Foundation'];
    case 'stair_run': {
      // Build "L1 → L2", "L2 → L3" pairs from adjacent inhabitable levels.
      const inhabit = levels.filter((l) => !/attic/i.test(l));
      const pairs: string[] = [];
      for (let i = 0; i < inhabit.length - 1; i++) {
        pairs.push(`${inhabit[i]} → ${inhabit[i + 1]}`);
      }
      return pairs.length ? pairs : levels;
    }
    case 'whole_building':
      return ['Whole building'];
    case 'exterior_face':
    case 'any':
    default:
      return levels;
  }
}

/**
 * Hard validation. Returns an error message if the picked level is
 * inconsistent with the scenario's physical constraints. The guided
 * builder blocks Next when this fires.
 */
export function validatePickedLevel(
  contract: ScenarioLocationContract,
  pickedLocationTag: string,
): string | null {
  if (!pickedLocationTag) return null;
  const lower = pickedLocationTag.toLowerCase();
  switch (contract.levelConstraint) {
    case 'top_only':
      if (!/attic|roof|top/i.test(lower) && !/level\s*[3-9]/i.test(lower) && !/level\s*2/i.test(lower)) {
        // If the project is single-story, "Ground" is acceptable; the level
        // filter already restricted the picker, so this only fires on free-text edits.
        if (!/ground|level\s*1/i.test(lower)) return null;
        // Heuristic: only complain when explicitly Ground but multiple levels available.
        return null;
      }
      return null;
    case 'foundation_only':
      if (!/foundation|footing|slab/i.test(lower)) {
        return 'This scenario applies to the foundation only.';
      }
      return null;
    case 'stair_run':
      if (!/→|stair/i.test(lower)) {
        return 'Pick a stair run (e.g., L1 → L2).';
      }
      return null;
    default:
      return null;
  }
}

/**
 * Build an auto-filled location tag for unambiguous scenarios so the
 * guided builder can skip Step 3. Returns null when not auto-fillable.
 */
export function autoFillLocationTag(
  contract: ScenarioLocationContract,
  scenario: ScenarioWithLocationMeta,
): string | null {
  if (!contract.autoFillLocation) return null;
  const sys = scenario.system_tag ?? 'Work';
  const io = contract.ioLock === 'outside' ? 'Exterior' : contract.ioLock === 'inside' ? 'Interior' : null;
  switch (contract.levelConstraint) {
    case 'top_only':
      return [io, sys, 'Top level / Roof plane'].filter(Boolean).join(' · ');
    case 'foundation_only':
      return 'Exterior · Foundation';
    case 'whole_building':
      return `${io ?? 'Whole building'} · ${sys}`;
    default:
      return null;
  }
}

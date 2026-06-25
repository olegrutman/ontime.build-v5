import type { PickerItem } from './types';
import { locationDisplay } from './types';

/**
 * Map catalog category_id → SystemOption.id used in Step 1 ("Where & Why").
 * Used both for mismatch detection and for picking a fallback noun when the
 * user's chosen System contradicts the items they selected.
 */
export const CATEGORY_TO_SYSTEM: Record<string, string> = {
  walls: 'wall',
  floors: 'floor',
  stairs: 'stair',
  openings: 'openings',
  deck_pergola_fence: 'deck',
  siding_trim: 'exterior',
  membrane: 'exterior',
  flashing: 'exterior',
  soffits: 'ceiling',
  enclosures: 'wall',
  shear_lateral: 'wall',
  shear_structural: 'wall',
  beams: 'floor',
  ceiling_finish: 'ceiling',
  wall_finish: 'wall',
};

function lower(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function joinAnd(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1];
}

/**
 * Real-world scope sentence: lead with the work, frame the cause as a
 * "per <cause>" clause, and skip the system label (it often contradicts the
 * selected items — see mismatch banner in Step 2 for the prevention path).
 *
 * Examples
 *   Per plan revision, reframe existing wall at Main Floor.
 *   Per field conflict, install new header and add blocking at 2nd Floor.
 *   Scope at Main Floor. (when nothing yet selected)
 */
export function buildNarrativeFromItem(item: PickerItem): string {
  const loc = locationDisplay(item);
  const verbs = [...item.workTypes]
    .map(k => item.workNames[k])
    .filter(Boolean)
    .map(lower);

  if (verbs.length === 0 && !item.causeName) return '';
  if (verbs.length === 0) {
    return `${item.causeName ?? 'Scope'} at ${loc}.`;
  }

  const actions = joinAnd(verbs);
  const prefix = item.causeName ? `Per ${lower(item.causeName)}, ` : '';
  return `${prefix}${actions} at ${loc}.`;
}

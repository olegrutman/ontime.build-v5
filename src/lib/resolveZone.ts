import type { Zone } from '@/types/catalog';

/**
 * Resolve a `Zone` from a VisualLocationPicker tag string.
 *
 * Tag format produced by the picker is middle-dot separated, e.g.:
 *   "Interior · L2 · Master Bath · Floor joists"
 *   "Exterior · North elevation · Window opening"
 *   "Exterior · Roof · Valley"
 *
 * Rule order (first match wins). This matches the Phase 1 spec's
 * resolution priority: structural > exterior subtypes > basement >
 * attic/roof > stairs > openings > floor > ceiling > interior wall.
 */
export function resolveZoneFromLocationTag(tag: string | null | undefined): Zone | null {
  if (!tag) return null;
  const lower = tag.toLowerCase();

  // 1. Exterior + sub-zone wins over structural-keyword detection.
  //    Tags like "Exterior · Roof system · Roof trusses · East elevation"
  //    must resolve to 'roof' even though "truss" appears in the tag.
  const isExterior = lower.startsWith('exterior') || /\bexterior\b/.test(lower);
  if (isExterior) {
    if (/(roof|valley|ridge|eave|gable|rake|fascia|soffit)/.test(lower)) return 'roof';
    if (/(deck|pergola|porch|balcony|fence)/.test(lower)) return 'deck';
    if (/(window|door|skylight|opening|penetration)/.test(lower)) return 'envelope_opening';
    if (/(foundation|footing)/.test(lower)) return 'foundation';
    return 'exterior_wall';
  }

  // 2. Structural members (interior context) — only checked after location.
  if (/(beam|column|joist|rafter|truss|header|lvl|girder|stringer|post|footing)/.test(lower)) {
    return 'structural';
  }

  // 3. Basement / foundation (interior context)
  if (/(basement|crawl\s*space|slab)/.test(lower)) return 'basement';
  if (/(foundation|footing)/.test(lower)) return 'foundation';

  // 4. Attic implies roof
  if (/\battic\b/.test(lower)) return 'roof';

  // 5. Stairs
  if (/(stair|stringer|landing|handrail)/.test(lower)) return 'stairs';

  // 6. Openings (interior side — door / window / skylight)
  if (/(window|skylight|exterior\s*door)/.test(lower)) return 'envelope_opening';

  // 7. Floor
  if (/(floor|subfloor|joist)/.test(lower)) return 'interior_floor';

  // 8. Ceiling
  if (/(ceiling|drop\s*ceiling)/.test(lower)) return 'interior_ceiling';

  // 9. Default to interior wall
  return 'interior_wall';
}

/**
 * Phase 1 catalog types — replaces the legacy hardcoded SCOPE_CATALOG and
 * the older work_order_catalog table as the source of truth for the
 * Change Order / Work Order scope picker.
 */

/**
 * Zone slug derived from VisualLocationPicker output. Matches the
 * `applicable_zone` column in catalog_definitions.
 *
 * `'any'` items apply to every zone.  A `null` value (no zone resolved
 * yet) also matches any zone — we treat it as a wildcard so the user
 * still sees a useful pick list before they pin down a zone.
 */
export type Zone =
  | 'any'
  | 'interior_wall'
  | 'interior_floor'
  | 'interior_ceiling'
  | 'stairs'
  | 'exterior_wall'
  | 'roof'
  | 'deck'
  | 'envelope_opening'
  | 'structural'
  | 'foundation'
  | 'basement';

export interface CatalogDefinition {
  id: string;
  slug: string;
  kind: string;
  is_platform: boolean;
  org_id: string | null;
  canonical_name: string;
  division: string;
  category: string;
  unit: string;
  tag: string | null;
  applicable_zone: string | null;
  applicable_work_types: string[];
  applicable_reasons: string[];
  search_text: string | null;
  aliases: string[];
  sort_order: number | null;
  deprecated_at: string | null;
  superseded_by: string | null;
  created_at: string;
}

/**
 * categoryFunnels.ts
 *
 * Per-category routing config for the SmartPicker. Replaces runtime
 * field-discovery with hand-tuned funnels based on measured fill rates.
 *
 * Three patterns:
 *   - 'structured' — walk a short fixed funnel (2-3 attribute steps)
 *   - 'hybrid'     — one structured step (usually secondary category)
 *                    then a terminal product list / search
 *   - 'search'     — skip funnel entirely, terminal list + search
 */

export type FunnelPattern = 'structured' | 'hybrid' | 'search';

export interface CategoryFunnel {
  /** The enum value stored in catalog_items.category */
  dbCategory: string;
  /** Display name shown on the category grid */
  displayName: string;
  /** Emoji/icon for the category card */
  icon: string;
  /** Routing pattern for this category */
  pattern: FunnelPattern;
  /**
   * Attribute columns to funnel through, in order.
   * Only used when pattern = 'structured' or 'hybrid'.
   */
  funnelFields?: string[];
  /** For 'hybrid' pattern: which single step runs before search. */
  hybridStep?: 'secondary_category' | 'manufacturer';
  /** Allowed secondary_category values. Optional allowlist. */
  secondaryAllowlist?: string[];
}

export const CATEGORY_FUNNELS: Record<string, CategoryFunnel> = {
  FRAMING_LUMBER: {
    dbCategory: 'FramingLumber',
    displayName: 'Framing Lumber',
    icon: '🪵',
    pattern: 'structured',
    funnelFields: ['dimension', 'length', 'wood_species'],
  },
  FINISH_LUMBER: {
    dbCategory: 'FinishLumber',
    displayName: 'Finish Lumber',
    icon: '🪚',
    pattern: 'structured',
    funnelFields: ['dimension', 'length', 'wood_species'],
  },
  DECKING: {
    dbCategory: 'Decking',
    displayName: 'Decking',
    icon: '🏡',
    pattern: 'structured',
    funnelFields: ['manufacturer', 'color', 'length'],
  },
  SHEATHING: {
    dbCategory: 'Sheathing',
    displayName: 'Sheathing & Plywood',
    icon: '📦',
    pattern: 'structured',
    funnelFields: ['dimension', 'thickness'],
  },
  EXTERIOR: {
    dbCategory: 'Exterior',
    displayName: 'Exterior Trim',
    icon: '🏠',
    pattern: 'hybrid',
    hybridStep: 'secondary_category',
  },
  ENGINEERED: {
    dbCategory: 'Engineered',
    displayName: 'Engineered Wood',
    icon: '📐',
    pattern: 'hybrid',
    hybridStep: 'secondary_category',
  },
  DRYWALL: {
    dbCategory: 'Drywall',
    displayName: 'Drywall',
    icon: '📋',
    pattern: 'hybrid',
    hybridStep: 'secondary_category',
  },
  HARDWARE: {
    dbCategory: 'Hardware',
    displayName: 'Hardware',
    icon: '🔩',
    pattern: 'search',
  },
  FRAMING_ACCESSORIES: {
    dbCategory: 'FramingAccessories',
    displayName: 'Framing Accessories',
    icon: '🔧',
    pattern: 'search',
  },
  STRUCTURAL: {
    dbCategory: 'Structural',
    displayName: 'Structural Steel',
    icon: '🏗️',
    pattern: 'search',
  },
  OTHER: {
    dbCategory: 'Other',
    displayName: 'Other Lumber',
    icon: '📦',
    pattern: 'search',
  },
};

/**
 * Helper: given a category key, decide the first screen the picker
 * should show.
 */
export function initialStepFor(categoryKey: string): 'funnel' | 'search' | 'secondary' {
  const config = CATEGORY_FUNNELS[categoryKey];
  if (!config) return 'search';
  if (config.pattern === 'search') return 'search';
  if (config.pattern === 'hybrid') return 'secondary';
  return 'funnel';
}

/** Friendly labels for funnel field names. */
export const FIELD_LABELS: Record<string, string> = {
  dimension: 'Dimension',
  length: 'Length',
  wood_species: 'Wood Species',
  manufacturer: 'Manufacturer',
  color: 'Color',
  thickness: 'Thickness',
  finish: 'Finish',
  secondary_category: 'Type',
};

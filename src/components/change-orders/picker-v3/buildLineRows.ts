import type { PickerItem } from './types';
import { buildNarrativeFromItem } from './narrative';

export interface LineRow {
  item_name: string;
  description: string | null;
  unit: string;
  sort_order: number;
  location_tag: string | null;
  reason: string | null;
  task_phase: 'labor' | 'materials' | 'equipment';
  group_key: string;
}

/**
 * Break one picker item into SOV-style LABOR line rows only.
 *   • One Labor line per Work Type per Location.
 *   • Materials and Equipment are NOT line items — they live in their own
 *     sections on the CO/WO detail page. The `materialsNeeded` /
 *     `equipmentNeeded` flags are surfaced separately (procurement panel).
 *   • Falls back to a single bundled labor row when no work types were selected.
 *   • If the user typed an optional "extra labor description" (item.narrative),
 *     it's appended to each labor line's description.
 */
export function buildLineRowsFromItem(
  item: PickerItem,
  startingSortOrder: number,
  itemIndex: number = 0,
): LineRow[] {
  const rows: LineRow[] = [];
  const fallbackNarrative = item.narrative?.trim() || buildNarrativeFromItem(item);
  const extra = item.narrative?.trim() ?? '';
  const reason = item.reason ?? null;
  const locations = item.locations.length > 0 ? item.locations : ['—'];
  const workTypeIds = Array.from(item.workTypes);
  const groupKey = `picker-item-${itemIndex}`;

  let sort = startingSortOrder;

  // No work types: keep the existing single-row behavior so we never lose data.
  if (workTypeIds.length === 0) {
    rows.push({
      item_name: (fallbackNarrative?.substring(0, 120) || item.causeName || 'Scope item'),
      description: fallbackNarrative || null,
      unit: 'EA',
      sort_order: sort++,
      location_tag: item.locations.join(' + ') || null,
      reason,
      task_phase: 'labor',
      group_key: groupKey,
    });
    return rows;
  }

  for (const loc of locations) {
    for (const wtId of workTypeIds) {
      const wtName = item.workNames[wtId] ?? wtId;
      const locLabel = loc === '—' ? '' : ` — ${loc}`;
      const extraSuffix = extra ? `\n\n${extra}` : '';

      // Labor only — materials & equipment live in their own detail-page sections.
      rows.push({
        item_name: `Labor — ${wtName}${locLabel}`,
        description: `Labor to ${wtName.toLowerCase()}${locLabel.toLowerCase()}.${extraSuffix}`,
        unit: 'HRS',
        sort_order: sort++,
        location_tag: loc === '—' ? null : loc,
        reason,
        task_phase: 'labor',
        group_key: groupKey,
      });
    }
  }

  return rows;
}

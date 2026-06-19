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
 * Break one picker item into SOV-style line rows:
 *   • One Labor line per Work Type per Location
 *   • Optional Materials and Equipment lines per Work Type per Location
 * Falls back to a single bundled row when no work types were selected.
 */
export function buildLineRowsFromItem(
  item: PickerItem,
  startingSortOrder: number,
  itemIndex: number = 0,
): LineRow[] {
  const rows: LineRow[] = [];
  const narrative = item.narrative?.trim() || buildNarrativeFromItem(item);
  const reason = item.reason ?? null;
  const locations = item.locations.length > 0 ? item.locations : ['—'];
  const workTypeIds = Array.from(item.workTypes);
  const groupKey = `picker-item-${itemIndex}`;

  let sort = startingSortOrder;

  // No work types: keep the existing single-row behavior so we never lose data.
  if (workTypeIds.length === 0) {
    rows.push({
      item_name: (narrative?.substring(0, 120) || item.causeName || 'Scope item'),
      description: narrative || null,
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
      const contextSuffix = narrative ? `\n\n${narrative}` : '';

      // Labor line (always)
      rows.push({
        item_name: `Labor — ${wtName}${locLabel}`,
        description: `Labor to ${wtName.toLowerCase()}${locLabel.toLowerCase()}.${contextSuffix}` || null,
        unit: 'HRS',
        sort_order: sort++,
        location_tag: loc === '—' ? null : loc,
        reason,
        task_phase: 'labor',
        group_key: groupKey,
      });

      // Materials line (if flagged)
      if (item.materialsNeeded) {
        rows.push({
          item_name: `Materials — ${wtName}${locLabel}`,
          description: `Materials for ${wtName.toLowerCase()}${locLabel.toLowerCase()}. Procured by ${item.materialResponsible}.`,
          unit: 'LS',
          sort_order: sort++,
          location_tag: loc === '—' ? null : loc,
          reason,
          task_phase: 'materials',
          group_key: groupKey,
        });
      }

      // Equipment line (if flagged)
      if (item.equipmentNeeded) {
        rows.push({
          item_name: `Equipment — ${wtName}${locLabel}`,
          description: `Equipment for ${wtName.toLowerCase()}${locLabel.toLowerCase()}. Provided by ${item.equipmentResponsible}.`,
          unit: 'DAY',
          sort_order: sort++,
          location_tag: loc === '—' ? null : loc,
          reason,
          task_phase: 'equipment',
          group_key: groupKey,
        });
      }
    }
  }

  return rows;
}

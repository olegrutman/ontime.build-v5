import type { PickerItem } from './types';
import { locationDisplay } from './types';

export function buildNarrativeFromItem(item: PickerItem): string {
  if (!item.causeName || item.workTypes.size === 0) {
    // Fallback when missing data
    const loc = locationDisplay(item);
    const verbs = [...item.workTypes].map(k => item.workNames[k]).filter(Boolean);
    if (verbs.length === 0 && !item.causeName) return '';
    const actions = verbs.length === 0
      ? 'perform the required work'
      : verbs.map(v => v.toLowerCase()).join(', ');
    return `${item.causeName ?? 'Scope'} at ${loc}. We'll ${actions}.`;
  }
  const loc = locationDisplay(item);
  const sys = item.systemName?.toLowerCase() ?? 'area';
  const verbs = [...item.workTypes].map(k => item.workNames[k]).filter(Boolean);
  const actions = verbs.length === 1
    ? verbs[0].toLowerCase()
    : verbs.slice(0, -1).map(v => v.toLowerCase()).join(', ') + ', and ' + verbs[verbs.length - 1].toLowerCase();
  return `${item.causeName} needs work in the ${sys} at ${loc}. We'll ${actions}, and leave the area ready for the next trade.`;
}

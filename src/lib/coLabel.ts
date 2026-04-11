/**
 * Returns "Work Order" / "Work Orders" for T&M projects,
 * "Change Order" / "Change Orders" for fixed-contract projects.
 */
export function coLabel(isTM: boolean, plural = false): string {
  if (isTM) return plural ? 'Work Orders' : 'Work Order';
  return plural ? 'Change Orders' : 'Change Order';
}

export function coAbbrev(isTM: boolean, plural = false): string {
  if (isTM) return plural ? 'WOs' : 'WO';
  return plural ? 'COs' : 'CO';
}

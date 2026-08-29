/**
 * Crew workload math: crew_size × days × hours_per_day = total hours.
 * Shared by the labor entry form (input) and the entry list (display) so the
 * two can never disagree on the total.
 */

export interface CrewWorkload {
  crew_size?: number | null;
  days?: number | null;
  hours_per_day?: number | null;
  hours?: number | null;
  pricing_mode?: string | null;
}

export function fmtHours(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Total hours from crew math, or 0 when any factor is missing/non-positive. */
export function computeCrewHours(crew: number, days: number, hoursPerDay: number): number {
  if (!(crew > 0) || !(days > 0) || !(hoursPerDay > 0)) return 0;
  return crew * days * hoursPerDay;
}

export function hasCrewMath(entry: CrewWorkload): boolean {
  return entry.crew_size != null && entry.days != null && entry.hours_per_day != null;
}

/** Compact list rendering, e.g. "6×10×8=480.0". */
export function formatWorkload(entry: CrewWorkload): string {
  if (entry.pricing_mode === 'lump_sum') return '—';
  if (hasCrewMath(entry)) {
    return `${entry.crew_size}×${entry.days}×${entry.hours_per_day}=${fmtHours(entry.hours ?? 0)}`;
  }
  return `${entry.hours ?? 0}`;
}

/** Long-form tooltip, e.g. "6 men × 10 days × 8 hr/day = 480.0 hrs". */
export function formatWorkloadTooltip(entry: CrewWorkload): string | null {
  if (entry.pricing_mode === 'lump_sum') return null;
  if (!hasCrewMath(entry)) return null;
  return `${entry.crew_size} men × ${entry.days} days × ${entry.hours_per_day} hr/day = ${fmtHours(entry.hours ?? 0)} hrs`;
}

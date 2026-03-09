/**
 * Industry-standard duration estimates for residential wood-frame construction tasks.
 * Returns estimated duration in business days based on task name pattern matching.
 * Uses value amount as a secondary signal (higher value → longer duration within range).
 */

interface DurationRule {
  pattern: RegExp;
  minDays: number;
  maxDays: number;
}

const DURATION_RULES: DurationRule[] = [
  { pattern: /walls?\s*frame|framing\s*walls?/i, minDays: 3, maxDays: 5 },
  { pattern: /wall\s*sheathing/i, minDays: 2, maxDays: 3 },
  { pattern: /roof\s*truss\s*sheathing/i, minDays: 2, maxDays: 3 },
  { pattern: /roof\s*truss/i, minDays: 3, maxDays: 3 },
  { pattern: /truss\s*sheathing/i, minDays: 2, maxDays: 3 },
  { pattern: /truss/i, minDays: 2, maxDays: 3 },
  { pattern: /backout|blocking/i, minDays: 2, maxDays: 2 },
  { pattern: /hardware/i, minDays: 1, maxDays: 2 },
  { pattern: /shim\s*(and|&)\s*shave/i, minDays: 2, maxDays: 2 },
  { pattern: /inspection|inspect/i, minDays: 1, maxDays: 1 },
  { pattern: /punch/i, minDays: 1, maxDays: 2 },
  { pattern: /tyvek|house\s*wrap/i, minDays: 2, maxDays: 3 },
  { pattern: /window/i, minDays: 3, maxDays: 5 },
  { pattern: /siding/i, minDays: 3, maxDays: 5 },
  { pattern: /pool/i, minDays: 5, maxDays: 5 },
  { pattern: /drywall/i, minDays: 3, maxDays: 5 },
  { pattern: /paint/i, minDays: 2, maxDays: 4 },
  { pattern: /plumb/i, minDays: 2, maxDays: 4 },
  { pattern: /electric/i, minDays: 2, maxDays: 4 },
  { pattern: /hvac/i, minDays: 2, maxDays: 3 },
  { pattern: /insulation/i, minDays: 2, maxDays: 3 },
  { pattern: /foundation|concrete|slab/i, minDays: 3, maxDays: 5 },
  { pattern: /roof(?!.*truss)/i, minDays: 3, maxDays: 5 },
  { pattern: /floor/i, minDays: 2, maxDays: 4 },
  { pattern: /trim|finish/i, minDays: 2, maxDays: 4 },
  { pattern: /demo|demolition/i, minDays: 1, maxDays: 3 },
  { pattern: /clean/i, minDays: 1, maxDays: 2 },
];

const DEFAULT_MIN = 2;
const DEFAULT_MAX = 3;

/**
 * Estimate the duration in business days for a construction task.
 * @param taskName - The name/title of the task
 * @param valueAmount - The dollar value of the task (higher value → longer duration within the range)
 * @returns Estimated business days
 */
export function estimateDuration(taskName: string, valueAmount: number = 0): number {
  const rule = DURATION_RULES.find(r => r.pattern.test(taskName));
  const min = rule?.minDays ?? DEFAULT_MIN;
  const max = rule?.maxDays ?? DEFAULT_MAX;

  if (min === max) return min;

  // Use value as a rough scale: < $5k → min, > $20k → max, interpolate between
  const t = Math.min(1, Math.max(0, (valueAmount - 5000) / 15000));
  return Math.round(min + t * (max - min));
}

/**
 * Add business days to a date (skips weekends).
 */
export function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

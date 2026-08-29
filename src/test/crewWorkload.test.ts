import { describe, it, expect } from 'vitest';
import {
  computeCrewHours,
  formatWorkload,
  formatWorkloadTooltip,
  hasCrewMath,
} from '@/lib/crewWorkload';

describe('crew workload math', () => {
  it('multiplies crew × days × hours per day', () => {
    expect(computeCrewHours(6, 10, 8)).toBe(480);
    expect(computeCrewHours(2, 10, 8)).toBe(160);
    expect(computeCrewHours(1, 0.5, 8)).toBe(4);
  });

  it('returns 0 when any factor is missing or non-positive', () => {
    expect(computeCrewHours(0, 10, 8)).toBe(0);
    expect(computeCrewHours(6, 0, 8)).toBe(0);
    expect(computeCrewHours(6, 10, 0)).toBe(0);
    expect(computeCrewHours(-6, 10, 8)).toBe(0);
  });

  it('keeps billable total consistent with crew hours × rate', () => {
    const hours = computeCrewHours(6, 10, 8);
    expect(hours * 65).toBe(31200); // matches DB line_total for the E2E probe
  });
});

describe('workload formatting', () => {
  const crewEntry = { crew_size: 6, days: 10, hours_per_day: 8, hours: 480, pricing_mode: 'hourly' };

  it('renders the full formula, not just flat hours', () => {
    expect(formatWorkload(crewEntry)).toBe('6×10×8=480.0');
    expect(formatWorkloadTooltip(crewEntry)).toBe('6 men × 10 days × 8 hr/day = 480.0 hrs');
    expect(hasCrewMath(crewEntry)).toBe(true);
  });

  it('falls back to flat hours when crew fields are absent (legacy entries)', () => {
    const legacy = { crew_size: null, days: null, hours_per_day: null, hours: 12, pricing_mode: 'hourly' };
    expect(formatWorkload(legacy)).toBe('12');
    expect(formatWorkloadTooltip(legacy)).toBeNull();
    expect(hasCrewMath(legacy)).toBe(false);
  });

  it('shows a dash for lump-sum entries', () => {
    expect(formatWorkload({ ...crewEntry, pricing_mode: 'lump_sum' })).toBe('—');
    expect(formatWorkloadTooltip({ ...crewEntry, pricing_mode: 'lump_sum' })).toBeNull();
  });
});

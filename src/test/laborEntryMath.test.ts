import { describe, expect, it } from 'vitest';
import { actualEntryBaseCost, calculateLaborEntryAmount } from '@/lib/laborEntryMath';

describe('labor entry math', () => {
  it('uses 30h × $45 = $1,350 for private actual cost, never the 15% marked-up amount', () => {
    const result = calculateLaborEntryAmount({ mode: 'hourly', hours: 30, rate: 45, isTC: true, isActualCost: true, markupPercent: 15 });
    expect(result.total).toBe(1350);
    expect(result.effectiveMarkup).toBe(0);
    expect(result.effectiveRate).toBe(45);
    expect(actualEntryBaseCost({ pricing_mode: 'hourly', hours: 30, base_hourly_rate: 45, line_total: 1552.50 })).toBe(1350);
  });

  it('keeps 15% markup on a $1,500 TC billable flat rate', () => {
    const result = calculateLaborEntryAmount({ mode: 'lump_sum', lumpSum: 1500, isTC: true, isActualCost: false, markupPercent: 15 });
    expect(result.baseTotal).toBe(1500);
    expect(result.markupAmount).toBe(225);
    expect(result.total).toBe(1725);
  });

  it('uses the same rounded effective rate for hourly preview and saving', () => {
    const result = calculateLaborEntryAmount({ mode: 'hourly', hours: 50, rate: 65, isTC: true, isActualCost: false, markupPercent: 15 });
    expect(result.effectiveRate).toBe(74.75);
    expect(result.total).toBe(3737.50);
    expect(result.markupAmount).toBe(487.50);
  });
});

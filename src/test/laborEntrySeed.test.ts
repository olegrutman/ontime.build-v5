import { describe, it, expect } from 'vitest';
import { seedFromEntry, seedForNewEntry, billableFromBase } from '@/lib/laborEntrySeed';

describe('labor entry seeding', () => {
  it('keeps the entry rate/markup when editing, ignoring settings defaults', () => {
    const seed = seedFromEntry({
      base_hourly_rate: 62.5,
      hourly_rate: 68.75,
      markup_percent: 10,
    });
    expect(seed.rate).toBe('62.5');
    expect(seed.markup).toBe('10');
  });

  it('re-saving an edited entry reproduces the same billable rate', () => {
    const stored = { base_hourly_rate: 62.5, hourly_rate: 68.75, markup_percent: 10 };
    const seed = seedFromEntry(stored);
    const resaved = billableFromBase(parseFloat(seed.rate), parseFloat(seed.markup));
    expect(resaved).toBeCloseTo(stored.hourly_rate, 2);
  });

  it('falls back to billable rate for legacy entries with no base stored', () => {
    expect(seedFromEntry({ hourly_rate: 55 }).rate).toBe('55');
    expect(seedFromEntry({ hourly_rate: 55 }).markup).toBe('');
  });

  it('seeds lump sum from the base amount', () => {
    expect(seedFromEntry({ base_lump_sum: 4000, lump_sum: 4400 }).lumpSum).toBe('4000');
  });

  it('applies settings defaults only for new entries', () => {
    expect(seedForNewEntry({ orgRate: 75, orgMarkup: 15, isTC: true })).toEqual({
      rate: '75', lumpSum: '', markup: '15',
    });
    expect(seedForNewEntry({ orgRate: null, profileRate: 40, orgMarkup: 15, isTC: false }).rate).toBe('40');
    expect(seedForNewEntry({ orgRate: 75, orgMarkup: 15, isTC: false }).markup).toBe('');
  });
});

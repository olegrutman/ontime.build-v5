import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  update: vi.fn(),
  insert: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: async () => ({ data: state.rows, error: null }) }),
      update: (values: unknown) => {
        state.update(values);
        return { eq: async () => ({ error: null }) };
      },
      insert: (values: unknown) => {
        state.insert(values);
        return Promise.resolve({ error: null });
      },
    }),
  },
}));

import { materializeCrewPricing } from '@/lib/coSubmitPrep';

const crewEntry = (id: string, hours: number, cost: number, status = 'approved') => ({
  id,
  co_line_item_id: 'item-1',
  org_id: 'crew',
  entered_by_role: 'FC',
  is_actual_cost: false,
  pricing_mode: 'hourly',
  hours,
  lump_sum: null,
  line_total: cost,
  crew_review_status: status,
});

const derivedRow = (isActualCost: boolean) => ({
  id: isActualCost ? 'derived-cost' : 'derived-price',
  co_line_item_id: 'item-1',
  org_id: 'subcontractor',
  entered_by_role: 'TC',
  is_actual_cost: isActualCost,
  pricing_mode: isActualCost ? 'lump_sum' : 'hourly',
  hours: isActualCost ? null : 8,
  lump_sum: isActualCost ? 200 : null,
  line_total: isActualCost ? 200 : 440,
  crew_review_status: null,
  crew_pricing_derived: true,
  source_fc_entry_ids: ['crew-a'],
});

describe('crew-derived upstream price materialization', () => {
  beforeEach(() => {
    state.rows = [];
    state.update.mockReset();
    state.insert.mockReset();
  });

  it('refreshes an existing $440 derived row to $660 when 4 more hours are approved', async () => {
    state.rows = [crewEntry('crew-a', 8, 200), crewEntry('crew-b', 4, 100), derivedRow(false), derivedRow(true)];

    await materializeCrewPricing({ coId: 'order', orgId: 'subcontractor', hourlyRate: 50, markupPercent: 10, pricingType: 'tm' });

    expect(state.update).toHaveBeenCalledWith(expect.objectContaining({
      hours: 12,
      hourly_rate: 55,
      source_fc_entry_ids: ['crew-a', 'crew-b'],
    }));
    expect(state.update).toHaveBeenCalledWith(expect.objectContaining({
      base_lump_sum: 300,
      lump_sum: 300,
      source_fc_entry_ids: ['crew-a', 'crew-b'],
    }));
    expect(state.insert).not.toHaveBeenCalled();
  });

  it('does not materialize a partial price while another crew entry is pending', async () => {
    state.rows = [crewEntry('crew-a', 8, 200), crewEntry('crew-b', 4, 100, 'pending'), derivedRow(false), derivedRow(true)];

    await materializeCrewPricing({ coId: 'order', orgId: 'subcontractor', hourlyRate: 50, markupPercent: 10, pricingType: 'tm' });

    expect(state.update).not.toHaveBeenCalled();
    expect(state.insert).not.toHaveBeenCalled();
  });

  it('materializes only the crew-priced item on a mixed-method order', async () => {
    state.rows = [
      crewEntry('crew-a', 8, 200),
      { ...crewEntry('crew-b', 4, 100), co_line_item_id: 'item-2' },
    ];

    await materializeCrewPricing({
      coId: 'order', orgId: 'subcontractor', hourlyRate: 50, markupPercent: 10, pricingType: 'tm',
      items: [
        { id: 'item-1', labor_pricing_method: 'crew' },
        { id: 'item-2', labor_pricing_method: 'manual' },
      ],
      useFcPricingBase: false,
    });

    expect(state.insert).toHaveBeenCalledTimes(2);
    expect(state.insert.mock.calls.every(([values]) => (values as { co_line_item_id: string }).co_line_item_id === 'item-1')).toBe(true);
    expect(state.insert).toHaveBeenCalledWith(expect.objectContaining({ hours: 8, hourly_rate: 55 }));
    expect(state.update).not.toHaveBeenCalled();
  });

  it('preserves an independently entered subcontractor price and private cost', async () => {
    state.rows = [
      crewEntry('crew-a', 8, 200),
      { ...derivedRow(false), crew_pricing_derived: false, line_total: 900 },
      { ...derivedRow(true), crew_pricing_derived: false, line_total: 250 },
    ];

    await materializeCrewPricing({ coId: 'order', orgId: 'subcontractor', hourlyRate: 50, markupPercent: 10, pricingType: 'tm' });

    expect(state.update).not.toHaveBeenCalled();
    expect(state.insert).not.toHaveBeenCalled();
  });
});

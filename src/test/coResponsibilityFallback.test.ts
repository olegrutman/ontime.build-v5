import { describe, it, expect } from 'vitest';
import { aggregateCOTotals, type COLike, type COLineRow } from '@/hooks/coAggregation';

/**
 * The responsibility fallback must mirror the DB function `co_grand_total`:
 *  - materials: first NON-Owner contract with a non-null responsibility
 *  - equipment: no contract fallback at all — always defaults to 'TC'
 *
 * The old client code picked "any TC↔GC row", which on a re-invited project
 * grabbed a stale `Invited` duplicate whose responsibility is NULL, and it also
 * reused the material value for equipment.
 */

const TC = 'tc-org';
const GC = 'gc-org';

const co: COLike = {
  id: 'co1',
  status: 'approved',
  document_type: 'CO',
  tc_submitted_price: 513.75,
  materials_responsible: null,
  equipment_responsible: null,
};

const labor: COLineRow[] = [
  { id: 'l1', co_id: 'co1', org_id: TC, entered_by_role: 'TC', is_actual_cost: false, line_total: 373.75 },
];
const materials: COLineRow[] = [
  { co_id: 'co1', org_id: GC, billed_amount: 4824, line_cost: 4824 },
];
const equipment: COLineRow[] = [
  { co_id: 'co1', org_id: TC, billed_amount: 140, cost: 125 },
];

describe('CO responsibility fallback matches co_grand_total', () => {
  it('equipment falls back to TC even when materials are the GC', () => {
    const agg = aggregateCOTotals(co ? [co] : [], labor, materials, equipment, TC, false, {
      materials: 'GC',
      equipment: null,
    });
    // Labor 373.75 + TC-owned equipment 140 = the frozen 513.75 snapshot,
    // and the GC-owned material row is not TC revenue.
    expect(agg.approvedCORevenue).toBeCloseTo(513.75, 2);
    expect(agg.approvedCostBreakdown.equipment).toBeCloseTo(125, 2);
    expect(agg.approvedCostBreakdown.materials).toBe(0);
  });

  it('a stale NULL responsibility must not swallow equipment revenue', () => {
    const stale = aggregateCOTotals([co], labor, materials, equipment, TC, false, {
      materials: null,
      equipment: null,
    });
    expect(stale.approvedCORevenue).toBeCloseTo(513.75, 2);
  });

  it('GC sees the CO as a cost: owed to TC plus its own procurement', () => {
    const agg = aggregateCOTotals(
      [{ ...co, gc_budget: 750, passed_to_owner: true }],
      labor, materials, equipment, TC, true,
      { materials: 'GC', equipment: null },
    );
    expect(agg.approvedCORevenue).toBe(750); // owner price only
    expect(agg.approvedCOCost).toBeCloseTo(513.75 + 4824, 2);
  });
});

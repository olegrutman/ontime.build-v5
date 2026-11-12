import { describe, expect, it } from 'vitest';
import { aggregateCOTotals, type COLike } from '@/hooks/coAggregation';

const TC = 'tc';
const GC = 'gc';
const FC = 'fc';
const partial: COLike = {
  id: 'co-partial', org_id: TC, assigned_to_org_id: GC, created_by_role: 'TC',
  status: 'approved', document_type: 'WO', tc_submitted_price: 1500, approved_amount: 1000,
};

describe('approved-only CO/WO financial aggregation', () => {
  it('uses the final approved amount for subcontractor revenue instead of rejected labor', () => {
    const totals = aggregateCOTotals([partial], [
      { co_id: partial.id, org_id: TC, line_total: 1000, co_line_items: { approval_status: 'approved' } },
      { co_id: partial.id, org_id: TC, line_total: 500, co_line_items: { approval_status: 'rejected' } },
    ], [], [], TC, false);
    expect(totals.approvedCORevenue).toBe(1000);
  });

  it('uses the final approved amount for general contractor cost', () => {
    const totals = aggregateCOTotals([partial], [
      { co_id: partial.id, org_id: TC, line_total: 1000, co_line_items: { approval_status: 'approved' } },
      { co_id: partial.id, org_id: TC, line_total: 500, co_line_items: { approval_status: 'rejected' } },
    ], [], [], TC, true);
    expect(totals.approvedCOCost).toBe(1000);
  });

  it('keeps the whole-order approved amount private from crew revenue', () => {
    const crewOrder: COLike = { ...partial, org_id: TC, created_by_role: 'FC', originating_org_id: FC };
    const totals = aggregateCOTotals([crewOrder], [
      { co_id: partial.id, org_id: FC, line_total: 400, co_line_items: { approval_status: 'approved' } },
      { co_id: partial.id, org_id: FC, line_total: 250, co_line_items: { approval_status: 'rejected' } },
    ], [], [], FC, false);
    expect(totals.approvedCORevenue).toBe(400);
  });
});

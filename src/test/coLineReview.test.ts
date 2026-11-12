import { describe, expect, it } from 'vitest';
import { approvedLaborForReview, summarizeLineReview } from '@/lib/coLineReview';

const item = (id: string, approval_status: 'pending' | 'approved' | 'rejected') => ({ id, approval_status });

describe('per-line CO/WO review', () => {
  it('keeps review incomplete while any item is pending', () => {
    expect(summarizeLineReview([item('a', 'approved'), item('b', 'pending')])).toMatchObject({
      pending: 1,
      complete: false,
    });
  });

  it('allows a mixed review only after every item has a decision', () => {
    expect(summarizeLineReview([item('a', 'approved'), item('b', 'rejected')])).toMatchObject({
      approved: 1,
      rejected: 1,
      pending: 0,
      complete: true,
    });
  });

  it('counts an all-rejected review as complete with no approved items', () => {
    expect(summarizeLineReview([item('a', 'rejected'), item('b', 'rejected')])).toMatchObject({
      approved: 0,
      rejected: 2,
      complete: true,
    });
  });

  it('excludes rejected-item labor and private costs from the approved amount', () => {
    const total = approvedLaborForReview(
      [item('a', 'approved'), item('b', 'rejected')],
      [
        { co_line_item_id: 'a', entered_by_role: 'TC', line_total: 1000, is_actual_cost: false },
        { co_line_item_id: 'a', entered_by_role: 'TC', line_total: 600, is_actual_cost: true },
        { co_line_item_id: 'b', entered_by_role: 'TC', line_total: 500, is_actual_cost: false },
      ],
    );
    expect(total).toBe(1000);
  });

  it('uses downstream labor only when no subcontractor billable row exists', () => {
    const total = approvedLaborForReview(
      [item('a', 'approved')],
      [{ co_line_item_id: 'a', entered_by_role: 'FC', line_total: 750, is_actual_cost: false }],
    );
    expect(total).toBe(750);
  });
});

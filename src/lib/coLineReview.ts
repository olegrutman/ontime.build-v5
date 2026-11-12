import type { COLaborEntry, COLineItem } from '@/types/changeOrder';

export type COLineApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface COLineReviewSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  complete: boolean;
}

export function summarizeLineReview(
  items: Pick<COLineItem, 'approval_status'>[],
): COLineReviewSummary {
  const approved = items.filter(item => item.approval_status === 'approved').length;
  const rejected = items.filter(item => item.approval_status === 'rejected').length;
  const pending = items.length - approved - rejected;
  return {
    total: items.length,
    pending,
    approved,
    rejected,
    complete: items.length > 0 && pending === 0,
  };
}

/**
 * Approved scope labor uses the same rule as the order total: subcontractor
 * billable rows win when present, otherwise downstream billable rows are used.
 * Private actual-cost rows never contribute.
 */
export function approvedLaborForReview(
  items: Pick<COLineItem, 'id' | 'approval_status'>[],
  entries: Pick<COLaborEntry, 'co_line_item_id' | 'entered_by_role' | 'line_total' | 'is_actual_cost'>[],
): number {
  const approvedIds = new Set(items.filter(item => item.approval_status === 'approved').map(item => item.id));
  const rows = entries.filter(entry => approvedIds.has(entry.co_line_item_id) && !entry.is_actual_cost);
  const tc = rows
    .filter(entry => entry.entered_by_role === 'TC')
    .reduce((sum, entry) => sum + Number(entry.line_total ?? 0), 0);
  const total = tc > 0
    ? tc
    : rows.reduce((sum, entry) => sum + Number(entry.line_total ?? 0), 0);
  return Math.round(total * 100) / 100;
}

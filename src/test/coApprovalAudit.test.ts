import { describe, expect, it } from 'vitest';
import { priceApprovalGap, type ApprovalAuditOrder } from '@/lib/coApprovalAudit';

const order: ApprovalAuditOrder = { status: 'approved', issuerType: 'TC', recipientType: 'GC', approvedPrice: 1040, currentPrice: 1540, pricedEntries: 1, keptInternal: false, pendingRevision: false };
describe('approval audit', () => {
  it('flags the extra $500 for a submitted correction, not automatic approval', () => {
    expect(priceApprovalGap(order)).toBe('submit_revision');
  });
  it('clears the accepted WO-5 correction at $4,120', () => {
    expect(priceApprovalGap({ ...order, approvedPrice: 4120, currentPrice: 4120 })).toBeNull();
  });
  it('routes an existing pending revision to contractor review', () => {
    expect(priceApprovalGap({ ...order, pendingRevision: true })).toBe('pending_revision');
  });
  it('does not send internal crew costs upstream', () => {
    expect(priceApprovalGap({ ...order, keptInternal: true })).toBeNull();
  });
  it('does not request extra approval for withdrawn orders', () => {
    expect(priceApprovalGap({ ...order, status: 'withdrawn' })).toBeNull();
  });
  it('flags a missing approved snapshot rather than inventing the approved amount', () => {
    expect(priceApprovalGap({ ...order, approvedPrice: null })).toBe('missing_snapshot');
  });
  it('does not treat absent itemization as a zero-dollar correction', () => {
    expect(priceApprovalGap({ ...order, pricedEntries: 0, currentPrice: 0 })).toBeNull();
  });
});
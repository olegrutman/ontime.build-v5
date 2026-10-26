export interface ApprovalAuditOrder {
  status: string;
  issuerType: string;
  recipientType: string;
  approvedPrice: number | null;
  currentPrice: number;
  pricedEntries: number;
  keptInternal: boolean;
  pendingRevision: boolean;
}

export function priceApprovalGap(order: ApprovalAuditOrder): 'submit_revision' | 'pending_revision' | 'missing_snapshot' | null {
  if (!['approved', 'contracted'].includes(order.status) || order.keptInternal
    || order.issuerType !== 'TC' || order.recipientType !== 'GC') return null;
  if (order.pendingRevision) return 'pending_revision';
  if (order.pricedEntries === 0) return null;
  if (order.approvedPrice === null || order.approvedPrice <= 0) return 'missing_snapshot';
  return Math.abs(Math.round(order.currentPrice * 100) - Math.round(order.approvedPrice * 100)) >= 1
    ? 'submit_revision' : null;
}
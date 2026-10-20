/**
 * Canonical supplier pipeline metric definitions.
 *
 * Single source of truth so the supplier dashboard (`useSupplierDashboardData`)
 * and the supplier project overview (`SupplierProjectOverview`) always agree on
 * Estimated → Ordered → Billed → Received.
 */

/** Estimates counted toward "Estimated" (material budget). Approved only. */
export const ESTIMATE_COUNTED_STATUSES = ['APPROVED'] as const;

/** Submitted estimates are visible as pending, but do not enter the approved budget. */
export const ESTIMATE_PENDING_STATUSES = ['SUBMITTED'] as const;

/** PO statuses excluded from "Ordered" (pre-submission / in-negotiation / void). */
export const ORDERED_EXCLUDED_PO_STATUSES = new Set([
  'ACTIVE',
  'DRAFT',
  'CANCELLED',
  'SUBMITTED',
  'PRICED',
  'SENT',
  'PENDING_APPROVAL',
]);

/** Invoice statuses counted toward "Billed". */
export const BILLED_INVOICE_STATUSES = new Set(['SUBMITTED', 'APPROVED', 'PAID']);

/** Invoice statuses counted toward "Received". */
export const RECEIVED_INVOICE_STATUSES = new Set(['PAID']);

export function isCountedEstimate(status?: string | null): boolean {
  return !!status && (ESTIMATE_COUNTED_STATUSES as readonly string[]).includes(status);
}

export function isPendingEstimate(status?: string | null): boolean {
  return !!status && (ESTIMATE_PENDING_STATUSES as readonly string[]).includes(status);
}

export function isOrderedPO(status?: string | null): boolean {
  return !!status && ['ORDERED', 'READY_FOR_DELIVERY', 'DELIVERED', 'FINALIZED'].includes(status);
}

export function isDeliveredPO(status?: string | null): boolean {
  return status === 'DELIVERED' || status === 'FINALIZED';
}

export function isOpenSupplierPO(status?: string | null): boolean {
  return !!status && ['SUBMITTED', 'PRICED', 'ORDERED', 'READY_FOR_DELIVERY'].includes(status);
}

export function isScheduledSupplierPO(po: { status?: string | null; ready_for_delivery_at?: string | null }): boolean {
  return ['ORDERED', 'READY_FOR_DELIVERY'].includes(po.status || '') && !!po.ready_for_delivery_at;
}

/** Estimate line totals are pre-tax; each estimate has its own tax rate. */
export function estimateItemAmount(lineTotal: number | null, taxPercent?: number | null): number {
  return (lineTotal || 0) * (1 + (taxPercent || 0) / 100);
}

/** Credits are realized only when the return is closed, net of restocking. */
export function realizedReturnCredit(row: { status?: string | null; net_credit_total?: number | null }): number {
  return row.status === 'CLOSED' ? row.net_credit_total || 0 : 0;
}

/** Remaining delivered value, including partially invoiced POs without cross-PO offsets. */
export function supplierUnbilledAmount(po: Parameters<typeof poOrderedAmount>[0], billedAmount: number): number {
  return Math.max(0, poOrderedAmount(po) - billedAmount);
}

/** Never let advance invoices for one PO offset unapproved deliveries on another. */
export function supplierCreditExposure(
  pos: Array<{ id: string; status?: string | null; po_total?: number | null; po_subtotal_total?: number | null; sales_tax_percent?: number | null }>,
  invoices: Array<{ po_id?: string | null; status?: string | null; total_amount?: number | null }>,
): number {
  return pos.reduce((sum, po) => {
    if (!isDeliveredPO(po.status)) return sum;
    const covered = invoices.reduce((s, inv) => inv.po_id === po.id && ['APPROVED', 'PAID'].includes(inv.status || '') ? s + (inv.total_amount || 0) : s, 0);
    return sum + Math.max(0, poOrderedAmount(po) - covered);
  }, 0);
}

export function isBilledInvoice(status?: string | null): boolean {
  return !!status && BILLED_INVOICE_STATUSES.has(status);
}

export function isReceivedInvoice(status?: string | null): boolean {
  return !!status && RECEIVED_INVOICE_STATUSES.has(status);
}

/**
 * Tax-inclusive PO amount, comparable against (tax-inclusive) estimates.
 *
 * `purchase_orders.po_total` is ALREADY tax-inclusive (it is maintained as
 * `po_subtotal_total * (1 + sales_tax_percent/100)` by the totals trigger), so it
 * must NOT be grossed up again. Only fall back to grossing up the subtotal when
 * `po_total` is missing (older rows / RLS-masked totals).
 */
export function poOrderedAmount(po: {
  po_total?: number | null;
  po_subtotal_total?: number | null;
  sales_tax_percent?: number | null;
}): number {
  if (po.po_total != null) return po.po_total;
  const multiplier = 1 + ((po.sales_tax_percent || 0) / 100);
  return (po.po_subtotal_total || 0) * multiplier;
}


export function sumEstimated(estimates: Array<{ status?: string | null; total_amount?: number | null }>): number {
  return estimates.reduce((s, e) => (isCountedEstimate(e.status) ? s + (e.total_amount || 0) : s), 0);
}

export function sumOrdered(
  pos: Array<{ status?: string | null; po_total?: number | null; sales_tax_percent?: number | null }>,
): number {
  return pos.reduce((s, p) => (isOrderedPO(p.status) ? s + poOrderedAmount(p) : s), 0);
}

export function sumBilled(invoices: Array<{ status?: string | null; total_amount?: number | null }>): number {
  return invoices.reduce((s, i) => (isBilledInvoice(i.status) ? s + (i.total_amount || 0) : s), 0);
}

export function sumReceived(invoices: Array<{ status?: string | null; total_amount?: number | null }>): number {
  return invoices.reduce((s, i) => (isReceivedInvoice(i.status) ? s + (i.total_amount || 0) : s), 0);
}

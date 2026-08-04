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
  return !!status && !ORDERED_EXCLUDED_PO_STATUSES.has(status);
}

export function isBilledInvoice(status?: string | null): boolean {
  return !!status && BILLED_INVOICE_STATUSES.has(status);
}

export function isReceivedInvoice(status?: string | null): boolean {
  return !!status && RECEIVED_INVOICE_STATUSES.has(status);
}

/**
 * Tax-inclusive PO amount. Estimates are tax-inclusive, so PO totals must be
 * grossed up by sales tax before they are compared against estimates.
 */
export function poOrderedAmount(po: { po_total?: number | null; sales_tax_percent?: number | null }): number {
  const multiplier = 1 + ((po.sales_tax_percent || 0) / 100);
  return (po.po_total || 0) * multiplier;
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

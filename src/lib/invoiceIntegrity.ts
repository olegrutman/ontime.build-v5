import { toCents } from '@/lib/money';

/** Identity, not invoice number or PO, determines whether two rows are the same invoice. */
export function uniqueInvoices<T extends { id: string }>(invoices: T[]): T[] {
  return [...new Map(invoices.map(invoice => [invoice.id, invoice])).values()];
}

export function invoiceAmountSum(invoices: { total_amount?: number | null }[]): number {
  return toCents(invoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0));
}

export function ownerBillingBalance(billed: number, collected: number, revisedRevenue: number) {
  return { pending: toCents(Math.max(0, billed - collected)), unbilled: toCents(Math.max(0, revisedRevenue - billed)) };
}

export function projectMaterialCommitment(estimates: number, orders: number) {
  return toCents(Math.max(estimates, orders));
}
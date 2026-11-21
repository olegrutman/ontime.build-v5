export interface BillableInvoiceRow {
  label: string;
  amount: number;
  entryIds: string[];
}

export interface BulkInvoiceBalance {
  already_billed: number;
  remaining: number;
}

/** Bulk billing creates full itemized invoices; partially billed orders use progress billing. */
export function splitBulkInvoiceOrders<T extends BulkInvoiceBalance>(orders: T[]) {
  const billable: T[] = [];
  const partiallyBilled: T[] = [];
  for (const order of orders) {
    if (order.remaining <= 0.005) continue;
    if (order.already_billed > 0.005) partiallyBilled.push(order);
    else billable.push(order);
  }
  return { billable, partiallyBilled };
}

/** Single-order progress lines must count toward that order, not become legacy full-order billing. */
export function coLumpInvoiceSource(coId: string) {
  return { source_co_id: coId, source_entry_ids: null };
}

/** Continue an earlier order-level progress invoice without rebilling its untagged entries. */
export function untaggedProgressAmount(requested: number, remaining: number, priorProgress: number): number | null {
  const available = Math.max(0, Math.round(remaining * 100) / 100);
  if (requested <= available + 0.005 || priorProgress <= 0.005 || available <= 0.005) return null;
  return available;
}

/** Never silently replace missing scope with a summary or increase approved billing. */
export function validateCoInvoiceRows(rows: BillableInvoiceRow[], remaining: number): BillableInvoiceRow[] {
  const positive = rows.filter(row => row.amount > 0.005);
  const total = Math.round(positive.reduce((sum, row) => sum + row.amount, 0) * 100) / 100;
  if (Math.abs(total - remaining) > 0.005) {
    throw new Error(`Itemized work totals $${total.toFixed(2)}, but the approved remaining amount is $${remaining.toFixed(2)}. Review the work order pricing and obtain approval for any added work before billing.`);
  }
  return positive;
}

export function submittedLaborTotal(rows: { line_total: number | null }[]): number {
  return Math.round(rows.reduce((sum, row) => sum + Number(row.line_total ?? 0), 0) * 100) / 100;
}
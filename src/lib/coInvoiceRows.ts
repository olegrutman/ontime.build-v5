export interface BillableInvoiceRow {
  label: string;
  amount: number;
  entryIds: string[];
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
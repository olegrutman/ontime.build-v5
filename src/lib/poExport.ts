import type { PurchaseOrder, POLineItem } from '@/types/purchaseOrder';

const esc = (value: unknown): string => {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const row = (cells: unknown[]) => cells.map(esc).join(',');

const money = (n: number | null | undefined) =>
  n === null || n === undefined ? '' : n.toFixed(2);

export interface POCsvOptions {
  includePrices: boolean;
}

/**
 * Build a spreadsheet (CSV) representation of a purchase order.
 * Pricing columns are omitted entirely when the viewer may not see pricing.
 */
export function buildPOCsv(
  po: PurchaseOrder,
  lineItems: POLineItem[],
  { includePrices }: POCsvOptions,
): string {
  const lines: string[] = [];

  lines.push(row(['Purchase Order', po.po_number]));
  lines.push(row(['Name', po.po_name]));
  lines.push(row(['Status', po.status]));
  lines.push(row(['Project', po.project?.name ?? '']));
  lines.push(row(['Supplier', po.supplier?.name ?? '']));
  lines.push(row(['Buyer', po.organization?.name ?? '']));
  lines.push(row(['Created', po.created_at ? po.created_at.slice(0, 10) : '']));
  if (po.notes) lines.push(row(['Notes', po.notes]));
  lines.push('');

  const header = ['Line', 'SKU', 'Description', 'Quantity', 'UOM'];
  if (includePrices) header.push('Unit Price', 'Line Total');
  lines.push(row(header));

  let subtotal = 0;
  lineItems.forEach((item, idx) => {
    const cells: unknown[] = [
      item.line_number ?? idx + 1,
      item.supplier_sku ?? '',
      item.description,
      item.quantity,
      item.uom,
    ];
    if (includePrices) {
      const lineTotal = item.line_total ?? (item.unit_price ?? 0) * (item.quantity ?? 0);
      subtotal += lineTotal;
      cells.push(money(item.unit_price), money(lineTotal));
    }
    lines.push(row(cells));
  });

  if (includePrices) {
    const taxPercent = po.sales_tax_percent ?? 0;
    const tax = po.po_tax_total ?? Math.round(subtotal * taxPercent) / 100;
    const total = po.po_total ?? subtotal + tax;
    const pad = ['', '', '', '', ''];
    lines.push('');
    lines.push(row([...pad, 'Subtotal', money(subtotal)]));
    lines.push(row([...pad, `Sales tax (${taxPercent}%)`, money(tax)]));
    lines.push(row([...pad, 'Total', money(total)]));
  }

  return lines.join('\r\n');
}

export function poFileName(po: PurchaseOrder, ext: 'csv' | 'pdf'): string {
  const safe = `${po.po_number}-${po.po_name}`.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80);
  return `${safe}.${ext}`;
}

export function downloadCsv(fileName: string, csv: string) {
  // BOM keeps Excel happy with UTF-8 content.
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

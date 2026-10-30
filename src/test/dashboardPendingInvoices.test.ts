import { describe, expect, it } from 'vitest';
import { dashboardPendingInvoices, dashboardInvoiceRows, pendingInvoiceSummary } from '@/lib/dashboardPendingInvoices';

const contracts = new Map([
  ['upstream', { from_org_id: 'sub', to_org_id: 'contractor' }],
  ['crew', { from_org_id: 'crew', to_org_id: 'sub' }],
  ['other', { from_org_id: 'other-sub', to_org_id: 'contractor' }],
]);
const pos = new Map([['materials', { supplier_org_id: 'supplier', pricing_owner_org_id: 'sub' }]]);
const projects = new Map([['project', 'Knowles']]);
const invoice = (id: string, amount: number, contract_id: string | null, status = 'SUBMITTED', po_id: string | null = null) => ({
  id, invoice_number: id, total_amount: amount, contract_id, po_id, status,
  project_id: 'project', created_at: '2026-10-30T00:00:00Z',
});
const resolve = (rows: ReturnType<typeof invoice>[]) => dashboardPendingInvoices(rows, 'sub', contracts, pos, projects);

describe('subcontractor pending invoice cards', () => {
  it('keeps paid history separate from pending even when complete records are supplied', () => {
    const rows = dashboardInvoiceRows([invoice('paid', 500, 'upstream', 'PAID'), invoice('unpaid', 100, 'upstream', 'APPROVED')], 'sub', contracts, pos, projects);
    expect(rows.filter(row => row.status === 'PAID').reduce((sum, row) => sum + row.amount, 0)).toBe(500);
    expect(pendingInvoiceSummary(rows, 'receivable')).toMatchObject({ count: 1, total: 100 });
  });
  it('keeps invoices billed to the general contractor separate from crew invoices', () => {
    const rows = resolve([invoice('to-contractor', 3120, 'upstream'), invoice('from-crew', 1200, 'crew')]);
    expect(pendingInvoiceSummary(rows, 'receivable')).toMatchObject({ count: 1, total: 3120 });
    expect(pendingInvoiceSummary(rows, 'receivable').rows.map(row => row.id)).toEqual(['to-contractor']);
    expect(pendingInvoiceSummary(rows, 'payable')).toMatchObject({ count: 1, total: 1200 });
  });

  it('includes both crew and supplier invoices received for approval or payment', () => {
    const rows = resolve([invoice('crew', 1200, 'crew', 'APPROVED'), invoice('supplier', 650, null, 'SUBMITTED', 'materials')]);
    expect(pendingInvoiceSummary(rows, 'payable')).toMatchObject({ count: 2, total: 1850 });
    expect(pendingInvoiceSummary(rows, 'receivable').count).toBe(0);
  });

  it('excludes drafts, rejected, paid and voided invoices and other companies', () => {
    const rows = resolve([
      ...['DRAFT', 'REJECTED', 'PAID', 'VOIDED'].map(status => invoice(status, 900, 'upstream', status)),
      invoice('unrelated', 8000, 'other'), invoice('missing', 700, 'missing'),
    ]);
    expect(rows).toEqual([]);
  });

  it('deduplicates the same pending invoice by ID, never by invoice number', () => {
    const original = invoice('pending', 3120, 'upstream');
    const rows = resolve([original, original]);
    expect(pendingInvoiceSummary(rows, 'receivable')).toMatchObject({ count: 1, total: 3120 });
  });

  it('keeps amounts, counts and every breakdown row aligned beyond recent-document limits', () => {
    const rows = resolve(Array.from({ length: 20 }, (_, index) => invoice(`upstream-${index}`, 100.25, 'upstream', 'APPROVED')));
    const summary = pendingInvoiceSummary(rows, 'receivable');
    expect(summary.count).toBe(20);
    expect(summary.total).toBe(2005);
    expect(summary.rows).toHaveLength(20);
  });
});
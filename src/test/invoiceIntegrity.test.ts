import { describe, expect, it } from 'vitest';
import { uniqueInvoices, invoiceAmountSum, ownerBillingBalance, projectMaterialCommitment } from '@/lib/invoiceIntegrity';
import { coLaborCost } from '@/lib/coLaborCost';

describe('invoice and KPI integrity', () => {
  it('counts a dual-linked invoice once for pending amounts and paid cash', () => {
    for (const status of ['SUBMITTED', 'PAID']) {
      const invoice = { id: 'dual', status, total_amount: 16695.66 };
      const rows = uniqueInvoices([invoice, invoice]);
      expect(rows).toHaveLength(1);
      expect(invoiceAmountSum(rows)).toBe(16695.66);
    }
  });
  it('preserves different invoices on the same PO', () => {
    expect(invoiceAmountSum(uniqueInvoices([{ id: 'a', po_id: 'po', total_amount: 100 }, { id: 'b', po_id: 'po', total_amount: 200 }]))).toBe(300);
  });
  it('separates unpaid owner billings from work not billed yet', () => {
    expect(ownerBillingBalance(60, 20, 100)).toEqual({ pending: 40, unbilled: 40 });
    expect(ownerBillingBalance(60, 60, 100).pending).toBe(0);
  });
  it('keeps material commitments separate across projects', () => {
    expect(projectMaterialCommitment(100, 0) + projectMaterialCommitment(0, 100)).toBe(200);
  });
  it('counts crew imports once while retaining unimported crew work and independent internal cost', () => {
    const rows = [
      { id: 'crew-a', org_id: 'crew', entered_by_role: 'FC', line_total: 100 },
      { id: 'crew-b', org_id: 'crew', entered_by_role: 'FC', line_total: 50 },
      { id: 'import', org_id: 'sub', is_actual_cost: true, line_total: 100, source_fc_entry_ids: ['crew-a'] },
      { id: 'manual', org_id: 'sub', is_actual_cost: true, line_total: 25 },
    ];
    expect(coLaborCost(rows, 'sub')).toEqual({ ownLabor: 125, subcontract: 50, total: 175 });
  });
});
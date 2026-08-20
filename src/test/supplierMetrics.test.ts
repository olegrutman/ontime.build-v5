import { describe, it, expect } from 'vitest';
import { poOrderedAmount, sumOrdered, sumBilled, sumReceived, sumEstimated } from '@/lib/supplierMetrics';

describe('poOrderedAmount', () => {
  it('does not double-count sales tax when po_total is present (already tax-inclusive)', () => {
    // Live row PO-TEST1-260804-0121: subtotal 39058.21, tax 9.61% -> po_total 42811.70
    expect(poOrderedAmount({ po_total: 42811.7, po_subtotal_total: 39058.21, sales_tax_percent: 9.61 }))
      .toBeCloseTo(42811.7, 2);
  });

  it('grosses up the subtotal only when po_total is missing', () => {
    expect(poOrderedAmount({ po_total: null, po_subtotal_total: 100, sales_tax_percent: 10 })).toBeCloseTo(110, 2);
  });

  it('returns 0 when nothing is priced', () => {
    expect(poOrderedAmount({})).toBe(0);
  });

  it('keeps zero-tax POs unchanged', () => {
    expect(poOrderedAmount({ po_total: 4824, sales_tax_percent: 0 })).toBe(4824);
  });
});

describe('supplier pipeline sums (live project 66ccdaeb)', () => {
  const pos = [
    { status: 'DELIVERED', po_total: 42811.7, sales_tax_percent: 9.61 },
    { status: 'DELIVERED', po_total: 11007.84, sales_tax_percent: 9.61 },
    { status: 'DELIVERED', po_total: 7578.94, sales_tax_percent: 9.61 },
    { status: 'PRICED', po_total: 180, sales_tax_percent: 0 },
    { status: 'DELIVERED', po_total: 65225.43, sales_tax_percent: 9.61 },
    { status: 'DELIVERED', po_total: 200, sales_tax_percent: 0 },
    { status: 'DELIVERED', po_total: 4824, sales_tax_percent: 0 },
  ];

  it('ordered equals the sum of committed PO totals, excluding PRICED', () => {
    expect(sumOrdered(pos)).toBeCloseTo(131647.91, 2);
  });

  it('estimated counts approved estimates only', () => {
    expect(sumEstimated([
      { status: 'APPROVED', total_amount: 345001.72 },
      { status: 'APPROVED', total_amount: 12400 },
      { status: 'SUBMITTED', total_amount: 9999 },
    ])).toBeCloseTo(357401.72, 2);
  });

  it('billed and received only count supplier invoices tied to POs', () => {
    const invoices = [
      { status: 'PAID', total_amount: 11007.84 },
      { status: 'PAID', total_amount: 7578.94 },
      { status: 'DRAFT', total_amount: 4186 },
    ];
    expect(sumBilled(invoices)).toBeCloseTo(18586.78, 2);
    expect(sumReceived(invoices)).toBeCloseTo(18586.78, 2);
  });
});

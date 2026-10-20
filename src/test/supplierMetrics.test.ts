import { describe, it, expect } from 'vitest';
import { poOrderedAmount, sumOrdered, sumBilled, sumReceived, sumEstimated, isOrderedPO, isDeliveredPO, isScheduledSupplierPO, isOpenSupplierPO, estimateItemAmount, realizedReturnCredit, supplierCreditExposure, supplierUnbilledAmount, supplierInvoiceDaysPastDue } from '@/lib/supplierMetrics';

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

describe('supplier audit guardrails', () => {
  it('uses the same net 30 past-due convention and approval fallback across supplier screens', () => {
    const now = new Date('2026-10-20T12:00:00Z');
    expect(supplierInvoiceDaysPastDue({submitted_at:'2026-09-20T12:00:00Z'},now)).toBe(0);
    expect(supplierInvoiceDaysPastDue({submitted_at:'2026-09-19T12:00:00Z'},now)).toBe(1);
    expect(supplierInvoiceDaysPastDue({submitted_at:'2026-08-01T12:00:00Z',approved_at:'2026-10-01T12:00:00Z'},now)).toBe(0);
  });
  it('preserves unbilled balance for partially invoiced deliveries', () => {
    expect(supplierUnbilledAmount({po_total:1000},100)).toBe(900);
    expect(supplierUnbilledAmount({po_total:1000},1200)).toBe(0);
  });
  it('counts only buyer-committed orders, never sent or awaiting approval quotes', () => {
    for (const status of ['DRAFT', 'ACTIVE', 'SENT', 'PENDING_APPROVAL', 'SUBMITTED', 'PRICED', 'CANCELLED', 'UNKNOWN']) expect(isOrderedPO(status)).toBe(false);
    for (const status of ['ORDERED', 'READY_FOR_DELIVERY', 'DELIVERED', 'FINALIZED']) expect(isOrderedPO(status)).toBe(true);
  });
  it('includes finalized deliveries and ready loads in open orders', () => {
    expect(isDeliveredPO('FINALIZED')).toBe(true);
    expect(isDeliveredPO('ORDERED')).toBe(false);
    expect(isOpenSupplierPO('READY_FOR_DELIVERY')).toBe(true);
    expect(isOpenSupplierPO('FINALIZED')).toBe(false);
  });
  it('does not invent delivery dates for unscheduled orders', () => {
    expect(isScheduledSupplierPO({status:'ORDERED'})).toBe(false);
    expect(isScheduledSupplierPO({status:'READY_FOR_DELIVERY',ready_for_delivery_at:'2026-10-21'})).toBe(true);
    expect(isScheduledSupplierPO({status:'FINALIZED',ready_for_delivery_at:'2026-10-21'})).toBe(false);
  });
  it('compares each estimate pack including its own tax', () => {
    expect(estimateItemAmount(100, 10) + estimateItemAmount(100, 5)).toBeCloseTo(215, 2);
  });
  it('realizes only closed return credits net of restocking', () => {
    expect(realizedReturnCredit({status:'CLOSED',net_credit_total:90})).toBe(90);
    for (const status of ['DRAFT', 'REJECTED', 'APPROVED', 'PRICED']) expect(realizedReturnCredit({status,net_credit_total:90})).toBe(0);
  });
  it('does not offset delivered exposure with approvals on an undelivered PO', () => {
    expect(supplierCreditExposure([{id:'delivered',status:'FINALIZED',po_total:110},{id:'advance',status:'ORDERED',po_total:500}], [{po_id:'advance',status:'PAID',total_amount:500},{po_id:'delivered',status:'APPROVED',total_amount:30}])).toBe(80);
  });
  it('excludes returned and rejected invoices from billed and received totals', () => {
    const invoices = ['DRAFT','RETURNED','REJECTED','VOIDED'].map(status => ({status,total_amount:100}));
    expect(sumBilled(invoices)).toBe(0);
    expect(sumReceived(invoices)).toBe(0);
  });
});

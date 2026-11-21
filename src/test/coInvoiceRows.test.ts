import { describe, expect, it } from 'vitest';
import { coLumpInvoiceSource, splitBulkInvoiceOrders, submittedLaborTotal, untaggedProgressAmount, validateCoInvoiceRows } from '@/lib/coInvoiceRows';

describe('subcontractor-added invoice work', () => {
  it('freezes saved crew-derived and manual billable labor once', () => {
    expect(submittedLaborTotal([{ line_total: 3120 }, { line_total: 1000 }])).toBe(4120);
  });
  it('keeps both scope items and their billing provenance', () => {
    const rows = [{ label: 'Steel angles', amount: 3120, entryIds: ['derived'] }, { label: 'Weld studs', amount: 1000, entryIds: ['manual'] }];
    expect(validateCoInvoiceRows(rows, 4120)).toEqual(rows);
  });
  it('does not silently discard added work or exceed frozen approval', () => {
    expect(() => validateCoInvoiceRows([{ label: 'Steel angles', amount: 3120, entryIds: ['derived'] }, { label: 'Weld studs', amount: 1000, entryIds: ['manual'] }], 3120)).toThrow('approved remaining amount is $3120.00');
  });
});

describe('bulk re-invoicing eligibility', () => {
  it('makes every reopened $4,120 order available after its deleted invoice no longer bills it', () => {
    const reopened = { co_id: 'reopened', already_billed: 0, remaining: 4120 };
    expect(splitBulkInvoiceOrders([reopened]).billable).toEqual([reopened]);
  });

  it('keeps a $1,170 partially billed order out of the full itemized batch', () => {
    const partial = { co_id: 'partial', already_billed: 1170, remaining: 1170 };
    const result = splitBulkInvoiceOrders([partial]);
    expect(result.billable).toEqual([]);
    expect(result.partiallyBilled).toEqual([partial]);
  });

  it('does not offer a fully billed $650 order in either invoice path', () => {
    const result = splitBulkInvoiceOrders([{ co_id: 'paid', already_billed: 650, remaining: 0 }]);
    expect(result.billable).toEqual([]);
    expect(result.partiallyBilled).toEqual([]);
  });
});

describe('continued order-level progress billing', () => {
  it('bills only the $220 remaining after an earlier $200 untagged progress line', () => {
    expect(untaggedProgressAmount(420, 220, 200)).toBe(220);
  });

  it('does not replace an over-limit itemized invoice when no earlier progress exists', () => {
    expect(untaggedProgressAmount(420, 220, 0)).toBeNull();
  });

  it('leaves ordinary itemized billing unchanged when it already fits', () => {
    expect(untaggedProgressAmount(200, 220, 200)).toBeNull();
  });
});

describe('single-order progress provenance', () => {
  it('tags a partial lump-sum line to its order without falsely reserving every source entry', () => {
    expect(coLumpInvoiceSource('WO-729-A5-12-0001')).toEqual({
      source_co_id: 'WO-729-A5-12-0001',
      source_entry_ids: null,
    });
  });
});
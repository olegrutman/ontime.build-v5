import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc },
}));

import { buildInvoiceNumber, coTag, invoiceOrderReference } from '@/lib/invoiceNumber';

describe('full invoice order references', () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: 1, error: null });
  });

  it('preserves the exact work order reference from the order page', () => {
    expect(invoiceOrderReference('WO-5 C-PA-IM-0005')).toBe('WO-5 C-PA-IM-0005');
  });

  it('preserves the complete change order reference', () => {
    expect(coTag('CO-FUL-IM-HA-0001')).toBe('CO-FUL-IM-HA-0001');
  });

  it('numbers a work order invoice as PROJ-W01', async () => {
    expect(await buildInvoiceNumber({ projectId: 'p', projectName: 'The Knowles Residence', coNumber: 'WO-KNO-IM-HA-0004' }))
      .toBe('KNO-W001');
  });

  it('numbers a change order invoice as PROJ-C01', async () => {
    expect(await buildInvoiceNumber({ projectId: 'p', projectName: 'Cherry Hills', coNumber: 'CO-CHE-IM-HA-0001' }))
      .toBe('CHE-C001');
  });

  it('uses the server-allocated contract sequence instead of visible invoice rows', async () => {
    rpc.mockResolvedValue({ data: 3, error: null });
    expect(await buildInvoiceNumber({ projectId: 'p', projectName: 'Cherry Hills' })).toBe('CHE-003');
    expect(rpc).toHaveBeenCalledWith('next_invoice_sequence', { p_project_id: 'p', p_prefix: 'CHE-' });
  });

  it('keeps multi-order invoices on the order sequence', async () => {
    rpc.mockResolvedValue({ data: 3, error: null });
    expect(await buildInvoiceNumber({ projectId: 'p', projectName: 'Cherry Hills', multiCoCount: 2, isTM: true }))
      .toBe('CHE-W003');
  });

  it('stays at 8 characters or fewer', async () => {
    rpc.mockResolvedValue({ data: 100, error: null });
    const n = await buildInvoiceNumber({ projectId: 'p', projectName: 'Cherry Hills', coNumber: 'WO-1' });
    expect(n).toBe('CHE-W100');
    expect(n.length).toBeLessThanOrEqual(8);
  });

  it('does not fall back to a collision-prone visible-row count', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'denied' } });
    await expect(buildInvoiceNumber({ projectId: 'p', projectName: 'Cherry Hills' }))
      .rejects.toThrow('Could not allocate an invoice number: denied');
  });

  it('rejects a sequence that would exceed eight characters', async () => {
    rpc.mockResolvedValue({ data: 1000, error: null });
    await expect(buildInvoiceNumber({ projectId: 'p', projectName: 'Cherry Hills', coNumber: 'WO-1' }))
      .rejects.toThrow('invoice sequence is full');
  });
});

import { projectCode as _projectCode, orgInitials as _orgInitials } from '@/lib/invoiceNumber';
describe('number prefixes ignore spaces and symbols', () => {
  it('"QA TEST Remodel 1" -> "QAT" (no space)', () => {
    expect(_projectCode('QA TEST Remodel 1')).toBe('QAT');
  });
  it('"TC_Test" -> "TC"', () => {
    expect(_orgInitials('TC_Test')).toBe('TC');
  });
  it('"A B" org -> "AB"', () => {
    expect(_orgInitials('A B Framing')).toBe('AB');
  });
});

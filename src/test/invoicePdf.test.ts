import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
import { attachInvoicePdf } from '@/lib/invoicePdf';

describe('attached invoice scope selection', () => {
  beforeEach(() => invoke.mockReset().mockResolvedValue({ data: { url: 'signed-document' }, error: null }));

  it('requests the full item scope when selected for submission', async () => {
    await attachInvoicePdf('invoice-id', true, true);
    expect(invoke).toHaveBeenCalledWith('generate-invoice-pdf', {
      body: { invoice_id: 'invoice-id', submitting: true, show_full_scope: true },
    });
  });

  it('requests titles only when full scope is off', async () => {
    await attachInvoicePdf('invoice-id', true, false);
    expect(invoke).toHaveBeenCalledWith('generate-invoice-pdf', {
      body: { invoice_id: 'invoice-id', submitting: true, show_full_scope: false },
    });
  });
});
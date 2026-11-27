import { beforeEach, describe, expect, it, vi } from 'vitest';

const { from, query } = vi.hoisted(() => {
  const query = { select: vi.fn(), in: vi.fn(), eq: vi.fn() };
  return { from: vi.fn(), query };
});
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from } }));
import { fetchWoItemBilledToDate } from '@/lib/woProgressBillingData';
import { itemProgressAmount } from '@/lib/woItemBilling';

const line = (status: string, amount: number, invoiceId = status) => ({
  source_co_id: 'wo-1', source_line_item_id: 'item-1', current_billed: amount,
  description: 'Framing', invoice_id: invoiceId, invoices: { status },
});

function respond(data: ReturnType<typeof line>[], error: Error | null = null) {
  query.eq.mockReturnValueOnce(query).mockResolvedValueOnce({ data, error });
}

describe('per-item invoice reservations', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    from.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.in.mockReturnValue(query);
  });

  it.each(['VOIDED', 'VOID', 'REJECTED'])('%s releases the full item balance', async status => {
    respond([line(status, 1000)]);
    const result = await fetchWoItemBilledToDate('project-1', 'issuer-1', ['wo-1']);
    expect(itemProgressAmount(1000, 100, result.itemBilled.get('item-1') ?? 0)).toBe(1000);
    expect(result.taggedByCo.get('wo-1')).toBe(0);
  });

  it('reserves issued amounts and other drafts, releasing only the edited draft', async () => {
    respond([line('APPROVED', 200), line('DRAFT', 100, 'other-draft'), line('DRAFT', 400, 'editing')]);
    const result = await fetchWoItemBilledToDate('project-1', 'issuer-1', ['wo-1'], 'editing');
    expect(result.itemBilled.get('item-1')).toBe(300);
    expect(result.taggedByCo.get('wo-1')).toBe(300);
    expect(itemProgressAmount(1000, 100, result.itemBilled.get('item-1') ?? 0)).toBe(700);
  });

  it('scopes invoice lines to the project and issuing company contracts', async () => {
    respond([]);
    await fetchWoItemBilledToDate('project-1', 'issuer-1', ['wo-1']);
    expect(query.in).toHaveBeenCalledWith('source_co_id', ['wo-1']);
    expect(query.eq).toHaveBeenNthCalledWith(1, 'invoices.project_id', 'project-1');
    expect(query.eq).toHaveBeenNthCalledWith(2, 'invoices.project_contracts.from_org_id', 'issuer-1');
  });

  it('surfaces read failures rather than allowing duplicate billing', async () => {
    respond([], new Error('billing read failed'));
    await expect(fetchWoItemBilledToDate('project-1', 'issuer-1', ['wo-1'])).rejects.toThrow('billing read failed');
  });

  it('does not reserve tax against the approved item value', async () => {
    respond([{ ...line('APPROVED', 80), description: 'Sales Tax (8%)' }]);
    const result = await fetchWoItemBilledToDate('project-1', 'issuer-1', ['wo-1']);
    expect(result.itemBilled.get('item-1')).toBe(0);
  });
});
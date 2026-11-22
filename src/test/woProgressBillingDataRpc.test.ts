import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));

import { fetchWoBilledToDate } from '@/lib/woProgressBillingData';

describe('authorized work-order billing read', () => {
  beforeEach(() => rpc.mockReset());

  it('uses one scoped read and preserves billed, draft, entry and legacy state', async () => {
    rpc.mockResolvedValue({
      data: [{
        co_id: 'co-1', billed: 500, draft: 125,
        entry_ids: ['entry-1', 'entry-2'], legacy_fully_billed: false,
      }],
      error: null,
    });
    const result = await fetchWoBilledToDate('project-1', 'org-1', ['co-1', 'co-2']);
    expect(rpc).toHaveBeenCalledWith('get_wo_billing_status', {
      p_project_id: 'project-1', p_org_id: 'org-1', p_co_ids: ['co-1', 'co-2'], p_direction: 'issued',
    });
    expect(result.get('co-1')).toMatchObject({ billed: 500, draft: 125, legacyFullyBilled: false });
    expect([...result.get('co-1')!.entryIds]).toEqual(['entry-1', 'entry-2']);
    expect(result.get('co-2')).toMatchObject({ billed: 0, draft: 0, legacyFullyBilled: false });
  });

  it('surfaces a failed read instead of presenting an empty billing state', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('read failed') });
    await expect(fetchWoBilledToDate('project-1', 'org-1', ['co-1'], 'received')).rejects.toThrow('read failed');
  });
});

import { describe, it, expect, vi } from 'vitest';
let rows: any[] = [];
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ not: async () => ({ data: rows }) }) }) }) } }));
import { resolvePoPricingOwner } from '@/lib/poPricingOwner';

describe('order material payer', () => {
  it('General Contractor pays when contract says GC handles materials', async () => {
    rows = [{ material_responsibility: 'GC', from_org_id: 'sub', to_org_id: 'gc' }];
    expect(await resolvePoPricingOwner('p', 'sub')).toBe('gc');
  });
  it('Subcontractor pays when contract says TC handles materials', async () => {
    rows = [{ material_responsibility: 'TC', from_org_id: 'sub', to_org_id: 'gc' }];
    expect(await resolvePoPricingOwner('p', 'gc')).toBe('sub');
  });
  it('ordering company pays when no contract or project', async () => {
    rows = [];
    expect(await resolvePoPricingOwner('p', 'me')).toBe('me');
    expect(await resolvePoPricingOwner(null, 'me')).toBe('me');
  });
});

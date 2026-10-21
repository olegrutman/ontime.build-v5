import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { summarizeActiveCatalog } from '@/hooks/useCatalogManager';

describe('catalog health counts', () => {
  const rows = [
    { id: 'a', category: 'Lumber', manufacturer: 'Canfor' },
    { id: 'b', category: 'Other', manufacturer: null },
    { id: 'c', category: 'Other', manufacturer: 'LP' },
  ];

  it('counts unpriced only among the given active rows', () => {
    // 'z' is a priced product that is not active and must not offset the count
    const s = summarizeActiveCatalog(rows, new Set(['a', 'z']));
    expect(s.activeCount).toBe(3);
    expect(s.unpricedCount).toBe(2);
  });

  it('counts uncategorized and manufacturers from active rows', () => {
    const s = summarizeActiveCatalog(rows, new Set());
    expect(s.uncategorizedCount).toBe(2);
    expect(s.manufacturers).toEqual(['Canfor', 'LP']);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fillMissingSkus } from '@/lib/poLineSku';

const { from, inIds } = vi.hoisted(() => {
  const inIds = vi.fn();
  const select = vi.fn(() => ({ in: inIds }));
  const from = vi.fn(() => ({ select }));
  return { from, inIds };
});
const catalogRows = [
  { id: 'catalog-2x4-16', supplier_sku: 'OTB-00285' },
  { id: 'catalog-hanger', supplier_sku: 'OTB-00689' },
];

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from } }));

describe('catalog product-code preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inIds.mockImplementation(async (_column: string, ids: string[]) => ({
      data: catalogRows.filter(row => ids.includes(row.id)),
      error: null,
    }));
  });

  it("restores a change-order picker line's missing product code from its exact catalog product", async () => {
    const [line] = await fillMissingSkus([{ catalog_item_id: 'catalog-2x4-16', supplier_sku: '', description: 'Doug Fir Framing board' }]);
    expect(line.supplier_sku).toBe('OTB-00285');
    expect(from).toHaveBeenCalledWith('catalog_items');
    expect(inIds).toHaveBeenCalledWith('id', ['catalog-2x4-16']);
  });

  it('keeps an explicitly saved product code unchanged', async () => {
    const [line] = await fillMissingSkus([{ catalog_item_id: 'catalog-2x4-16', supplier_sku: 'SUPPLIER-EDITED-CODE' }]);
    expect(line.supplier_sku).toBe('SUPPLIER-EDITED-CODE');
    expect(from).not.toHaveBeenCalled();
  });

  it('resolves several picked products without dropping custom lines', async () => {
    const lines = await fillMissingSkus([
      { catalog_item_id: 'catalog-2x4-16', supplier_sku: null },
      { catalog_item_id: 'catalog-hanger', supplier_sku: undefined },
      { catalog_item_id: '', supplier_sku: null, description: 'Custom field material' },
    ]);
    expect(lines.map(line => line.supplier_sku ?? null)).toEqual(['OTB-00285', 'OTB-00689', null]);
  });
});

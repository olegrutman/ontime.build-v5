import { describe, it, expect } from 'vitest';
import { itemValues, itemProgressAmount } from '@/lib/woItemBilling';

describe('per-item invoicing', () => {
  it('item values always add up to the order price', () => {
    const v = itemValues(1000, [{ id: 'a', weight: 1 }, { id: 'b', weight: 1 }, { id: 'c', weight: 1 }]);
    expect([...v.values()].reduce((s, x) => s + x, 0)).toBe(1000);
    expect(v.get('a')).toBe(333.33);
  });
  it('weights items by their priced labor', () => {
    const v = itemValues(1000, [{ id: 'a', weight: 300 }, { id: 'b', weight: 100 }]);
    expect(v.get('a')).toBe(750);
    expect(v.get('b')).toBe(250);
  });
  it('an item cannot be billed past its own remaining balance', () => {
    expect(itemProgressAmount(500, 50, 400)).toBe(100);
    expect(itemProgressAmount(500, 20, 0)).toBe(100);
  });
});

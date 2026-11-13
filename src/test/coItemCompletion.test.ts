import { describe, it, expect } from 'vitest';
import { completedItemClaims, isCompletedBillableItem } from '@/lib/coItemCompletion';

const items = [
  { id: 'one', approval_status: 'approved', completed_at: '2026-11-13' },
  { id: 'two', approval_status: 'approved', completed_at: null },
  { id: 'three', approval_status: 'rejected', completed_at: '2026-11-13' },
];
const entries = [{ id: 'a', co_line_item_id: 'one', line_total: 1000 }, { id: 'b', co_line_item_id: 'two', line_total: 500 }, { id: 'c', co_line_item_id: 'three', line_total: 300 }];
describe('individual scope completion billing', () => {
  it('makes only the completed approved item billable', () => {
    expect(items.map(isCompletedBillableItem)).toEqual([true, false, false]);
    expect(completedItemClaims(items, entries, new Set(), 1800)).toEqual([{ itemId: 'one', amount: 1000, entryIds: ['a'] }]);
  });
  it('never bills an entry reserved by an existing invoice twice', () => {
    expect(completedItemClaims(items, entries, new Set(['a']), 1800)).toEqual([]);
  });
  it('credits earlier progress billing before billing a completed item', () => {
    expect(completedItemClaims(items, entries, new Set(), 1000, 400)[0].amount).toBe(600);
  });
  it('does not exceed the remaining approved balance', () => {
    expect(completedItemClaims(items, entries, new Set(), 250)[0].amount).toBe(250);
  });
});
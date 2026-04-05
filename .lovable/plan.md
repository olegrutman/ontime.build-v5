

# Fix: SOV Total Changes When Editing Any Line Item Percentage

## Root Cause

The optimistic local state update in `useContractSOV.ts` (lines 888–908) has an **order mismatch bug**.

The `updates` array is ordered as `[editedItem, ...otherUnlockedItems]`. The last element of `updates` is designated as the "remainder absorber" — it gets `contractValue - runningTotal`.

But `items.map()` iterates in **display order** (by `sort_order`), not in `updates` array order. When the remainder-absorber item is encountered in `items.map()` before all other updated items have been processed, `runningTotal` is incomplete. The absorber gets `contractValue - (partial sum)` — which is too large.

**Example from screenshot**: User edits Punchlist (item 25, last in display). `updates = [Punchlist, item1, item2, ..., item24]`. `lastUpdateId = item24` (some mid-list item). When `items.map` reaches item24 in display order, it hasn't yet processed items 25 (Punchlist) or any items after item24, so `runningTotal` is short. Item24 gets an inflated value. Total becomes $525,000 instead of $500,000.

The RPC function processes `p_updates` in array order, so the **database values are correct** — but the UI shows wrong numbers until a page refresh.

## Fix

Replace the `items.map()` optimistic update with a two-pass approach:

**Pass 1**: Build a map of `id → { pct, value }` by iterating `updates` in array order (matching RPC logic). The last element absorbs the remainder.

**Pass 2**: Apply the map to `items` via `.map()` — simple lookup, no running total.

```typescript
// Pass 1: compute values in updates-array order (mirrors RPC)
const resultMap = new Map<string, { pct: number; val: number }>();
let runTotal = 0;
for (let i = 0; i < updates.length; i++) {
  const u = updates[i];
  let val: number;
  if (i === updates.length - 1) {
    val = Math.round((contractValue - runTotal) * 100) / 100;
  } else {
    val = Math.round((contractValue * u.pct / 100) * 100) / 100;
    runTotal += val;
  }
  resultMap.set(u.id, { pct: u.pct, val });
}

// Pass 2: apply to items
setSovItems(prev => ({
  ...prev,
  [sovId]: (prev[sovId] || []).map(item => {
    const r = resultMap.get(item.id);
    if (!r) return item;
    return { ...item, percent_of_contract: r.pct, value_amount: r.val };
  })
}));
```

### Files changed

| File | Change |
|------|--------|
| `src/hooks/useContractSOV.ts` | Replace lines 886–908 with two-pass optimistic update that processes values in `updates` array order |

### What is NOT changing
- RPC function `update_sov_line_percentages` (already correct)
- `useSOVPage.ts` (uses its own update logic)
- SOV UI components
- Database schema, RLS


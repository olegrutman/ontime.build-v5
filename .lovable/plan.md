

# Fix: SOV Normalization Ignores Locked Lines

## Bug

In `updateLinePct` (line 179-181), the normalization forces the updates array (changed line + unlocked lines) to sum to 100%. But **locked lines are excluded from updates**. Their percentages are added on top, so total = 100% + locked% = 103.1%.

The `deleteLine` function (line 226-229) correctly accounts for locked lines. `updateLinePct` does not.

## Fix

**File: `src/hooks/useSOVPage.ts`** — `updateLinePct` function

Change the normalization (lines 179-181) to account for locked lines, matching the pattern already used in `deleteLine`:

```ts
// Current (wrong):
const runningTotal = updates.slice(0, -1).reduce((s, u) => s + u.pct, 0);
updates[updates.length - 1].pct = Math.round((100 - runningTotal) * 100) / 100;

// Fixed:
const locked = items.filter((i, j) => j !== idx && i.is_locked);
const lockedTotal = locked.reduce((s, i) => s + (i.percent_of_contract || 0), 0);
const runningTotal = lockedTotal + updates.slice(0, -1).reduce((s, u) => s + u.pct, 0);
updates[updates.length - 1].pct = Math.round((100 - runningTotal) * 100) / 100;
```

This ensures locked lines + unlocked lines + changed line = exactly 100%.

| File | Change |
|------|--------|
| `src/hooks/useSOVPage.ts` | Add locked lines total to normalization in `updateLinePct` |


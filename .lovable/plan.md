

# SOV Bugs: Percentages Don't Sum to 100%

## Bugs Found

### Bug 1: AI-generated percentages not normalized (Root Cause)
**File: `supabase/functions/generate-sov/index.ts`** — Lines 211-229

The AI is asked to return percentages summing to 100%, but due to rounding, they rarely do exactly. The edge function saves them directly with no normalization pass. If the initial total is 100.35%, every subsequent slider adjustment inherits that error, and the normalization in `updateLinePct` forces the last item to absorb the entire drift (potentially going negative).

**Fix**: After parsing AI output, compute the actual sum, then scale all percentages so they sum to exactly 100.00%. Recalculate `value_amount`, `scheduled_value`, and `remaining_amount` from the normalized percentages.

### Bug 2: `Math.max(0, ...)` steals percentage silently
**File: `src/hooks/useSOVPage.ts`** — Line 176

When redistributing a delta across unlocked lines, `Math.max(0, adjusted)` prevents negative values but doesn't redistribute the clamped amount. If a line would go to -0.3% but gets clamped to 0%, that 0.3% is "lost" — inflating the sum and forcing the last item to absorb a larger negative value.

**Fix**: After the redistribution loop, check if any items were clamped. If so, calculate the excess and redistribute it across the remaining non-clamped, non-zero unlocked lines before normalizing.

### Bug 3: `addLine` uses invalid `source: 'manual'`
**File: `src/hooks/useSOVPage.ts`** — Line 278

The DB check constraint `project_sov_items_source_check` only allows `'template'` or `'user'`. Using `'manual'` causes a 400 error and the new line is never inserted.

**Fix**: Change `source: 'manual'` to `source: 'user'`.

### Bug 4: `addLine` has no normalization
**File: `src/hooks/useSOVPage.ts`** — Lines 242-283

After subtracting the default 1% proportionally from unlocked lines, there's no normalization pass. With rounding, the total drifts.

**Fix**: Add the same locked-line-aware normalization step used in `updateLinePct` and `deleteLine`.

## Fix Plan

### File: `supabase/functions/generate-sov/index.ts`
After parsing AI lines (line 181), add normalization:
```ts
const rawTotal = lines.reduce((s, l) => s + l.percent, 0);
if (Math.abs(rawTotal - 100) > 0.001) {
  const scale = 100 / rawTotal;
  for (const line of lines) {
    line.percent = Math.round(line.percent * scale * 100) / 100;
  }
  // Force last line to absorb rounding remainder
  const adjusted = lines.slice(0, -1).reduce((s, l) => s + l.percent, 0);
  lines[lines.length - 1].percent = Math.round((100 - adjusted) * 100) / 100;
}
```
Then redeploy the edge function.

### File: `src/hooks/useSOVPage.ts`

1. **`updateLinePct`** (lines 172-183): Replace `Math.max(0, ...)` with a two-pass approach — first compute adjusted values, then redistribute any negative amounts across positive unlocked lines, then normalize the last entry.

2. **`addLine`** (line 278): Change `source: 'manual'` → `source: 'user'`. Add normalization step after redistribution (same pattern as `deleteLine`).

## Files changed

| File | Change |
|------|--------|
| `supabase/functions/generate-sov/index.ts` | Add normalization pass after AI parsing; redeploy |
| `src/hooks/useSOVPage.ts` | Fix redistribution clamping in `updateLinePct`; fix `addLine` source + add normalization |


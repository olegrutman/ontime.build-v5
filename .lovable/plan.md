

# Fix: SOV Percentage Drift from Sequential Updates

## Root Cause

The `updateLinePct` function in `useSOVPage.ts` sends one PATCH request per unlocked line (up to 42 requests for a single slider change). Some of these hit database statement timeouts (error code 57014 visible in network logs), meaning those lines never get updated. The lost percentages accumulate, causing the total to drift below 100%.

## Fix

### File: `src/hooks/useSOVPage.ts` — `updateLinePct` function

1. **Batch all updates into a single RPC call** instead of N individual PATCHes. Create a database function `update_sov_line_percentages` that accepts the full set of line IDs + new percentages and updates them all in one transaction.

2. **Add a normalization step**: after computing the redistribution, force the last unlocked line to absorb any rounding remainder so the total is always exactly 100.00%.

3. **Apply the same batch pattern** to `deleteLine` and `addLine` which have the same N-update problem.

### Database Migration

Create an RPC function:
```sql
CREATE OR REPLACE FUNCTION update_sov_line_percentages(
  p_updates jsonb,
  p_contract_value numeric,
  p_retainage_pct numeric
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  item jsonb;
  pct numeric;
  val numeric;
  ret numeric;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    pct := (item->>'pct')::numeric;
    val := p_contract_value * pct / 100;
    ret := val * p_retainage_pct / 100;
    UPDATE project_sov_items SET
      percent_of_contract = pct,
      value_amount = val,
      scheduled_value = val - ret,
      remaining_amount = val
    WHERE id = (item->>'id')::uuid;
  END LOOP;
END;
$$;
```

### File: `src/hooks/useSOVPage.ts`

**`updateLinePct`**: Compute all new percentages in memory, normalize the last unlocked line to force total = 100%, then call the RPC once:
```ts
const updates = [{ id: lineId, pct: newPct }];
// ... compute redistributed values for unlocked lines ...
// Force last unlocked to absorb rounding remainder
const runningTotal = updates.slice(0, -1).reduce((s, u) => s + u.pct, 0);
updates[updates.length - 1].pct = Math.round((100 - runningTotal) * 100) / 100;

await supabase.rpc('update_sov_line_percentages', {
  p_updates: updates,
  p_contract_value: contractValue,
  p_retainage_pct: prereqs?.retainagePct || 0,
});
```

**`deleteLine`** and **`addLine`**: Same pattern — compute all new percentages, normalize, single RPC call.

### Files changed

| File | Change |
|------|--------|
| Migration SQL | Create `update_sov_line_percentages` RPC function |
| `src/hooks/useSOVPage.ts` | Replace sequential PATCHes with single RPC call in `updateLinePct`, `deleteLine`, `addLine`; add normalization step |


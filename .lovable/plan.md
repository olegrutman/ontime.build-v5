

# Fix: SOV Dollar Values Must Sum to Contract Price

## Problem
Each SOV line's dollar value is computed independently as `contract_value × pct / 100`. With 35 lines, small fractional-cent differences accumulate so the total is $99,995 instead of $100,000 — even though percentages sum to exactly 100%.

## Root Cause
The `update_sov_line_percentages` RPC does not round values to cents, and no line absorbs the cumulative rounding remainder.

## Fix

### 1. `supabase/migrations/` — Update the RPC

Modify `update_sov_line_percentages` to:
1. Round each `val` to 2 decimal places
2. Track a running total of all computed values
3. On the **last** item in the array, set `val = p_contract_value - running_total` so the sum is exact

```sql
CREATE OR REPLACE FUNCTION public.update_sov_line_percentages(
  p_updates jsonb, p_contract_value numeric, p_retainage_pct numeric
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item jsonb;
  pct numeric;
  val numeric;
  ret numeric;
  running_total numeric := 0;
  total_items int;
  current_idx int := 0;
BEGIN
  total_items := jsonb_array_length(p_updates);
  FOR item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    current_idx := current_idx + 1;
    pct := (item->>'pct')::numeric;
    IF current_idx = total_items THEN
      val := p_contract_value - running_total;
    ELSE
      val := ROUND(p_contract_value * pct / 100, 2);
      running_total := running_total + val;
    END IF;
    ret := ROUND(val * p_retainage_pct / 100, 2);
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

### 2. `src/hooks/useContractSOV.ts` — Match local state

Update the local state update (line ~891) to use the same remainder-absorption pattern so the UI immediately reflects correct totals without waiting for a refetch.

### 3. Also fix the generate-sov edge function

The `generate-sov` edge function likely has the same issue when initially inserting items. Add rounding + remainder absorption there too.

### Files Changed
- New migration SQL — updated `update_sov_line_percentages` RPC
- `src/hooks/useContractSOV.ts` — local state rounding fix
- `supabase/functions/generate-sov/index.ts` — round initial values


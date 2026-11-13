UPDATE public.co_labor_entries
SET
  hourly_rate = CASE
    WHEN pricing_mode = 'hourly' AND base_hourly_rate IS NOT NULL THEN base_hourly_rate
    ELSE hourly_rate
  END,
  lump_sum = CASE
    WHEN pricing_mode = 'lump_sum' AND base_lump_sum IS NOT NULL THEN base_lump_sum
    ELSE lump_sum
  END,
  markup_percent = 0
WHERE is_actual_cost = true
  AND COALESCE(markup_percent, 0) <> 0;
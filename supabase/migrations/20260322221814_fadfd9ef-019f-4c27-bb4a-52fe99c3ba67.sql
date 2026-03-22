CREATE OR REPLACE FUNCTION public.update_sov_line_percentages(
  p_updates jsonb,
  p_contract_value numeric,
  p_retainage_pct numeric
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
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
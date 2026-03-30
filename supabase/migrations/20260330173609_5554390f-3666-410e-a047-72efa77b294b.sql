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
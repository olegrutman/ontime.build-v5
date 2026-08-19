-- Avoid "CO-123 — CO-123 · date" duplication in CO SOV names.
CREATE OR REPLACE FUNCTION public.co_sov_display_name(_co_number text, _title text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN COALESCE(NULLIF(btrim(_title), ''), '') = '' OR btrim(_title) ILIKE COALESCE(_co_number, '~') || '%'
      THEN COALESCE(NULLIF(_co_number, ''), 'Change order')
    ELSE COALESCE(NULLIF(_co_number, ''), 'CO') || ' — ' || btrim(_title)
  END;
$$;
REVOKE ALL ON FUNCTION public.co_sov_display_name(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.co_sov_display_name(text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.build_co_sov(_co_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _co RECORD; _sov_id uuid; _contract_id uuid; _contract_mat text;
  _mat_resp text; _eq_resp text;
  _mats numeric := 0; _eq numeric := 0; _total numeric := 0; _sort int := 0;
BEGIN
  SELECT id, project_id, co_number, title, status, pricing_type,
         co_material_responsible_override, materials_responsible,
         co_equipment_responsible_override, equipment_responsible
    INTO _co
  FROM public.change_orders WHERE id = _co_id;

  IF _co.id IS NULL OR LOWER(COALESCE(_co.status, '')) <> 'approved' THEN RETURN NULL; END IF;
  IF LOWER(COALESCE(_co.pricing_type, 'fixed')) IN ('tm', 'nte') THEN RETURN NULL; END IF;

  SELECT id INTO _sov_id FROM public.project_sov WHERE source_co_id = _co_id;
  IF _sov_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.invoices WHERE sov_id = _sov_id) THEN
    RETURN _sov_id;
  END IF;

  SELECT pc.id INTO _contract_id FROM public.project_contracts pc
  WHERE pc.project_id = _co.project_id
  ORDER BY (COALESCE(pc.from_role, '') = 'Owner'), pc.created_at LIMIT 1;

  SELECT pc.material_responsibility INTO _contract_mat FROM public.project_contracts pc
  WHERE pc.project_id = _co.project_id AND pc.material_responsibility IS NOT NULL
  ORDER BY (COALESCE(pc.from_role, '') = 'Owner'), pc.created_at LIMIT 1;

  _mat_resp := COALESCE(_co.co_material_responsible_override, _co.materials_responsible, _contract_mat, 'TC');
  _eq_resp  := COALESCE(_co.co_equipment_responsible_override, _co.equipment_responsible, 'TC');

  IF _mat_resp <> 'GC' THEN
    SELECT COALESCE(SUM(billed_amount), 0) INTO _mats FROM public.co_material_items WHERE co_id = _co_id;
  END IF;
  IF _eq_resp <> 'GC' THEN
    SELECT COALESCE(SUM(billed_amount), 0) INTO _eq FROM public.co_equipment_items WHERE co_id = _co_id;
  END IF;

  IF _sov_id IS NULL THEN
    INSERT INTO public.project_sov (project_id, contract_id, sov_name, sov_kind, source_co_id)
    VALUES (_co.project_id, _contract_id, public.co_sov_display_name(_co.co_number, _co.title), 'change_order', _co_id)
    RETURNING id INTO _sov_id;
  ELSE
    DELETE FROM public.project_sov_items WHERE sov_id = _sov_id;
    UPDATE public.project_sov SET sov_name = public.co_sov_display_name(_co.co_number, _co.title) WHERE id = _sov_id;
  END IF;

  WITH lines AS (
    SELECT li.id, li.item_name, li.sort_order,
           COALESCE((SELECT SUM(le.line_total) FROM public.co_labor_entries le
                     WHERE le.co_line_item_id = li.id AND NOT le.is_actual_cost), 0) AS amount
    FROM public.co_line_items li WHERE li.co_id = _co_id
  )
  INSERT INTO public.project_sov_items
    (project_id, sov_id, sort_order, item_name, item_group, source, value_amount, scheduled_value)
  SELECT _co.project_id, _sov_id,
         ROW_NUMBER() OVER (ORDER BY COALESCE(sort_order, 0), item_name),
         COALESCE(NULLIF(item_name, ''), 'CO line'), 'Change order', 'template', amount, amount
  FROM lines WHERE amount > 0;

  SELECT COALESCE(MAX(sort_order), 0) INTO _sort FROM public.project_sov_items WHERE sov_id = _sov_id;

  IF _mats > 0 THEN
    _sort := _sort + 1;
    INSERT INTO public.project_sov_items
      (project_id, sov_id, sort_order, item_name, item_group, source, value_amount, scheduled_value)
    VALUES (_co.project_id, _sov_id, _sort, 'Materials', 'Change order', 'template', _mats, _mats);
  END IF;
  IF _eq > 0 THEN
    _sort := _sort + 1;
    INSERT INTO public.project_sov_items
      (project_id, sov_id, sort_order, item_name, item_group, source, value_amount, scheduled_value)
    VALUES (_co.project_id, _sov_id, _sort, 'Equipment', 'Change order', 'template', _eq, _eq);
  END IF;

  SELECT COALESCE(SUM(value_amount), 0) INTO _total FROM public.project_sov_items WHERE sov_id = _sov_id;
  IF _total > 0 THEN
    UPDATE public.project_sov_items
    SET percent_of_contract = ROUND((value_amount / _total) * 100, 2), remaining_amount = value_amount
    WHERE sov_id = _sov_id;
  END IF;

  RETURN _sov_id;
END;
$$;
REVOKE ALL ON FUNCTION public.build_co_sov(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.build_co_sov(uuid) TO service_role;

UPDATE public.project_sov s
SET sov_name = public.co_sov_display_name(co.co_number, co.title)
FROM public.change_orders co
WHERE s.source_co_id = co.id AND s.sov_kind = 'change_order';
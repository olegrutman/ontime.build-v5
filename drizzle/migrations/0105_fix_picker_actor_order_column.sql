DO $fix$
DECLARE v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.save_picker_order(uuid, uuid, jsonb)'::regprocedure) INTO v_definition;
  IF v_definition IS NULL OR position('ORDER BY pp.created_at' IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Expected picker actor ordering was not found';
  END IF;
  v_definition := replace(v_definition, 'ORDER BY pp.created_at', 'ORDER BY o.created_at');
  EXECUTE v_definition;
END;
$fix$;
CREATE OR REPLACE FUNCTION public.auto_create_schedule_from_sov()
RETURNS TRIGGER AS $$
DECLARE
  v_from_role TEXT;
  v_to_role TEXT;
BEGIN
  SELECT pc.from_role, pc.to_role
  INTO v_from_role, v_to_role
  FROM public.project_sov ps
  JOIN public.project_contracts pc ON pc.id = ps.contract_id
  WHERE ps.id = NEW.sov_id;

  IF v_from_role = 'Trade Contractor' AND v_to_role = 'General Contractor' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.project_schedule_items 
      WHERE sov_item_id = NEW.id
    ) THEN
      INSERT INTO public.project_schedule_items (
        project_id, title, item_type, sov_item_id,
        start_date, progress, sort_order, dependency_ids
      ) VALUES (
        NEW.project_id, NEW.item_name, 'task', NEW.id,
        CURRENT_DATE, 0, NEW.sort_order, '{}'::uuid[]
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
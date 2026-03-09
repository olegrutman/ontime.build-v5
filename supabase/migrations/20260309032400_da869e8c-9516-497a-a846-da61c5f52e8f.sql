
CREATE OR REPLACE FUNCTION public.auto_create_schedule_from_sov()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.project_schedule_items 
    WHERE sov_item_id = NEW.id
  ) THEN
    INSERT INTO public.project_schedule_items (
      project_id, title, item_type, sov_item_id,
      start_date, progress, sort_order, dependency_ids
    ) VALUES (
      NEW.project_id, NEW.item_name, 'task', NEW.id,
      CURRENT_DATE, 0, NEW.sort_order, '{}'::text[]
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_auto_create_schedule_from_sov
  AFTER INSERT ON public.project_sov_items
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_schedule_from_sov();

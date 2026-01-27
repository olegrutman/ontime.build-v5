-- Create function to check if all materials are priced and update checklist
CREATE OR REPLACE FUNCTION public.update_materials_priced_checklist()
RETURNS TRIGGER AS $$
DECLARE
  all_priced BOOLEAN;
BEGIN
  -- Check if ALL materials for this change order have unit_cost > 0
  SELECT NOT EXISTS (
    SELECT 1 FROM change_order_materials 
    WHERE change_order_id = COALESCE(NEW.change_order_id, OLD.change_order_id)
    AND (unit_cost IS NULL OR unit_cost <= 0)
  ) INTO all_priced;
  
  -- Update the checklist
  UPDATE change_order_checklist
  SET materials_priced = all_priced,
      updated_at = now()
  WHERE change_order_id = COALESCE(NEW.change_order_id, OLD.change_order_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for INSERT, UPDATE, DELETE on change_order_materials
CREATE TRIGGER update_materials_priced_on_change
AFTER INSERT OR UPDATE OR DELETE ON public.change_order_materials
FOR EACH ROW
EXECUTE FUNCTION public.update_materials_priced_checklist();
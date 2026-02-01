-- Update the trigger function to include exterior_feature in location completeness check
CREATE OR REPLACE FUNCTION public.update_co_checklist_location()
RETURNS TRIGGER AS $$
DECLARE
  v_location_complete BOOLEAN;
BEGIN
  -- Check if location is complete - now includes exterior_feature for outside locations
  v_location_complete := (
    NEW.location_data IS NOT NULL 
    AND (
      -- Inside location: room_area or level
      (NEW.location_data->>'room_area') IS NOT NULL AND (NEW.location_data->>'room_area') != ''
      OR (NEW.location_data->>'level') IS NOT NULL AND (NEW.location_data->>'level') != ''
      -- Outside location: exterior_feature
      OR (NEW.location_data->>'exterior_feature') IS NOT NULL AND (NEW.location_data->>'exterior_feature') != ''
    )
  );

  -- Update the checklist
  UPDATE change_order_checklist
  SET 
    location_complete = v_location_complete,
    updated_at = now()
  WHERE change_order_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recalculate existing records to fix any outside locations
UPDATE change_order_checklist cl
SET 
  location_complete = (
    SELECT 
      cop.location_data IS NOT NULL 
      AND (
        (cop.location_data->>'room_area') IS NOT NULL AND (cop.location_data->>'room_area') != ''
        OR (cop.location_data->>'level') IS NOT NULL AND (cop.location_data->>'level') != ''
        OR (cop.location_data->>'exterior_feature') IS NOT NULL AND (cop.location_data->>'exterior_feature') != ''
      )
    FROM change_order_projects cop
    WHERE cop.id = cl.change_order_id
  ),
  updated_at = now();
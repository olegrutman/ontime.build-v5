-- Fix location_complete trigger - auto-set when location_data has room_area or level
CREATE OR REPLACE FUNCTION public.update_co_checklist_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_location_complete BOOLEAN;
BEGIN
  -- Location is complete if location_data has at least room_area or level filled in
  v_location_complete := (
    NEW.location_data IS NOT NULL 
    AND (
      (NEW.location_data->>'room_area') IS NOT NULL AND (NEW.location_data->>'room_area') != ''
      OR (NEW.location_data->>'level') IS NOT NULL AND (NEW.location_data->>'level') != ''
    )
  );
  
  -- Update checklist
  UPDATE change_order_checklist
  SET location_complete = v_location_complete, updated_at = now()
  WHERE change_order_id = NEW.id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_checklist_location ON change_order_projects;
CREATE TRIGGER update_checklist_location
AFTER INSERT OR UPDATE OF location_data ON change_order_projects
FOR EACH ROW EXECUTE FUNCTION update_co_checklist_location();


-- Fix scope_complete trigger - auto-set when description exists
CREATE OR REPLACE FUNCTION public.update_co_checklist_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_scope_complete BOOLEAN;
BEGIN
  -- Scope is complete if description is not null and not empty
  v_scope_complete := (NEW.description IS NOT NULL AND TRIM(NEW.description) != '');
  
  -- Update checklist
  UPDATE change_order_checklist
  SET scope_complete = v_scope_complete, updated_at = now()
  WHERE change_order_id = NEW.id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_checklist_scope ON change_order_projects;
CREATE TRIGGER update_checklist_scope
AFTER INSERT OR UPDATE OF description ON change_order_projects
FOR EACH ROW EXECUTE FUNCTION update_co_checklist_scope();


-- Fix fc_hours_locked logic - should be true ONLY if FC hours exist AND all are locked
-- If no FC hours exist at all, this should be false (not ready)
CREATE OR REPLACE FUNCTION public.update_co_checklist_fc_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_all_locked BOOLEAN;
  v_has_fc_hours BOOLEAN;
BEGIN
  -- Check if there are any FC hours entries
  SELECT EXISTS (
    SELECT 1 FROM change_order_fc_hours
    WHERE change_order_id = COALESCE(NEW.change_order_id, OLD.change_order_id)
  ) INTO v_has_fc_hours;
  
  -- If no FC hours exist, not locked
  IF NOT v_has_fc_hours THEN
    v_all_locked := false;
  ELSE
    -- Check if ALL FC hours for this change order are locked
    SELECT NOT EXISTS (
      SELECT 1 FROM change_order_fc_hours
      WHERE change_order_id = COALESCE(NEW.change_order_id, OLD.change_order_id)
      AND is_locked = false
    ) INTO v_all_locked;
  END IF;

  -- Update checklist
  UPDATE change_order_checklist
  SET fc_hours_locked = v_all_locked, updated_at = now()
  WHERE change_order_id = COALESCE(NEW.change_order_id, OLD.change_order_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Re-create trigger (function already updated above)
DROP TRIGGER IF EXISTS update_checklist_fc_hours ON change_order_fc_hours;
CREATE TRIGGER update_checklist_fc_hours
AFTER INSERT OR UPDATE OF is_locked OR DELETE ON change_order_fc_hours
FOR EACH ROW EXECUTE FUNCTION update_co_checklist_fc_hours();


-- Now update existing work orders to recalculate their checklist status
-- Update location_complete for all existing work orders
UPDATE change_order_checklist cl
SET location_complete = (
  SELECT 
    cop.location_data IS NOT NULL 
    AND (
      (cop.location_data->>'room_area') IS NOT NULL AND (cop.location_data->>'room_area') != ''
      OR (cop.location_data->>'level') IS NOT NULL AND (cop.location_data->>'level') != ''
    )
  FROM change_order_projects cop
  WHERE cop.id = cl.change_order_id
),
scope_complete = (
  SELECT cop.description IS NOT NULL AND TRIM(cop.description) != ''
  FROM change_order_projects cop
  WHERE cop.id = cl.change_order_id
),
updated_at = now();

-- Update fc_hours_locked for all existing work orders
UPDATE change_order_checklist cl
SET fc_hours_locked = (
  SELECT 
    EXISTS (SELECT 1 FROM change_order_fc_hours fch WHERE fch.change_order_id = cl.change_order_id)
    AND NOT EXISTS (
      SELECT 1 FROM change_order_fc_hours fch 
      WHERE fch.change_order_id = cl.change_order_id AND fch.is_locked = false
    )
),
updated_at = now();
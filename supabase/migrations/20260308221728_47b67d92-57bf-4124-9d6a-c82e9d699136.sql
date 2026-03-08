
CREATE OR REPLACE FUNCTION public.update_co_checklist_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_location_complete boolean;
BEGIN
  v_location_complete := (
    NEW.location_data IS NOT NULL
    AND NEW.location_data::text <> '{}'::text
    AND NEW.location_data::text <> 'null'
    AND (
      -- Interior: has room_area or level
      (NEW.location_data->>'room_area') IS NOT NULL
      OR (NEW.location_data->>'level') IS NOT NULL
      -- Exterior: has exterior_level or exterior_feature_type
      OR (NEW.location_data->>'exterior_level') IS NOT NULL
      OR (NEW.location_data->>'exterior_feature_type') IS NOT NULL
    )
  );

  INSERT INTO change_order_checklist (change_order_id, location_complete, updated_at)
  VALUES (NEW.id, v_location_complete, now())
  ON CONFLICT (change_order_id)
  DO UPDATE SET location_complete = v_location_complete, updated_at = now();

  RETURN NEW;
END;
$$;

-- Backfill existing exterior work orders
UPDATE change_order_checklist SET location_complete = true, updated_at = now()
WHERE change_order_id IN (
  SELECT id FROM change_order_projects
  WHERE location_data IS NOT NULL
    AND (
      (location_data->>'exterior_level') IS NOT NULL
      OR (location_data->>'exterior_feature_type') IS NOT NULL
    )
);

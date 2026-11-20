CREATE OR REPLACE FUNCTION public.protect_crew_labor_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  content_changed boolean := false;
  review_changed boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    review_changed :=
      NEW.crew_review_status IS DISTINCT FROM OLD.crew_review_status OR
      NEW.crew_reviewed_by_user_id IS DISTINCT FROM OLD.crew_reviewed_by_user_id OR
      NEW.crew_reviewed_at IS DISTINCT FROM OLD.crew_reviewed_at OR
      NEW.crew_rejection_note IS DISTINCT FROM OLD.crew_rejection_note;

    IF review_changed AND current_setting('app.crew_labor_review', true) = 'on' THEN
      RETURN NEW;
    END IF;

    -- line_total is generated after BEFORE triggers, so it cannot be compared
    -- here. Its source hours/rates/amounts are compared individually instead.
    content_changed :=
      NEW.co_line_item_id IS DISTINCT FROM OLD.co_line_item_id OR
      NEW.org_id IS DISTINCT FROM OLD.org_id OR
      NEW.entered_by_role IS DISTINCT FROM OLD.entered_by_role OR
      NEW.entry_date IS DISTINCT FROM OLD.entry_date OR
      NEW.pricing_mode IS DISTINCT FROM OLD.pricing_mode OR
      NEW.hours IS DISTINCT FROM OLD.hours OR
      NEW.hourly_rate IS DISTINCT FROM OLD.hourly_rate OR
      NEW.lump_sum IS DISTINCT FROM OLD.lump_sum OR
      NEW.description IS DISTINCT FROM OLD.description OR
      NEW.is_actual_cost IS DISTINCT FROM OLD.is_actual_cost OR
      NEW.base_hourly_rate IS DISTINCT FROM OLD.base_hourly_rate OR
      NEW.base_lump_sum IS DISTINCT FROM OLD.base_lump_sum OR
      NEW.markup_percent IS DISTINCT FROM OLD.markup_percent OR
      NEW.crew_size IS DISTINCT FROM OLD.crew_size OR
      NEW.days IS DISTINCT FROM OLD.days OR
      NEW.hours_per_day IS DISTINCT FROM OLD.hours_per_day;
  END IF;

  IF NEW.entered_by_role = 'FC' AND NOT NEW.is_actual_cost THEN
    IF TG_OP = 'INSERT' OR content_changed THEN
      NEW.crew_review_status := 'pending';
      NEW.crew_reviewed_by_user_id := NULL;
      NEW.crew_reviewed_at := NULL;
      NEW.crew_rejection_note := NULL;
    ELSIF review_changed THEN
      RAISE EXCEPTION 'Crew labor review decisions require the authorized review action';
    END IF;
  ELSE
    NEW.crew_review_status := NULL;
    NEW.crew_reviewed_by_user_id := NULL;
    NEW.crew_reviewed_at := NULL;
    NEW.crew_rejection_note := NULL;
  END IF;

  RETURN NEW;
END;
$function$;
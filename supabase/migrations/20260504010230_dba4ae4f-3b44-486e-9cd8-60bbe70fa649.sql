
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS tc_markup_visibility text NOT NULL DEFAULT 'hidden';

-- Use a validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_tc_markup_visibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tc_markup_visibility NOT IN ('hidden', 'summary', 'detailed') THEN
    RAISE EXCEPTION 'tc_markup_visibility must be hidden, summary, or detailed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_tc_markup_visibility ON public.projects;
CREATE TRIGGER trg_validate_tc_markup_visibility
  BEFORE INSERT OR UPDATE OF tc_markup_visibility ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tc_markup_visibility();

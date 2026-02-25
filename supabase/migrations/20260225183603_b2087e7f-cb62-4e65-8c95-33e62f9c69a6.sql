
CREATE OR REPLACE FUNCTION public.validate_designated_supplier_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'invited', 'removed') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be active, invited, or removed.', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

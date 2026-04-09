CREATE OR REPLACE FUNCTION public.resolve_contract_org_ids()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Resolve from_org_id if NULL
  IF NEW.from_org_id IS NULL AND NEW.from_role IS NOT NULL AND NEW.project_id IS NOT NULL THEN
    SELECT org_id INTO NEW.from_org_id
    FROM project_team
    WHERE project_id = NEW.project_id
      AND role = NEW.from_role
      AND org_id IS NOT NULL
    LIMIT 1;
  END IF;

  -- Resolve to_org_id if NULL
  IF NEW.to_org_id IS NULL AND NEW.to_role IS NOT NULL AND NEW.project_id IS NOT NULL THEN
    SELECT org_id INTO NEW.to_org_id
    FROM project_team
    WHERE project_id = NEW.project_id
      AND role = NEW.to_role
      AND org_id IS NOT NULL
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_resolve_contract_org_ids
BEFORE INSERT OR UPDATE ON public.project_contracts
FOR EACH ROW
EXECUTE FUNCTION public.resolve_contract_org_ids();
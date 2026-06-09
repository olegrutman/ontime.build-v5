
-- 1. Trigger: when a project is created by a Supplier org, mark it as needing buyer setup
CREATE OR REPLACE FUNCTION public.flag_supplier_created_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_type text;
BEGIN
  IF NEW.created_by_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT type INTO creator_type
  FROM public.organizations
  WHERE id = NEW.created_by_org_id;

  IF creator_type = 'SUPPLIER' THEN
    NEW.setup_completion_required := TRUE;
    IF NEW.adopted_from_supplier_org_id IS NULL THEN
      NEW.adopted_from_supplier_org_id := NEW.created_by_org_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flag_supplier_created_project ON public.projects;
CREATE TRIGGER trg_flag_supplier_created_project
BEFORE INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.flag_supplier_created_project();

-- 2. Helper: determine if a buyer org has fully completed setup for a project
CREATE OR REPLACE FUNCTION public.project_buyer_setup_complete(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_contracts pc
    WHERE pc.project_id = p_project_id
      AND pc.to_role IN ('GC','TC')
      AND COALESCE(pc.contract_sum, 0) > 0
  )
  AND EXISTS (
    SELECT 1
    FROM public.project_scope_details psd
    WHERE psd.project_id = p_project_id
      AND psd.home_type IS NOT NULL
  );
$$;

-- 3. Backfill: flag every existing supplier-created project that isn't already complete
UPDATE public.projects p
SET
  setup_completion_required = TRUE,
  adopted_from_supplier_org_id = COALESCE(p.adopted_from_supplier_org_id, p.created_by_org_id)
FROM public.organizations o
WHERE p.created_by_org_id = o.id
  AND o.type = 'SUPPLIER'
  AND COALESCE(p.setup_completion_required, FALSE) = FALSE
  AND NOT public.project_buyer_setup_complete(p.id);

-- 4. Clear the flag for any project that already has buyer contract + scope
UPDATE public.projects p
SET setup_completion_required = FALSE
WHERE COALESCE(p.setup_completion_required, FALSE) = TRUE
  AND public.project_buyer_setup_complete(p.id);


-- Add adoption flags to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS setup_completion_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS adopted_from_supplier_org_id uuid REFERENCES public.organizations(id);

COMMENT ON COLUMN public.projects.setup_completion_required IS
  'True when a buyer (GC/TC) has adopted a supplier-created project shell and still needs to finish setup (contract, scope, SOV, team).';
COMMENT ON COLUMN public.projects.adopted_from_supplier_org_id IS
  'Supplier organization that originally created this project shell, if any.';

-- Adoption trigger: when a supplier estimate is approved, automatically
-- adopt the project for the approving buyer org (GC or TC).
CREATE OR REPLACE FUNCTION public.adopt_project_on_estimate_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_org_id uuid;
  v_buyer_role text;
  v_project_created_by_org uuid;
  v_project_creator_type text;
  v_existing_participant uuid;
  v_existing_contract uuid;
BEGIN
  -- Only fire on transition into APPROVED
  IF NEW.status <> 'APPROVED' OR (TG_OP = 'UPDATE' AND OLD.status = 'APPROVED') THEN
    RETURN NEW;
  END IF;

  IF NEW.approved_by IS NULL OR NEW.project_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find the project creator's org and type
  SELECT p.created_by_org_id, o.type::text
    INTO v_project_created_by_org, v_project_creator_type
    FROM public.projects p
    LEFT JOIN public.organizations o ON o.id = p.created_by_org_id
    WHERE p.id = NEW.project_id;

  -- Only proceed if the project was created by a supplier (shell project)
  IF v_project_creator_type <> 'SUPPLIER' THEN
    RETURN NEW;
  END IF;

  -- Resolve the approver's GC or TC org (first match wins)
  SELECT uor.organization_id, o.type::text
    INTO v_buyer_org_id, v_buyer_role
    FROM public.user_org_roles uor
    JOIN public.organizations o ON o.id = uor.organization_id
    WHERE uor.user_id = NEW.approved_by
      AND o.type IN ('GC', 'TC')
    ORDER BY uor.created_at
    LIMIT 1;

  IF v_buyer_org_id IS NULL THEN
    -- Approver is not a GC/TC (e.g. supplier teammate); nothing to adopt
    RETURN NEW;
  END IF;

  -- Ensure participant row exists for the buyer
  SELECT id INTO v_existing_participant
    FROM public.project_participants
    WHERE project_id = NEW.project_id AND organization_id = v_buyer_org_id;

  IF v_existing_participant IS NULL THEN
    INSERT INTO public.project_participants (
      project_id, organization_id, role, invite_status, invited_by, accepted_at
    ) VALUES (
      NEW.project_id, v_buyer_org_id, v_buyer_role::app_role, 'ACCEPTED', NEW.approved_by, now()
    );
  END IF;

  -- Ensure supplier -> buyer contract exists, seeded with the estimate total
  SELECT id INTO v_existing_contract
    FROM public.project_contracts
    WHERE project_id = NEW.project_id
      AND from_org_id = NEW.supplier_org_id
      AND to_org_id = v_buyer_org_id;

  IF v_existing_contract IS NULL THEN
    INSERT INTO public.project_contracts (
      project_id, from_org_id, to_org_id, from_role, to_role,
      contract_sum, status, created_by_user_id
    ) VALUES (
      NEW.project_id, NEW.supplier_org_id, v_buyer_org_id, 'Supplier', v_buyer_role,
      NEW.total_amount, 'Accepted', NEW.approved_by
    );
  END IF;

  -- Flag the project as needing completion (only flips true once)
  UPDATE public.projects
     SET setup_completion_required = true,
         adopted_from_supplier_org_id = COALESCE(adopted_from_supplier_org_id, NEW.supplier_org_id)
   WHERE id = NEW.project_id
     AND setup_completion_required = false
     AND adopted_from_supplier_org_id IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS adopt_project_on_estimate_approval ON public.supplier_estimates;
CREATE TRIGGER adopt_project_on_estimate_approval
  AFTER INSERT OR UPDATE OF status ON public.supplier_estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.adopt_project_on_estimate_approval();

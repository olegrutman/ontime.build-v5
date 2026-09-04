CREATE OR REPLACE FUNCTION public.adopt_project_on_estimate_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_buyer_org_id uuid;
  v_buyer_role text;
  v_buyer_role_label text;
  v_project_created_by_org uuid;
  v_project_creator_type text;
  v_existing_participant uuid;
  v_existing_contract uuid;
BEGIN
  IF NEW.status <> 'APPROVED' OR (TG_OP = 'UPDATE' AND OLD.status = 'APPROVED') THEN
    RETURN NEW;
  END IF;

  IF NEW.approved_by IS NULL OR NEW.project_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.created_by_org_id, o.type::text
    INTO v_project_created_by_org, v_project_creator_type
    FROM public.projects p
    LEFT JOIN public.organizations o ON o.id = p.created_by_org_id
    WHERE p.id = NEW.project_id;

  IF v_project_creator_type <> 'SUPPLIER' THEN
    RETURN NEW;
  END IF;

  SELECT uor.organization_id, o.type::text
    INTO v_buyer_org_id, v_buyer_role
    FROM public.user_org_roles uor
    JOIN public.organizations o ON o.id = uor.organization_id
    WHERE uor.user_id = NEW.approved_by
      AND o.type IN ('GC', 'TC')
    ORDER BY uor.created_at
    LIMIT 1;

  IF v_buyer_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_buyer_role_label := CASE v_buyer_role
    WHEN 'GC' THEN 'General Contractor'
    WHEN 'TC' THEN 'Trade Contractor'
    ELSE v_buyer_role
  END;

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
      NEW.project_id, NEW.supplier_org_id, v_buyer_org_id, 'Supplier', v_buyer_role_label,
      NEW.total_amount, 'Accepted', NEW.approved_by
    );
  END IF;

  UPDATE public.projects
     SET setup_completion_required = true,
         adopted_from_supplier_org_id = COALESCE(adopted_from_supplier_org_id, NEW.supplier_org_id)
   WHERE id = NEW.project_id
     AND setup_completion_required = false
     AND adopted_from_supplier_org_id IS NULL;

  RETURN NEW;
END;
$function$;
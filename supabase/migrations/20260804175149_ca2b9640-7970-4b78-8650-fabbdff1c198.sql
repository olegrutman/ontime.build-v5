CREATE OR REPLACE FUNCTION public.validate_return()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('DRAFT', 'SUBMITTED', 'SUPPLIER_REVIEW', 'APPROVED', 'REJECTED', 'SCHEDULED', 'PICKED_UP', 'PRICED', 'CLOSED') THEN
    RAISE EXCEPTION 'Invalid return status: %', NEW.status;
  END IF;
  IF NEW.reason NOT IN ('Extra', 'Wrong', 'Estimate Over', 'Damaged', 'Other') THEN
    RAISE EXCEPTION 'Invalid return reason: %', NEW.reason;
  END IF;
  IF NEW.reason = 'Wrong' AND (NEW.wrong_type IS NULL OR NEW.wrong_type NOT IN ('Supplier Error', 'Contractor Error')) THEN
    RAISE EXCEPTION 'wrong_type required when reason is Wrong';
  END IF;
  IF NEW.reason = 'Other' AND (NEW.reason_notes IS NULL OR NEW.reason_notes = '') THEN
    RAISE EXCEPTION 'reason_notes required when reason is Other';
  END IF;
  IF NEW.pickup_type IS NOT NULL AND NEW.pickup_type NOT IN ('Supplier Pickup', 'Contractor Drop-off') THEN
    RAISE EXCEPTION 'Invalid pickup_type: %', NEW.pickup_type;
  END IF;
  IF NEW.restocking_type IS NOT NULL AND NEW.restocking_type NOT IN ('Percent', 'Flat', 'None') THEN
    RAISE EXCEPTION 'Invalid restocking_type: %', NEW.restocking_type;
  END IF;
  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS "Authorized orgs can update returns" ON public.returns;
CREATE POLICY "Authorized orgs can update returns"
ON public.returns FOR UPDATE
TO authenticated
USING (
  (user_in_org(auth.uid(), created_by_org_id) AND status = ANY (ARRAY['DRAFT','APPROVED','SCHEDULED','PRICED','REJECTED']))
  OR (user_in_org(auth.uid(), supplier_org_id) AND status = ANY (ARRAY['SUBMITTED','SUPPLIER_REVIEW','PICKED_UP','SCHEDULED']))
)
WITH CHECK (
  (user_in_org(auth.uid(), created_by_org_id) AND status = ANY (ARRAY['DRAFT','SUBMITTED','SCHEDULED','CLOSED']))
  OR (user_in_org(auth.uid(), supplier_org_id) AND status = ANY (ARRAY['SUPPLIER_REVIEW','APPROVED','REJECTED','PICKED_UP','PRICED']))
);
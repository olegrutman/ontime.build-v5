CREATE OR REPLACE FUNCTION public.sync_contract_on_team_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Accepted' AND COALESCE(OLD.status, '') <> 'Accepted' AND NEW.org_id IS NOT NULL THEN
    UPDATE public.project_contracts
    SET status = 'Accepted',
        accepted_at = COALESCE(accepted_at, now()),
        updated_at = now()
    WHERE project_id = NEW.project_id
      AND status IN ('Invited', 'Sent', 'Pending')
      AND (from_org_id = NEW.org_id OR to_org_id = NEW.org_id OR to_project_team_id = NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_contract_on_team_accept ON public.project_team;
CREATE TRIGGER trg_sync_contract_on_team_accept
AFTER UPDATE ON public.project_team
FOR EACH ROW EXECUTE FUNCTION public.sync_contract_on_team_accept();

-- Backfill: contracts left as Invited even though the party already joined the project
UPDATE public.project_contracts c
SET status = 'Accepted',
    accepted_at = COALESCE(c.accepted_at, pt.accepted_at, now()),
    updated_at = now()
FROM public.project_team pt
WHERE pt.project_id = c.project_id
  AND pt.status = 'Accepted'
  AND pt.org_id IS NOT NULL
  AND (c.from_org_id = pt.org_id OR c.to_org_id = pt.org_id OR c.to_project_team_id = pt.id)
  AND c.status IN ('Invited', 'Sent', 'Pending')
  AND c.from_role <> 'Owner';
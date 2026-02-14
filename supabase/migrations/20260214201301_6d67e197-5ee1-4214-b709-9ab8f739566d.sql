
-- ============================================================
-- STEP 1: Activity / Audit Log Triggers
-- ============================================================

-- Helper function to get actor info
CREATE OR REPLACE FUNCTION public.get_actor_info(OUT actor_name text, OUT actor_company text)
RETURNS record
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    actor_name := 'System';
    actor_company := NULL;
    RETURN;
  END IF;

  SELECT p.full_name INTO actor_name
  FROM profiles p WHERE p.user_id = _uid;

  SELECT o.name INTO actor_company
  FROM user_org_roles uor
  JOIN organizations o ON o.id = uor.organization_id
  WHERE uor.user_id = _uid
  LIMIT 1;
END;
$$;

-- 1a. Project status changes
CREATE OR REPLACE FUNCTION public.log_project_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor record;
  _desc text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT * INTO _actor FROM public.get_actor_info();
    _desc := format('Project status changed from %s to %s', COALESCE(OLD.status,'draft'), NEW.status);
    INSERT INTO project_activity (project_id, activity_type, description, actor_user_id, actor_name, actor_company, metadata)
    VALUES (NEW.id, 'STATUS_CHANGED', _desc, auth.uid(), _actor.actor_name, _actor.actor_company,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_project_status ON projects;
CREATE TRIGGER trg_log_project_status
  AFTER UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION public.log_project_status_change();

-- 1b. Change order / work order status changes
CREATE OR REPLACE FUNCTION public.log_change_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor record;
  _desc text;
  _type text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT * INTO _actor FROM public.get_actor_info();
    
    CASE NEW.status
      WHEN 'submitted' THEN _type := 'CHANGE_ORDER_SUBMITTED';
      WHEN 'approved' THEN _type := 'CHANGE_ORDER_APPROVED';
      WHEN 'rejected' THEN _type := 'CHANGE_ORDER_REJECTED';
      ELSE _type := 'STATUS_CHANGED';
    END CASE;
    
    _desc := format('Work order "%s" status changed to %s', NEW.title, NEW.status);
    INSERT INTO project_activity (project_id, activity_type, description, actor_user_id, actor_name, actor_company, metadata)
    VALUES (NEW.project_id, _type, _desc, auth.uid(), _actor.actor_name, _actor.actor_company,
      jsonb_build_object('change_order_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status, 'title', NEW.title));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_change_order_status ON change_order_projects;
CREATE TRIGGER trg_log_change_order_status
  AFTER UPDATE ON change_order_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.log_change_order_status_change();

-- 1c. Invoice status changes
CREATE OR REPLACE FUNCTION public.log_invoice_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor record;
  _desc text;
  _type text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT * INTO _actor FROM public.get_actor_info();
    
    CASE NEW.status
      WHEN 'SUBMITTED' THEN _type := 'INVOICE_SUBMITTED';
      WHEN 'APPROVED' THEN _type := 'INVOICE_APPROVED';
      WHEN 'REJECTED' THEN _type := 'INVOICE_REJECTED';
      WHEN 'PAID' THEN _type := 'INVOICE_PAID';
      ELSE _type := 'STATUS_CHANGED';
    END CASE;
    
    _desc := format('Invoice %s %s', NEW.invoice_number, lower(NEW.status));
    INSERT INTO project_activity (project_id, activity_type, description, actor_user_id, actor_name, actor_company, metadata)
    VALUES (NEW.project_id, _type, _desc, auth.uid(), _actor.actor_name, _actor.actor_company,
      jsonb_build_object('invoice_id', NEW.id, 'invoice_number', NEW.invoice_number, 'old_status', OLD.status, 'new_status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_invoice_status ON invoices;
CREATE TRIGGER trg_log_invoice_status
  AFTER UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.log_invoice_status_change();

-- 1d. Project participant invite accepted
CREATE OR REPLACE FUNCTION public.log_participant_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor record;
  _desc text;
  _org_name text;
BEGIN
  IF OLD.invite_status IS DISTINCT FROM NEW.invite_status AND NEW.invite_status = 'ACCEPTED' THEN
    SELECT * INTO _actor FROM public.get_actor_info();
    SELECT name INTO _org_name FROM organizations WHERE id = NEW.organization_id;
    _desc := format('%s accepted the project invitation', COALESCE(_org_name, 'An organization'));
    INSERT INTO project_activity (project_id, activity_type, description, actor_user_id, actor_name, actor_company, metadata)
    VALUES (NEW.project_id, 'INVITE_ACCEPTED', _desc, auth.uid(), _actor.actor_name, _actor.actor_company,
      jsonb_build_object('organization_id', NEW.organization_id, 'role', NEW.role));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_participant_accepted ON project_participants;
CREATE TRIGGER trg_log_participant_accepted
  AFTER UPDATE ON project_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.log_participant_accepted();

-- ============================================================
-- STEP 2: Granular Notification Preference Columns
-- ============================================================

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS notify_wo_assigned boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_wo_approved boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_wo_rejected boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inv_submitted boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inv_approved boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inv_rejected boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_project_invite boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_digest_frequency text NOT NULL DEFAULT 'instant';

-- ============================================================
-- STEP 5: Onboarding dismissed flag
-- ============================================================

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS onboarding_dismissed boolean NOT NULL DEFAULT false;

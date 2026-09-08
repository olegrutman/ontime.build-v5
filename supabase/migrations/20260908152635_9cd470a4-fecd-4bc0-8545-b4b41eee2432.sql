-- New notification kinds for money + procurement events
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'INVOICE_PAID';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'PO_APPROVED';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'ESTIMATE_SUBMITTED';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'ESTIMATE_APPROVED';

-- Per-user email toggles for the new categories
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS notify_inv_paid boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_wo_input_requested boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_wo_submitted boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_po boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_estimate boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_join_request boolean NOT NULL DEFAULT true;

-- Audit + throttle ledger for notification emails
CREATE TABLE IF NOT EXISTS public.notification_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid,
  user_id uuid NOT NULL,
  recipient_email text NOT NULL,
  notification_type text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_email_log_user_recent
  ON public.notification_email_log (user_id, notification_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_email_log_notification
  ON public.notification_email_log (notification_id);

GRANT SELECT ON public.notification_email_log TO authenticated;
GRANT ALL ON public.notification_email_log TO service_role;
ALTER TABLE public.notification_email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notification email log" ON public.notification_email_log;
CREATE POLICY "Users read own notification email log"
  ON public.notification_email_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Lets the edge function validate the shared trigger secret without exposing it
CREATE OR REPLACE FUNCTION public.verify_notification_trigger_secret(_candidate text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _stored text;
BEGIN
  IF _candidate IS NULL OR length(_candidate) < 8 THEN
    RETURN false;
  END IF;
  SELECT decrypted_secret INTO _stored
  FROM vault.decrypted_secrets
  WHERE name = 'notification_trigger_secret'
  LIMIT 1;
  RETURN _stored IS NOT NULL AND _stored = _candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_notification_trigger_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_notification_trigger_secret(text) TO service_role;
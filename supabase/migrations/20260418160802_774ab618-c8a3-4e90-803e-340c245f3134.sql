-- 1) Replace overly broad SELECT policy on supplier_estimate_items
DROP POLICY IF EXISTS "Select estimate items via estimate" ON public.supplier_estimate_items;

CREATE POLICY "Project team or supplier org can view estimate items"
ON public.supplier_estimate_items
FOR SELECT
TO authenticated
USING (
  estimate_id IN (
    SELECT se.id
    FROM public.supplier_estimates se
    WHERE
      -- Supplier organization members
      se.supplier_org_id IN (
        SELECT uor.organization_id FROM public.user_org_roles uor WHERE uor.user_id = auth.uid()
      )
      -- Project team members (organizations participating on the project)
      OR se.project_id IN (
        SELECT pp.project_id
        FROM public.project_participants pp
        WHERE pp.organization_id IN (
          SELECT uor.organization_id FROM public.user_org_roles uor WHERE uor.user_id = auth.uid()
        )
      )
      -- Platform users
      OR public.is_platform_user(auth.uid())
  )
);

-- 2) Restrict Realtime subscriptions to authenticated users
-- Without RLS on realtime.messages, any anon user who can connect can subscribe to any topic.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated users can read realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can publish realtime presence" ON realtime.messages;
CREATE POLICY "Authenticated users can publish realtime presence"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3) Update notification email trigger to read secret from Vault instead of hardcoded string
DO $$
DECLARE
  trigger_secret text;
BEGIN
  -- Generate a strong secret if not already set
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'notification_trigger_secret') THEN
    trigger_secret := encode(gen_random_bytes(32), 'hex');
    PERFORM vault.create_secret(trigger_secret, 'notification_trigger_secret', 'Shared secret used by DB trigger to call send-notification-email');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.send_notification_email_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _secret text;
  _supabase_url text;
  _service_key text;
BEGIN
  SELECT decrypted_secret INTO _secret FROM vault.decrypted_secrets WHERE name = 'notification_trigger_secret' LIMIT 1;
  SELECT decrypted_secret INTO _supabase_url FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
  SELECT decrypted_secret INTO _service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  IF _secret IS NULL THEN
    RAISE WARNING 'notification_trigger_secret missing from vault; skipping notification email';
    RETURN NEW;
  END IF;

  -- Fallback to hardcoded URL if not in vault
  IF _supabase_url IS NULL THEN
    _supabase_url := 'https://gzqgbfazwvmwmirbqfwf.supabase.co';
  END IF;

  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(_service_key, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6cWdiZmF6d3Ztd21pcmJxZndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNTI2MzAsImV4cCI6MjA4NDYyODYzMH0.SBoesmRP0SCtKBBrF9ime8QxJI_hLCGF5Th0cS6F34w'),
      'x-trigger-secret', _secret
    ),
    body := jsonb_build_object(
      'notification_id', NEW.id,
      'recipient_org_id', NEW.recipient_org_id,
      'recipient_user_id', NEW.recipient_user_id,
      'type', NEW.type,
      'title', NEW.title,
      'body', NEW.body,
      'action_url', NEW.action_url
    )
  );
  RETURN NEW;
END;
$$;
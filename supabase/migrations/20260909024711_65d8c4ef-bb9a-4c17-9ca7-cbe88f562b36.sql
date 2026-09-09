ALTER TABLE public.notification_email_log
  ADD COLUMN IF NOT EXISTS entity_id uuid;

CREATE INDEX IF NOT EXISTS idx_notification_email_log_user_entity_recent
  ON public.notification_email_log (user_id, notification_type, entity_id, created_at DESC);

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
      'entity_id', NEW.entity_id,
      'action_url', NEW.action_url
    )
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.send_notification_email_trigger() FROM PUBLIC, anon, authenticated;
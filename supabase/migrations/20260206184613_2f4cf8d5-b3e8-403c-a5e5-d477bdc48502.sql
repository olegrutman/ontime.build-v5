
-- Enable pg_net extension for async HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create the trigger function that calls the edge function
CREATE OR REPLACE FUNCTION public.send_notification_email_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _supabase_url text;
  _service_role_key text;
BEGIN
  -- Get Supabase URL and service role key from vault or hardcoded project settings
  _supabase_url := current_setting('app.settings.supabase_url', true);
  _service_role_key := current_setting('app.settings.service_role_key', true);

  -- Fall back to direct project URL if setting not available
  IF _supabase_url IS NULL OR _supabase_url = '' THEN
    _supabase_url := 'https://gzqgbfazwvmwmirbqfwf.supabase.co';
  END IF;

  -- Only proceed if we have the service role key
  IF _service_role_key IS NOT NULL AND _service_role_key != '' THEN
    PERFORM net.http_post(
      url := _supabase_url || '/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_role_key
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
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on notifications table
DROP TRIGGER IF EXISTS trg_send_notification_email ON public.notifications;
CREATE TRIGGER trg_send_notification_email
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_notification_email_trigger();

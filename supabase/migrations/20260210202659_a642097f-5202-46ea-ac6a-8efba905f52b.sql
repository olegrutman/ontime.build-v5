CREATE OR REPLACE FUNCTION public.send_notification_email_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://gzqgbfazwvmwmirbqfwf.supabase.co/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6cWdiZmF6d3Ztd21pcmJxZndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNTI2MzAsImV4cCI6MjA4NDYyODYzMH0.SBoesmRP0SCtKBBrF9ime8QxJI_hLCGF5Th0cS6F34w',
      'x-trigger-secret', 'internal-db-trigger'
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
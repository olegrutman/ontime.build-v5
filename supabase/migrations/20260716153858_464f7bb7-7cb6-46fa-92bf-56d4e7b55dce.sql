-- 1. Add push toggle to user_settings
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS notify_push boolean NOT NULL DEFAULT true;

-- 2. Delivery log
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE,
  subscription_id uuid,
  channel text NOT NULL,
  status text NOT NULL,
  error text,
  delivered_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.notification_deliveries TO authenticated;
GRANT ALL ON public.notification_deliveries TO service_role;

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own delivery rows"
  ON public.notification_deliveries FOR SELECT
  TO authenticated
  USING (
    notification_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.id = notification_deliveries.notification_id
        AND n.recipient_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS notification_deliveries_notif_idx
  ON public.notification_deliveries(notification_id);

-- 3. Internal config (secret used by trigger to authenticate to edge function)
CREATE TABLE IF NOT EXISTS public.internal_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.internal_config TO service_role;
-- No grants to anon/authenticated — service role only.
ALTER TABLE public.internal_config ENABLE ROW LEVEL SECURITY;
-- No policies = no access from anon/authenticated. Service role bypasses RLS.

-- 4. Trigger — fire pg_net.http_post to send-push-notification on new notification
CREATE OR REPLACE FUNCTION public.enqueue_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _secret text;
  _url text := 'https://gzqgbfazwvmwmirbqfwf.supabase.co/functions/v1/send-push-notification';
BEGIN
  IF NEW.recipient_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT value INTO _secret FROM public.internal_config WHERE key = 'push_internal_secret';
  IF _secret IS NULL THEN
    RETURN NEW; -- not configured yet; skip silently
  END IF;

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', _secret
    ),
    body := jsonb_build_object(
      'notification_id', NEW.id,
      'user_id', NEW.recipient_user_id
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the notification insert on push failure.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_enqueue_push ON public.notifications;
CREATE TRIGGER notifications_enqueue_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_push_notification();

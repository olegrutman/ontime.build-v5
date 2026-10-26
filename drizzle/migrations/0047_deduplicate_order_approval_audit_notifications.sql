ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS event_key text;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_unique_event_key ON public.notifications(event_key) WHERE event_key IS NOT NULL;
COMMENT ON COLUMN public.notifications.event_key IS 'Stable approval-audit event identity; prevents repeated reconciliation alerts without altering approvals.';
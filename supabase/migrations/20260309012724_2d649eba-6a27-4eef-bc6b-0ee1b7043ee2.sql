-- Create push subscriptions table
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own push subscriptions"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- Create notification preferences table
CREATE TABLE public.user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN DEFAULT false,
  push_frequency TEXT DEFAULT 'instant', -- 'instant', 'daily', 'weekly'
  push_quiet_hours_start TIME DEFAULT '22:00:00',
  push_quiet_hours_end TIME DEFAULT '08:00:00',
  pending_approvals BOOLEAN DEFAULT true,
  overdue_invoices BOOLEAN DEFAULT true,
  work_order_updates BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own notification preferences"
  ON public.user_notification_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger to create default preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_user_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Create index for efficient queries
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_active ON public.push_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX idx_notification_preferences_user_id ON public.user_notification_preferences(user_id);

-- 1. Add new notification types for CO flow
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'CO_CLOSED_FOR_PRICING';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'CO_COMPLETED';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'CO_ACKNOWLEDGED';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'CO_SCOPE_ADDED';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'NTE_WARNING_80';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'NTE_BLOCKED_100';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'FC_PRICING_SUBMITTED';

-- 2. Add new columns to change_orders for the enhanced flow
ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS use_fc_pricing_base boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS closed_for_pricing_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS completion_acknowledged_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tc_snapshot_hourly_rate numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tc_snapshot_markup_percent numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tc_submitted_price numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fc_pricing_submitted_at timestamptz DEFAULT NULL;

-- 3. Add account-level default toggle to org_settings
ALTER TABLE public.org_settings
  ADD COLUMN IF NOT EXISTS use_fc_input_as_base boolean DEFAULT false;

-- 4. Update the can_request_fc_change_order_input function to include new statuses
CREATE OR REPLACE FUNCTION public.can_request_fc_change_order_input(
  _co_id uuid,
  _fc_org_id uuid,
  _user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.change_orders co
    JOIN public.organizations org ON org.id = _fc_org_id
    JOIN public.project_team pt ON pt.project_id = co.project_id AND pt.org_id = _fc_org_id
    WHERE co.id = _co_id
      AND co.assigned_to_org_id IS NOT NULL
      AND public.user_in_org(_user_id, co.assigned_to_org_id)
      AND co.status IN ('draft', 'shared', 'rejected', 'work_in_progress', 'closed_for_pricing')
      AND org.type = 'FC'
      AND _fc_org_id <> co.org_id
      AND _fc_org_id <> co.assigned_to_org_id
  );
$$;

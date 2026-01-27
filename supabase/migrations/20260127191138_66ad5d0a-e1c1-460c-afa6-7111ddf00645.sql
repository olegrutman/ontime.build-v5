
-- Fix the notification function - entity_id is UUID, not text
CREATE OR REPLACE FUNCTION public.send_work_order_assignment_notification(
  _change_order_id uuid,
  _recipient_org_id uuid,
  _work_order_title text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _project_id uuid;
  _action_url text;
BEGIN
  -- Get the project_id for the work order
  SELECT project_id INTO _project_id
  FROM change_order_projects
  WHERE id = _change_order_id;

  -- Build action URL
  _action_url := '/change-order/' || _change_order_id::text;

  -- Insert notification for the recipient org
  -- entity_id must be UUID, not text
  INSERT INTO notifications (
    type,
    title,
    body,
    entity_type,
    entity_id,
    action_url,
    recipient_org_id
  ) VALUES (
    'WORK_ORDER_ASSIGNED'::notification_type,
    'You have been assigned to a Work Order',
    'You''ve been added to: ' || _work_order_title || '. Click to view and add your hours.',
    'change_order',
    _change_order_id,  -- UUID, not text
    _action_url,
    _recipient_org_id
  );
END;
$$;

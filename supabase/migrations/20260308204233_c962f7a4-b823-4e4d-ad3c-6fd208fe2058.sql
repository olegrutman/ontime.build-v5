
-- 1. Add NUDGE to notification_type enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'NUDGE';

-- 2. Create nudge_log table
CREATE TABLE public.nudge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  sent_by uuid NOT NULL,
  sent_to_org uuid NOT NULL REFERENCES public.organizations(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for cooldown check
CREATE INDEX idx_nudge_log_entity ON public.nudge_log(entity_type, entity_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.nudge_log ENABLE ROW LEVEL SECURITY;

-- RLS: users can see their own nudges
CREATE POLICY "Users can view own nudges"
  ON public.nudge_log FOR SELECT TO authenticated
  USING (sent_by = auth.uid());

-- RLS: users can insert nudges
CREATE POLICY "Users can insert nudges"
  ON public.nudge_log FOR INSERT TO authenticated
  WITH CHECK (sent_by = auth.uid());

-- 3. Create send_nudge RPC function
CREATE OR REPLACE FUNCTION public.send_nudge(
  _entity_type text,
  _entity_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _user_org_id uuid;
  _recipient_org_id uuid;
  _title text;
  _body text;
  _action_url text;
  _last_nudge timestamptz;
  _entity_label text;
BEGIN
  -- Get caller's org
  SELECT organization_id INTO _user_org_id
  FROM user_org_roles
  WHERE user_id = _user_id
  LIMIT 1;

  IF _user_org_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User has no organization');
  END IF;

  -- Determine recipient org and notification details based on entity type
  IF _entity_type = 'invoice' THEN
    SELECT
      c.to_org_id,
      'Reminder: Invoice ' || i.invoice_number || ' awaits your review',
      'Invoice ' || i.invoice_number || ' was submitted and is awaiting your action.',
      '/projects/' || i.project_id || '?tab=invoices&invoice=' || i.id
    INTO _recipient_org_id, _title, _body, _action_url
    FROM invoices i
    JOIN project_contracts c ON c.id = i.contract_id
    WHERE i.id = _entity_id AND i.status = 'SUBMITTED';

  ELSIF _entity_type = 'work_order' THEN
    SELECT
      p.created_by_org_id,
      'Reminder: Work Order "' || wi.title || '" awaits approval',
      'A work order has been submitted and is awaiting your review.',
      '/projects/' || wi.project_id || '?tab=work-orders&work_item=' || wi.id
    INTO _recipient_org_id, _title, _body, _action_url
    FROM work_items wi
    JOIN projects p ON p.id = wi.project_id
    WHERE wi.id = _entity_id AND wi.state = 'PRICED';

  ELSIF _entity_type = 'purchase_order' THEN
    SELECT
      po.supplier_org_id,
      'Reminder: PO ' || po.po_number || ' awaits your action',
      'A purchase order has been submitted and is awaiting your response.',
      '/projects/' || po.project_id || '?tab=purchase-orders&po=' || po.id
    INTO _recipient_org_id, _title, _body, _action_url
    FROM purchase_orders po
    WHERE po.id = _entity_id AND po.status = 'SUBMITTED';

  ELSIF _entity_type = 'return' THEN
    SELECT
      r.supplier_org_id,
      'Reminder: Return ' || r.return_number || ' awaits your review',
      'A return request has been submitted and is awaiting your action.',
      '/projects/' || r.project_id || '?tab=returns&return=' || r.id
    INTO _recipient_org_id, _title, _body, _action_url
    FROM returns r
    WHERE r.id = _entity_id AND r.status = 'SUBMITTED';

  ELSE
    RETURN jsonb_build_object('error', 'Invalid entity type');
  END IF;

  IF _recipient_org_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Entity not found or not in a nudgeable state');
  END IF;

  -- Check 24h cooldown
  SELECT created_at INTO _last_nudge
  FROM nudge_log
  WHERE entity_type = _entity_type
    AND entity_id = _entity_id
    AND created_at > now() - interval '24 hours'
  ORDER BY created_at DESC
  LIMIT 1;

  IF _last_nudge IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'cooldown', 'message', 'A reminder was already sent for this item recently. You can send another after 24 hours.');
  END IF;

  -- Log the nudge
  INSERT INTO nudge_log (entity_type, entity_id, sent_by, sent_to_org)
  VALUES (_entity_type, _entity_id, _user_id, _recipient_org_id);

  -- Create notification
  INSERT INTO notifications (type, title, body, action_url, entity_type, entity_id, recipient_org_id)
  VALUES ('NUDGE', _title, _body, _action_url, _entity_type, _entity_id, _recipient_org_id);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Read-only relationship and material-status functions now obey caller row policies.
CREATE OR REPLACE FUNCTION public.get_project_relationships(_project_id uuid)
RETURNS TABLE(id uuid, upstream_org_name text, upstream_org_code text, upstream_role public.org_type, downstream_org_name text, downstream_org_code text, downstream_role public.org_type, relationship_type text, material_responsibility text, po_requires_upstream_approval boolean)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_project_participant(auth.uid(), _project_id) OR NOT public.can_see_project(_project_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    pr.id,
    up_org.name,
    up_org.org_code,
    up_pp.role,
    down_org.name,
    down_org.org_code,
    down_pp.role,
    pr.relationship_type,
    pr.material_responsibility,
    pr.po_requires_upstream_approval
  FROM public.project_relationships pr
  JOIN public.project_participants up_pp ON up_pp.id = pr.upstream_participant_id
  JOIN public.organizations up_org ON up_org.id = up_pp.organization_id
  JOIN public.project_participants down_pp ON down_pp.id = pr.downstream_participant_id
  JOIN public.organizations down_org ON down_org.id = down_pp.organization_id
  WHERE pr.project_id = _project_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.field_material_order_status(p_item_id uuid)
RETURNS TABLE(po_id uuid, status public.po_status, supplier_name text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
  SELECT po.id, po.status, s.name
  FROM public.field_report_items i
  JOIN public.purchase_orders po ON po.id = i.converted_po_id
  JOIN public.suppliers s ON s.id = po.supplier_id
  WHERE i.id = p_item_id
    AND i.kind = 'material'
    AND auth.uid() IS NOT NULL
    AND (
      public.field_report_party(auth.uid(), i.report_id) IS NOT NULL
      OR (i.status IN ('released','converted') AND public.is_project_participant(auth.uid(), i.project_id) AND public.can_see_project(i.project_id))
    );
$function$;

-- A deliberately limited join directory replaces broad access to company and profile tables.
CREATE OR REPLACE VIEW public.organization_join_directory
WITH (security_barrier = true) AS
SELECT
  o.id AS org_id,
  o.name AS org_name,
  o.type::text AS org_type,
  o.trade AS org_trade,
  jsonb_build_object(
    'city', COALESCE(TRIM(o.address->>'city'), ''),
    'state', COALESCE(TRIM(o.address->>'state'), '')
  ) AS org_address,
  (
    SELECT p.full_name
    FROM public.user_org_roles uor
    JOIN public.profiles p ON p.user_id = uor.user_id
    WHERE uor.organization_id = o.id AND uor.is_admin = true
    ORDER BY uor.created_at
    LIMIT 1
  ) AS admin_name,
  o.allow_join_requests
FROM public.organizations o
WHERE o.allow_join_requests = true;

REVOKE ALL ON public.organization_join_directory FROM PUBLIC, anon;
GRANT SELECT ON public.organization_join_directory TO authenticated, service_role;
COMMENT ON VIEW public.organization_join_directory IS 'Limited company directory containing only organizations accepting join requests and their public joining details.';

CREATE OR REPLACE FUNCTION public.search_organizations_for_join(_query text, _limit integer DEFAULT 100)
RETURNS TABLE(id uuid, name text, org_type public.org_type, city text, state text, trade text, admin_name text)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT d.org_id, d.org_name, d.org_type::public.org_type,
    COALESCE(d.org_address->>'city', ''), COALESCE(d.org_address->>'state', ''),
    d.org_trade, d.admin_name
  FROM public.organization_join_directory d
  WHERE d.org_name ILIKE '%' || COALESCE(_query, '') || '%'
  ORDER BY d.org_name
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 100), 100));
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_organizations_for_join(_state text DEFAULT NULL, _trade text DEFAULT NULL, _query text DEFAULT NULL, _limit integer DEFAULT 100)
RETURNS TABLE(org_id uuid, org_name text, org_type text, org_trade text, org_address jsonb, admin_name text, allow_join_requests boolean)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT d.org_id, d.org_name, d.org_type, d.org_trade, d.org_address, d.admin_name, d.allow_join_requests
  FROM public.organization_join_directory d
  WHERE (_state IS NULL OR _state = '' OR TRIM(d.org_address->>'state') ILIKE TRIM(_state))
    AND (_trade IS NULL OR _trade = '' OR TRIM(d.org_trade) ILIKE '%' || TRIM(_trade) || '%')
    AND (_query IS NULL OR _query = '' OR d.org_name ILIKE '%' || _query || '%')
  ORDER BY d.org_name
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 100), 100));
END;
$function$;

-- Team searches expose one administrative contact only for organizations connected to the caller.
CREATE OR REPLACE VIEW public.connected_team_target_directory
WITH (security_barrier = true) AS
SELECT
  o.id AS org_id,
  o.name AS org_name,
  o.type::text AS org_type,
  o.trade AS org_trade,
  contact.user_id AS contact_user_id,
  contact.full_name AS contact_name,
  contact.email AS contact_email,
  CASE WHEN NULLIF(TRIM(o.address->>'city'), '') IS NOT NULL
    THEN CONCAT_WS(', ', NULLIF(TRIM(o.address->>'city'), ''), NULLIF(TRIM(o.address->>'state'), ''))
    ELSE NULL END AS city_state
FROM public.organizations o
LEFT JOIN LATERAL (
  SELECT p.user_id, p.full_name, p.email
  FROM public.user_org_roles uor
  JOIN public.profiles p ON p.user_id = uor.user_id
  WHERE uor.organization_id = o.id AND uor.is_admin = true
  ORDER BY uor.created_at
  LIMIT 1
) contact ON true
WHERE EXISTS (
  SELECT 1
  FROM public.user_org_roles mine
  WHERE mine.user_id = auth.uid()
    AND (
      mine.organization_id = o.id
      OR EXISTS (
        SELECT 1 FROM public.trusted_partners tp
        WHERE (tp.organization_id = mine.organization_id AND tp.partner_org_id = o.id)
           OR (tp.partner_org_id = mine.organization_id AND tp.organization_id = o.id)
      )
      OR EXISTS (
        SELECT 1
        FROM public.project_participants mine_pp
        JOIN public.project_participants their_pp ON their_pp.project_id = mine_pp.project_id
        WHERE mine_pp.organization_id = mine.organization_id
          AND their_pp.organization_id = o.id
          AND mine_pp.invite_status = 'ACCEPTED'
          AND their_pp.invite_status = 'ACCEPTED'
      )
    )
);

REVOKE ALL ON public.connected_team_target_directory FROM PUBLIC, anon;
GRANT SELECT ON public.connected_team_target_directory TO authenticated, service_role;
COMMENT ON VIEW public.connected_team_target_directory IS 'Connected-company team directory with at most one administrative contact per company.';

CREATE OR REPLACE FUNCTION public.search_existing_team_targets(_query text, _project_id uuid, _limit integer DEFAULT 10)
RETURNS TABLE(result_type text, org_id uuid, org_name text, org_type text, org_trade text, contact_user_id uuid, contact_name text, contact_email text, city_state text)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_project_participant(auth.uid(), _project_id) OR NOT public.can_see_project(_project_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF LENGTH(TRIM(COALESCE(_query, ''))) < 2 THEN RETURN; END IF;

  RETURN QUERY
  SELECT DISTINCT d.org_id::text, d.org_id, d.org_name, d.org_type, d.org_trade,
    d.contact_user_id, d.contact_name, d.contact_email, d.city_state
  FROM public.connected_team_target_directory d
  WHERE (
      d.org_name ILIKE '%' || _query || '%'
      OR d.contact_name ILIKE '%' || _query || '%'
      OR d.contact_email ILIKE '%' || _query || '%'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.project_team pt
      WHERE pt.project_id = _project_id AND pt.org_id = d.org_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.project_invites pi
      WHERE pi.project_id = _project_id AND pi.status = 'Invited'
        AND d.contact_email IS NOT NULL AND lower(pi.invited_email) = lower(d.contact_email)
    )
  ORDER BY d.org_name
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 10), 25));
END;
$function$;

-- This older broad search has no application callers; server-only access remains available if needed.
REVOKE ALL ON FUNCTION public.search_invite_targets(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_invite_targets(text, integer) TO service_role;

-- Approval actions retain protected writes but no longer disclose complete records.
DROP FUNCTION public.approve_crew_change_order(uuid, boolean);
CREATE FUNCTION public.approve_crew_change_order(_co_id uuid, _keep_internal boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE c public.change_orders;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO c FROM public.change_orders WHERE id = _co_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Change order not found'; END IF;
  IF c.created_by_role <> 'FC' THEN RAISE EXCEPTION 'Only crew orders can be approved here'; END IF;
  IF NOT (
    (c.status = 'submitted' AND c.assigned_to_org_id IS NOT NULL AND public.user_in_org(auth.uid(), c.assigned_to_org_id))
    OR (c.status = 'draft' AND public.user_in_org(auth.uid(), c.org_id))
  ) THEN
    RAISE EXCEPTION 'You are not authorized to approve this order';
  END IF;
  UPDATE public.change_orders
  SET crew_approved_at = COALESCE(crew_approved_at, now()),
      crew_approved_by_user_id = COALESCE(crew_approved_by_user_id, auth.uid()),
      kept_internal = COALESCE(_keep_internal, false),
      updated_at = now()
  WHERE id = _co_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.approve_crew_change_order(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_crew_change_order(uuid, boolean) TO authenticated, service_role;

DROP FUNCTION public.forward_change_order_to_upstream_gc(uuid);
CREATE FUNCTION public.forward_change_order_to_upstream_gc(_co_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_co public.change_orders;
  upstream_gc_org_id uuid;
  origin_org_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO current_co FROM public.change_orders WHERE id = _co_id;
  IF current_co.id IS NULL THEN RAISE EXCEPTION 'Change order not found'; END IF;
  IF current_co.status <> 'submitted' THEN RAISE EXCEPTION 'Only submitted change orders can be forwarded'; END IF;
  IF current_co.created_by_role <> 'FC' THEN RAISE EXCEPTION 'Only crew-originated change orders can be forwarded upstream'; END IF;
  IF current_co.assigned_to_org_id IS NULL OR NOT public.user_in_org(auth.uid(), current_co.assigned_to_org_id) THEN
    RAISE EXCEPTION 'You are not authorized to forward this change order';
  END IF;

  SELECT pc.to_org_id INTO upstream_gc_org_id
  FROM public.project_contracts pc
  WHERE pc.project_id = current_co.project_id
    AND pc.from_org_id = current_co.assigned_to_org_id
    AND pc.to_role = 'General Contractor'
    AND pc.to_org_id IS NOT NULL
  ORDER BY pc.created_at DESC
  LIMIT 1;
  IF upstream_gc_org_id IS NULL THEN RAISE EXCEPTION 'No upstream general contractor organization found for this project'; END IF;

  origin_org_id := COALESCE(current_co.originating_org_id, current_co.org_id);
  UPDATE public.change_orders
  SET org_id = current_co.assigned_to_org_id,
      assigned_to_org_id = upstream_gc_org_id,
      originating_org_id = origin_org_id,
      updated_at = now()
  WHERE id = _co_id;

  IF origin_org_id IS DISTINCT FROM current_co.assigned_to_org_id THEN
    INSERT INTO public.change_order_collaborators (co_id, organization_id, collaborator_type, status, completed_at)
    VALUES (_co_id, origin_org_id, 'FC', 'completed', now())
    ON CONFLICT DO NOTHING;
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.forward_change_order_to_upstream_gc(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.forward_change_order_to_upstream_gc(uuid) TO authenticated, service_role;

DROP FUNCTION public.decide_co_price_revision(uuid, boolean);
CREATE FUNCTION public.decide_co_price_revision(_revision_id uuid, _approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE c public.change_orders; r public.co_price_revisions;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT co.* INTO c FROM public.change_orders co JOIN public.co_price_revisions rev ON rev.co_id=co.id WHERE rev.id=_revision_id FOR UPDATE OF co;
  SELECT * INTO r FROM public.co_price_revisions WHERE id=_revision_id FOR UPDATE;
  IF r.id IS NULL OR NOT public.can_see_project(c.project_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_org_roles u
    JOIN public.organizations o ON o.id=u.organization_id
    LEFT JOIN public.member_permissions p ON p.user_org_role_id=u.id
    WHERE u.user_id=auth.uid() AND u.organization_id=r.to_org_id AND o.type='GC'
      AND (u.is_admin OR COALESCE(p.can_approve_invoices,false))
  ) THEN RAISE EXCEPTION 'Only the assigned contractor may decide this revision'; END IF;
  IF r.status<>'pending' THEN RAISE EXCEPTION 'Revision already decided'; END IF;
  IF c.status NOT IN ('approved','contracted') OR c.assigned_to_org_id IS DISTINCT FROM r.to_org_id OR c.org_id IS DISTINCT FROM r.from_org_id OR COALESCE(c.tc_submitted_price,0)<>r.previous_price THEN
    RAISE EXCEPTION 'Order changed since this revision was submitted';
  END IF;
  UPDATE public.co_price_revisions
  SET status=CASE WHEN _approve THEN 'approved' ELSE 'rejected' END, decided_by=auth.uid(), decided_at=now()
  WHERE id=r.id;
  INSERT INTO public.notifications(recipient_org_id,type,title,body,entity_type,entity_id,action_url,created_by)
  VALUES(r.from_org_id,CASE WHEN _approve THEN 'CHANGE_APPROVED'::public.notification_type ELSE 'CHANGE_REJECTED'::public.notification_type END,
    CASE WHEN _approve THEN 'Revised price approved' ELSE 'Revised price rejected' END,COALESCE(c.co_number,'Order'),
    'change_order',c.id,'/project/'||c.project_id||'/change-orders/'||c.id,auth.uid());
END;
$function$;
REVOKE ALL ON FUNCTION public.decide_co_price_revision(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_co_price_revision(uuid, boolean) TO authenticated, service_role;

-- Invitation resend now requires project administration and returns no protected data.
DROP FUNCTION public.resend_project_invite(uuid, uuid);
CREATE FUNCTION public.resend_project_invite(_project_id uuid, _team_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_tm record;
  v_resolved_user_id uuid;
  v_resolved_org_id uuid;
  v_project_name text;
  v_role_map jsonb := '{"General Contractor":"GC","Subcontractor":"TC","Crew":"FC","Supplier":"SUPPLIER"}'::jsonb;
  v_participant_role text;
  v_org_member record;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id AND (
      p.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.project_participants pp
        WHERE pp.project_id = p.id AND public.can_manage_project_access(pp.organization_id, auth.uid())
      )
    )
  ) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT * INTO v_tm FROM public.project_team WHERE id = _team_member_id AND project_id = _project_id;
  IF v_tm.id IS NULL THEN RAISE EXCEPTION 'Team member not found'; END IF;

  IF v_tm.org_id IS NULL AND v_tm.invited_email IS NOT NULL THEN
    SELECT user_id INTO v_resolved_user_id FROM public.profiles WHERE lower(email) = lower(v_tm.invited_email);
    IF v_resolved_user_id IS NULL THEN RAISE EXCEPTION 'Invited email does not match a registered account yet'; END IF;
    SELECT organization_id INTO v_resolved_org_id FROM public.user_org_roles WHERE user_id = v_resolved_user_id LIMIT 1;
    IF v_resolved_org_id IS NULL THEN RAISE EXCEPTION 'Could not resolve organization for invited user'; END IF;
    UPDATE public.project_team SET org_id = v_resolved_org_id, user_id = v_resolved_user_id WHERE id = _team_member_id;
  ELSE
    v_resolved_org_id := v_tm.org_id;
    v_resolved_user_id := v_tm.user_id;
  END IF;

  v_participant_role := COALESCE(v_role_map ->> v_tm.role, 'TC');
  IF v_resolved_org_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.project_participants WHERE project_id = _project_id AND organization_id = v_resolved_org_id
  ) THEN
    INSERT INTO public.project_participants (project_id, organization_id, role, invite_status, invited_by)
    VALUES (_project_id, v_resolved_org_id, v_participant_role::public.org_type, 'INVITED', auth.uid());
  END IF;

  UPDATE public.project_invites SET created_at = now() WHERE project_team_id = _team_member_id;

  IF v_resolved_org_id IS NOT NULL THEN
    SELECT name INTO v_project_name FROM public.projects WHERE id = _project_id;
    FOR v_org_member IN SELECT user_id FROM public.user_org_roles WHERE organization_id = v_resolved_org_id LOOP
      INSERT INTO public.notifications (recipient_org_id, recipient_user_id, type, title, body, entity_type, entity_id, action_url)
      VALUES (v_resolved_org_id, v_org_member.user_id, 'PROJECT_INVITE'::public.notification_type,
        'Project Invitation', 'You''ve been invited to join "' || COALESCE(v_project_name, 'a project') || '"',
        'project', _project_id, '/dashboard');
    END LOOP;
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.resend_project_invite(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resend_project_invite(uuid, uuid) TO authenticated, service_role;

-- Reminders validate the sending party, use a global cooldown, and return no protected data.
DROP FUNCTION public.send_nudge(text, uuid);
CREATE FUNCTION public.send_nudge(_entity_type text, _entity_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _recipient_org_id uuid;
  _project_id uuid;
  _sender_authorized boolean := false;
  _title text;
  _body text;
  _action_url text;
  _last_nudge timestamptz;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF _entity_type = 'invoice' THEN
    SELECT c.to_org_id, i.project_id, public.user_in_org(_user_id, c.from_org_id),
      'Reminder: Invoice ' || i.invoice_number || ' awaits your review',
      'Invoice ' || i.invoice_number || ' was submitted and is awaiting your action.',
      '/projects/' || i.project_id || '?tab=invoices&invoice=' || i.id
    INTO _recipient_org_id, _project_id, _sender_authorized, _title, _body, _action_url
    FROM public.invoices i JOIN public.project_contracts c ON c.id = i.contract_id
    WHERE i.id = _entity_id AND i.status = 'SUBMITTED';
  ELSIF _entity_type = 'change_order' THEN
    SELECT co.assigned_to_org_id, co.project_id, public.user_in_org(_user_id, co.org_id),
      'Reminder: ' || COALESCE(co.co_number, 'Change order') || ' awaits your review',
      'A change order has been submitted and is awaiting your action.',
      '/project/' || co.project_id || '/change-orders/' || co.id
    INTO _recipient_org_id, _project_id, _sender_authorized, _title, _body, _action_url
    FROM public.change_orders co WHERE co.id = _entity_id AND co.status = 'submitted';
  ELSIF _entity_type = 'purchase_order' THEN
    SELECT s.organization_id, po.project_id, public.user_in_org(_user_id, po.organization_id),
      'Reminder: PO ' || po.po_number || ' awaits your action',
      'A purchase order has been submitted and is awaiting your response.',
      '/projects/' || po.project_id || '?tab=purchase-orders&po=' || po.id
    INTO _recipient_org_id, _project_id, _sender_authorized, _title, _body, _action_url
    FROM public.purchase_orders po JOIN public.suppliers s ON s.id = po.supplier_id
    WHERE po.id = _entity_id AND po.status = 'SUBMITTED';
  ELSIF _entity_type = 'return' THEN
    SELECT r.supplier_org_id, r.project_id, public.user_in_org(_user_id, r.created_by_org_id),
      'Reminder: Return ' || r.return_number || ' awaits your review',
      'A return request has been submitted and is awaiting your action.',
      '/projects/' || r.project_id || '?tab=returns&return=' || r.id
    INTO _recipient_org_id, _project_id, _sender_authorized, _title, _body, _action_url
    FROM public.returns r WHERE r.id = _entity_id AND r.status = 'SUBMITTED';
  ELSE
    RAISE EXCEPTION 'Invalid entity type';
  END IF;

  IF _recipient_org_id IS NULL OR _project_id IS NULL OR NOT _sender_authorized OR NOT public.can_see_project(_project_id) THEN
    RAISE EXCEPTION 'Entity not found or not available for reminders';
  END IF;

  SELECT created_at INTO _last_nudge FROM public.nudge_log
  WHERE entity_type = _entity_type AND entity_id = _entity_id AND created_at > now() - interval '24 hours'
  ORDER BY created_at DESC LIMIT 1;
  IF _last_nudge IS NOT NULL THEN
    RAISE EXCEPTION 'cooldown: A reminder was already sent for this item recently. You can send another after 24 hours.';
  END IF;

  INSERT INTO public.nudge_log (entity_type, entity_id, sent_by, sent_to_org)
  VALUES (_entity_type, _entity_id, _user_id, _recipient_org_id);
  INSERT INTO public.notifications (type, title, body, action_url, entity_type, entity_id, recipient_org_id)
  VALUES ('NUDGE', _title, _body, _action_url, _entity_type, _entity_id, _recipient_org_id);
END;
$function$;
REVOKE ALL ON FUNCTION public.send_nudge(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_nudge(text, uuid) TO authenticated, service_role;
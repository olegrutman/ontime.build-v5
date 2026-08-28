-- 1. Allow anonymisation of retained business records
ALTER TABLE public.actual_cost_entries ALTER COLUMN entered_by DROP NOT NULL;
ALTER TABLE public.backcharges ALTER COLUMN created_by_user_id DROP NOT NULL;
ALTER TABLE public.change_order_collaborators ALTER COLUMN invited_by_user_id DROP NOT NULL;
ALTER TABLE public.change_orders ALTER COLUMN created_by_user_id DROP NOT NULL;
ALTER TABLE public.co_activity ALTER COLUMN actor_user_id DROP NOT NULL;
ALTER TABLE public.co_ai_intakes ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.co_evidence ALTER COLUMN uploaded_by_user_id DROP NOT NULL;
ALTER TABLE public.co_nte_log ALTER COLUMN requested_by_user_id DROP NOT NULL;
ALTER TABLE public.co_photos ALTER COLUMN uploaded_by_user_id DROP NOT NULL;
ALTER TABLE public.co_scope_evidence ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.daily_logs ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.estimate_pdf_uploads ALTER COLUMN uploaded_by DROP NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.organizations ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.project_participants ALTER COLUMN invited_by DROP NOT NULL;
ALTER TABLE public.project_rfis ALTER COLUMN submitted_by_user_id DROP NOT NULL;
ALTER TABLE public.projects ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.returns ALTER COLUMN created_by_user_id DROP NOT NULL;

-- 2. Anonymisation helper
CREATE OR REPLACE FUNCTION public.anonymize_user_references(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.actual_cost_entries SET entered_by = NULL WHERE entered_by = _user_id;
  UPDATE public.backcharges SET created_by_user_id = NULL WHERE created_by_user_id = _user_id;
  UPDATE public.change_order_collaborators SET invited_by_user_id = NULL WHERE invited_by_user_id = _user_id;
  UPDATE public.change_order_collaborators SET completed_by_user_id = NULL WHERE completed_by_user_id = _user_id;
  UPDATE public.change_orders SET created_by_user_id = NULL WHERE created_by_user_id = _user_id;
  UPDATE public.co_activity SET actor_user_id = NULL WHERE actor_user_id = _user_id;
  UPDATE public.co_ai_intakes SET created_by = NULL WHERE created_by = _user_id;
  UPDATE public.co_audit_log SET actor_user_id = NULL WHERE actor_user_id = _user_id;
  UPDATE public.co_evidence SET uploaded_by_user_id = NULL WHERE uploaded_by_user_id = _user_id;
  UPDATE public.co_external_invites SET invited_by_user_id = NULL WHERE invited_by_user_id = _user_id;
  UPDATE public.co_nte_log SET requested_by_user_id = NULL WHERE requested_by_user_id = _user_id;
  UPDATE public.co_nte_log SET approved_by_user_id = NULL WHERE approved_by_user_id = _user_id;
  UPDATE public.co_photos SET uploaded_by_user_id = NULL WHERE uploaded_by_user_id = _user_id;
  UPDATE public.co_scope_evidence SET created_by = NULL WHERE created_by = _user_id;
  UPDATE public.co_v4_feature_flags SET enabled_by = NULL WHERE enabled_by = _user_id;
  UPDATE public.daily_logs SET created_by = NULL WHERE created_by = _user_id;
  UPDATE public.estimate_pdf_uploads SET uploaded_by = NULL WHERE uploaded_by = _user_id;
  UPDATE public.gc_owner_billings SET created_by_user_id = NULL WHERE created_by_user_id = _user_id;
  UPDATE public.invoice_external_invites SET invited_by_user_id = NULL WHERE invited_by_user_id = _user_id;
  UPDATE public.invoices SET created_by = NULL WHERE created_by = _user_id;
  UPDATE public.invoices SET submitted_by = NULL WHERE submitted_by = _user_id;
  UPDATE public.invoices SET approved_by = NULL WHERE approved_by = _user_id;
  UPDATE public.invoices SET rejected_by = NULL WHERE rejected_by = _user_id;
  UPDATE public.invoices SET paid_by = NULL WHERE paid_by = _user_id;
  UPDATE public.invoices SET voided_by = NULL WHERE voided_by = _user_id;
  UPDATE public.material_orders SET submitted_by = NULL WHERE submitted_by = _user_id;
  UPDATE public.material_orders SET approved_by = NULL WHERE approved_by = _user_id;
  UPDATE public.org_feature_overrides SET updated_by = NULL WHERE updated_by = _user_id;
  UPDATE public.org_join_requests SET reviewed_by = NULL WHERE reviewed_by = _user_id;
  UPDATE public.organizations SET created_by = NULL WHERE created_by = _user_id;
  UPDATE public.payment_applications SET generated_by_user_id = NULL WHERE generated_by_user_id = _user_id;
  UPDATE public.platform_settings SET updated_by = NULL WHERE updated_by = _user_id;
  UPDATE public.project_activity SET actor_user_id = NULL WHERE actor_user_id = _user_id;
  UPDATE public.project_contracts SET created_by_user_id = NULL WHERE created_by_user_id = _user_id;
  UPDATE public.project_estimates SET approved_by = NULL WHERE approved_by = _user_id;
  UPDATE public.project_guests SET invited_by = NULL WHERE invited_by = _user_id;
  UPDATE public.project_participants SET invited_by = NULL WHERE invited_by = _user_id;
  UPDATE public.project_rfis SET submitted_by_user_id = NULL WHERE submitted_by_user_id = _user_id;
  UPDATE public.project_rfis SET answered_by_user_id = NULL WHERE answered_by_user_id = _user_id;
  UPDATE public.project_schedule_items SET created_by = NULL WHERE created_by = _user_id;
  UPDATE public.project_settings_audit SET changed_by = NULL WHERE changed_by = _user_id;
  UPDATE public.projects SET created_by = NULL WHERE created_by = _user_id;
  UPDATE public.purchase_orders SET submitted_by = NULL WHERE submitted_by = _user_id;
  UPDATE public.purchase_orders SET approved_by = NULL WHERE approved_by = _user_id;
  UPDATE public.purchase_orders SET sent_by = NULL WHERE sent_by = _user_id;
  UPDATE public.returns SET created_by_user_id = NULL WHERE created_by_user_id = _user_id;
  UPDATE public.rfi_attachments SET uploaded_by_user_id = NULL WHERE uploaded_by_user_id = _user_id;
  UPDATE public.rfis SET submitted_by_user_id = NULL WHERE submitted_by_user_id = _user_id;
  UPDATE public.rfis SET answered_by_user_id = NULL WHERE answered_by_user_id = _user_id;
  UPDATE public.supplier_estimates SET approved_by = NULL WHERE approved_by = _user_id;
  UPDATE public.access_audit_log SET actor_id = NULL WHERE actor_id = _user_id;
  UPDATE public.support_actions_log SET target_user_id = NULL WHERE target_user_id = _user_id;
  UPDATE public.project_team SET invited_by_user_id = NULL WHERE invited_by_user_id = _user_id;
  UPDATE public.project_invites SET invited_by_user_id = NULL WHERE invited_by_user_id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.anonymize_user_references(uuid) FROM PUBLIC;

-- 3. Self-service account deletion
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _blocking_org uuid;
  _org record;
  _user_email text;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authenticated');
  END IF;

  IF EXISTS (SELECT 1 FROM public.platform_users pu
             WHERE pu.user_id = _uid AND pu.platform_role <> 'NONE') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'platform_account');
  END IF;

  -- Sole admin of an org that still has other members or projects?
  SELECT r.organization_id INTO _blocking_org
  FROM public.user_org_roles r
  WHERE r.user_id = _uid
    AND r.is_admin = true
    AND NOT EXISTS (
      SELECT 1 FROM public.user_org_roles o
      WHERE o.organization_id = r.organization_id
        AND o.user_id <> _uid
        AND o.is_admin = true
    )
    AND (
      EXISTS (SELECT 1 FROM public.user_org_roles o2
              WHERE o2.organization_id = r.organization_id AND o2.user_id <> _uid)
      OR EXISTS (SELECT 1 FROM public.projects p
                 WHERE p.organization_id = r.organization_id)
    )
  LIMIT 1;

  IF _blocking_org IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'sole_admin',
      'organization_id', _blocking_org);
  END IF;

  SELECT email INTO _user_email FROM public.profiles WHERE user_id = _uid;

  -- Anonymise retained business records first
  PERFORM public.anonymize_user_references(_uid);

  -- Personal data: hard delete
  DELETE FROM public.notification_deliveries
    WHERE subscription_id IN (SELECT id FROM public.push_subscriptions WHERE user_id = _uid)
       OR notification_id IN (SELECT id FROM public.notifications WHERE recipient_user_id = _uid);
  DELETE FROM public.notification_reads WHERE user_id = _uid;
  DELETE FROM public.notifications WHERE recipient_user_id = _uid;
  DELETE FROM public.push_subscriptions WHERE user_id = _uid;
  DELETE FROM public.user_notification_preferences WHERE user_id = _uid;
  DELETE FROM public.user_settings WHERE user_id = _uid;
  DELETE FROM public.reminders WHERE user_id = _uid;
  DELETE FROM public.nudge_log WHERE sent_by = _uid;
  DELETE FROM public.field_captures WHERE user_id = _uid;
  DELETE FROM public.project_designated_suppliers WHERE user_id = _uid;
  DELETE FROM public.project_members WHERE user_id = _uid OR added_by = _uid;
  DELETE FROM public.project_team WHERE user_id = _uid;
  DELETE FROM public.org_join_requests WHERE user_id = _uid;
  DELETE FROM public.org_invitations WHERE invited_by = _uid
     OR (_user_email IS NOT NULL AND lower(email) = lower(_user_email));
  DELETE FROM public.member_permissions
    WHERE user_org_role_id IN (SELECT id FROM public.user_org_roles WHERE user_id = _uid);

  -- Collect orgs the user solely occupies before dropping roles
  CREATE TEMP TABLE IF NOT EXISTS _orphan_orgs (organization_id uuid) ON COMMIT DROP;
  DELETE FROM _orphan_orgs;
  INSERT INTO _orphan_orgs (organization_id)
  SELECT r.organization_id
  FROM public.user_org_roles r
  WHERE r.user_id = _uid
    AND NOT EXISTS (SELECT 1 FROM public.user_org_roles o
                    WHERE o.organization_id = r.organization_id AND o.user_id <> _uid)
    AND NOT EXISTS (SELECT 1 FROM public.projects p
                    WHERE p.organization_id = r.organization_id);

  DELETE FROM public.user_org_roles WHERE user_id = _uid;
  DELETE FROM public.platform_users WHERE user_id = _uid;

  FOR _org IN SELECT organization_id FROM _orphan_orgs LOOP
    IF NOT EXISTS (SELECT 1 FROM public.project_participants pp
                   WHERE pp.organization_id = _org.organization_id) THEN
      DELETE FROM public.org_settings WHERE organization_id = _org.organization_id;
      DELETE FROM public.org_feature_overrides WHERE organization_id = _org.organization_id;
      DELETE FROM public.org_invitations WHERE organization_id = _org.organization_id;
      DELETE FROM public.org_join_requests WHERE organization_id = _org.organization_id;
      DELETE FROM public.suppliers WHERE organization_id = _org.organization_id;
      DELETE FROM public.organizations WHERE id = _org.organization_id;
    END IF;
  END LOOP;

  DELETE FROM public.profiles WHERE user_id = _uid;

  RETURN jsonb_build_object('ok', true, 'user_id', _uid);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO service_role;
GRANT EXECUTE ON FUNCTION public.anonymize_user_references(uuid) TO service_role;